// ABN Search by Business Name Edge Function
// Calls the Australian Business Register (ABR) XML API to search by name

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ABR_API_URL = 'https://abr.business.gov.au/ABRXMLSearch/AbrXmlSearch.asmx';

interface ABNSearchResult {
  abn: string;
  entityName: string;
  entityType: string;
  state: string;
  postcode: string;
  score: number;
}

// Parse ABR name search XML response
function parseNameSearchResponse(xml: string): ABNSearchResult[] {
  const results: ABNSearchResult[] = [];

  try {
    // Find all searchResultsRecord elements
    const recordRegex = /<searchResultsRecord>([\s\S]*?)<\/searchResultsRecord>/g;
    let match;

    while ((match = recordRegex.exec(xml)) !== null) {
      const record = match[1];

      // Extract ABN
      const abnMatch = record.match(/<ABN>.*?<identifierValue>(\d+)<\/identifierValue>.*?<\/ABN>/s);
      if (!abnMatch) continue;

      const abn = abnMatch[1];

      // Extract entity name - try organisation name first, then individual name
      let entityName = '';
      const orgNameMatch = record.match(/<organisationName>([^<]+)<\/organisationName>/);
      const mainNameMatch = record.match(/<mainName>.*?<organisationName>([^<]+)<\/organisationName>.*?<\/mainName>/s);
      const familyNameMatch = record.match(/<familyName>([^<]+)<\/familyName>/);
      const givenNameMatch = record.match(/<givenName>([^<]+)<\/givenName>/);

      if (mainNameMatch) {
        entityName = mainNameMatch[1];
      } else if (orgNameMatch) {
        entityName = orgNameMatch[1];
      } else if (familyNameMatch && givenNameMatch) {
        entityName = `${givenNameMatch[1]} ${familyNameMatch[1]}`;
      }

      if (!entityName) continue;

      // Extract entity type
      const entityTypeMatch = record.match(/<entityTypeText>([^<]+)<\/entityTypeText>/);
      const entityType = entityTypeMatch ? entityTypeMatch[1] : 'Unknown';

      // Extract state and postcode
      const stateMatch = record.match(/<stateCode>([^<]+)<\/stateCode>/);
      const postcodeMatch = record.match(/<postcode>([^<]+)<\/postcode>/);

      const state = stateMatch ? stateMatch[1] : '';
      const postcode = postcodeMatch ? postcodeMatch[1] : '';

      // Extract score (relevance)
      const scoreMatch = record.match(/<score>([^<]+)<\/score>/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

      results.push({
        abn: abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4'),
        entityName,
        entityType,
        state,
        postcode,
        score,
      });
    }

    // Sort by score (highest first) and return top results
    return results.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error parsing ABR name search response:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, maxResults = 5 } = await req.json();

    if (!name || name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Business name is required (min 2 characters)' }),
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

    // Clean and prepare search term
    const searchTerm = name.trim();

    // Build SOAP request for name search
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ABRSearchByNameAdvancedSimpleProtocol2017 xmlns="http://abr.business.gov.au/ABRXMLSearch/">
      <name>${searchTerm}</name>
      <postcode></postcode>
      <legalName>Y</legalName>
      <tradingName>Y</tradingName>
      <NSW>Y</NSW>
      <SA>Y</SA>
      <ACT>Y</ACT>
      <VIC>Y</VIC>
      <WA>Y</WA>
      <NT>Y</NT>
      <QLD>Y</QLD>
      <TAS>Y</TAS>
      <authenticationGuid>${abrGuid}</authenticationGuid>
      <searchWidth>typical</searchWidth>
      <minimumScore>0</minimumScore>
      <maxSearchResults>${Math.min(maxResults, 10)}</maxSearchResults>
    </ABRSearchByNameAdvancedSimpleProtocol2017>
  </soap:Body>
</soap:Envelope>`;

    // Call ABR API
    const response = await fetch(ABR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"http://abr.business.gov.au/ABRXMLSearch/ABRSearchByNameAdvancedSimpleProtocol2017"',
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
      const errorMessage = exceptionMatch ? exceptionMatch[1] : 'Search failed';

      return new Response(
        JSON.stringify({ error: errorMessage, results: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the response
    const results = parseNameSearchResponse(xmlResponse);

    return new Response(
      JSON.stringify({
        results: results.slice(0, maxResults),
        totalFound: results.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ABN search error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'ABN search failed', results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
