// ABN Lookup Edge Function
// Calls the Australian Business Register (ABR) XML API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ABR_API_URL = 'https://abr.business.gov.au/ABRXMLSearch/AbrXmlSearch.asmx';

interface ABNLookupResult {
  abn: string;
  abnStatus: string;
  abnStatusFromDate: string;
  entityName: string;
  entityType: string;
  entityTypeCode: string;
  gstRegistered: boolean;
  gstRegisteredDate: string | null;
  businessAddress: string;
  state: string;
  postcode: string;
  abnRegisteredDate: string;
}

// Parse ABR XML response
function parseABRResponse(xml: string): ABNLookupResult | null {
  try {
    // Extract ABN
    const abnMatch = xml.match(/<identifierValue>(\d+)<\/identifierValue>/);
    if (!abnMatch) return null;

    const abn = abnMatch[1];

    // Extract ABN status
    const abnStatusMatch = xml.match(/<identifierStatus>([^<]+)<\/identifierStatus>/);
    const abnStatus = abnStatusMatch ? abnStatusMatch[1] : 'Unknown';

    // Extract status from date
    const statusFromDateMatch = xml.match(/<identifierStatusFromDate>([^<]+)<\/identifierStatusFromDate>/);
    const abnStatusFromDate = statusFromDateMatch ? statusFromDateMatch[1] : '';

    // Extract entity name - try multiple tags
    let entityName = '';
    const orgNameMatch = xml.match(/<organisationName>([^<]+)<\/organisationName>/);
    const mainNameMatch = xml.match(/<mainName>.*?<organisationName>([^<]+)<\/organisationName>.*?<\/mainName>/s);
    const familyNameMatch = xml.match(/<familyName>([^<]+)<\/familyName>/);
    const givenNameMatch = xml.match(/<givenName>([^<]+)<\/givenName>/);

    if (mainNameMatch) {
      entityName = mainNameMatch[1];
    } else if (orgNameMatch) {
      entityName = orgNameMatch[1];
    } else if (familyNameMatch && givenNameMatch) {
      entityName = `${givenNameMatch[1]} ${familyNameMatch[1]}`;
    }

    // Extract entity type
    const entityTypeMatch = xml.match(/<entityTypeText>([^<]+)<\/entityTypeText>/);
    const entityType = entityTypeMatch ? entityTypeMatch[1] : 'Unknown';

    const entityTypeCodeMatch = xml.match(/<entityTypeCode>([^<]+)<\/entityTypeCode>/);
    const entityTypeCode = entityTypeCodeMatch ? entityTypeCodeMatch[1] : '';

    // Extract GST registration
    const gstMatch = xml.match(/<GST>.*?<effectiveFrom>([^<]+)<\/effectiveFrom>.*?<\/GST>/s);
    const gstRegistered = gstMatch !== null;
    const gstRegisteredDate = gstMatch ? gstMatch[1] : null;

    // Extract address
    const stateMatch = xml.match(/<stateCode>([^<]+)<\/stateCode>/);
    const postcodeMatch = xml.match(/<postcode>([^<]+)<\/postcode>/);

    const state = stateMatch ? stateMatch[1] : '';
    const postcode = postcodeMatch ? postcodeMatch[1] : '';

    // Extract ABN registered date (use status from date as approximation)
    const abnRegisteredDate = abnStatusFromDate;

    return {
      abn: abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4'),
      abnStatus,
      abnStatusFromDate,
      entityName,
      entityType,
      entityTypeCode,
      gstRegistered,
      gstRegisteredDate,
      businessAddress: '', // Not always available in basic lookup
      state,
      postcode,
      abnRegisteredDate,
    };
  } catch (error) {
    console.error('Error parsing ABR response:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { abn } = await req.json();

    if (!abn) {
      return new Response(
        JSON.stringify({ error: 'ABN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get ABR GUID from environment
    const abrGuid = Deno.env.get('ABR_GUID');
    if (!abrGuid) {
      console.error('ABR_GUID not set in environment');
      return new Response(
        JSON.stringify({ error: 'ABR configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean ABN (remove spaces)
    const cleanAbn = abn.replace(/\s/g, '');

    // Build SOAP request
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ABRSearchByABN xmlns="http://abr.business.gov.au/ABRXMLSearch/">
      <searchString>${cleanAbn}</searchString>
      <includeHistoricalDetails>N</includeHistoricalDetails>
      <authenticationGuid>${abrGuid}</authenticationGuid>
    </ABRSearchByABN>
  </soap:Body>
</soap:Envelope>`;

    // Call ABR API
    const response = await fetch(ABR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"http://abr.business.gov.au/ABRXMLSearch/ABRSearchByABN"',
      },
      body: soapRequest,
    });

    if (!response.ok) {
      throw new Error(`ABR API error: ${response.status}`);
    }

    const xmlResponse = await response.text();

    // Check for exception in response
    if (xmlResponse.includes('<exceptionDescription>')) {
      const exceptionMatch = xmlResponse.match(/<exceptionDescription>([^<]+)<\/exceptionDescription>/);
      const errorMessage = exceptionMatch ? exceptionMatch[1] : 'ABN not found';

      return new Response(
        JSON.stringify({ error: errorMessage, found: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the response
    const result = parseABRResponse(xmlResponse);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse ABR response', found: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ...result, found: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ABN lookup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'ABN lookup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
