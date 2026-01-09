import { useState, useCallback, useEffect } from 'react';
import type { ChatMessageData } from '@/components/chat/ChatMessage';
import {
  getStep,
  mapOptionToValue,
  parseAmount,
  getStepProgress,
  type ChatStep,
  type ChatFlowData,
} from '@/lib/chat-flow';
import { lookupABN, cleanABN, searchABNByName } from '@/lib/abn-lookup';
import { calculateQuote } from '@/lib/calculator';
import type { ApplicationData, AssetType, AssetCondition } from '@/types/application';
import { createEmptyApplication } from '@/types/application';
import { supabase, isSupabaseConfigured, getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

// Generate a simple UUID without external dependency
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export interface ChatState {
  messages: ChatMessageData[];
  currentStepId: string;
  flowData: ChatFlowData;
  isTyping: boolean;
  isComplete: boolean;
  isWaitingForInput: boolean;
  currentInputType: ChatStep['inputType'];
  currentOptions: string[];
  currentPlaceholder: string;
  progress: { current: number; total: number };
}

const TYPING_DELAY = 800; // ms between bot messages
const STORAGE_KEY = 'assetmx_chat_progress';

// Debug logging helper
const DEBUG = true; // Set to false in production
const debugLog = (category: string, message: string, data?: unknown) => {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[Chat ${timestamp}] [${category}] ${message}`, data !== undefined ? data : '');
};

// Helper to set nested value in object (supports array indices like 'directors.0.firstName')
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone to avoid mutation issues
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const isNextKeyNumeric = !isNaN(Number(nextKey));
    const isCurrentKeyNumeric = !isNaN(Number(key));

    if (isCurrentKeyNumeric) {
      // Current key is an array index
      const index = Number(key);
      const arr = current as unknown as unknown[];
      if (!arr[index]) {
        // Next key determines if we need an array or object
        arr[index] = isNextKeyNumeric ? [] : {};
      }
      current = arr[index] as Record<string, unknown>;
    } else {
      // Current key is an object property
      if (!current[key]) {
        // Next key determines if we need an array or object
        current[key] = isNextKeyNumeric ? [] : {};
      }
      current = current[key] as Record<string, unknown>;
    }
  }

  // Set the final value
  const lastKey = keys[keys.length - 1];
  const isLastKeyNumeric = !isNaN(Number(lastKey));
  if (isLastKeyNumeric) {
    (current as unknown as unknown[])[Number(lastKey)] = value;
  } else {
    current[lastKey] = value;
  }

  return result;
}

// Load saved state from localStorage
function loadSavedState(): Partial<ChatState> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

// Save state to localStorage
function saveState(state: ChatState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages: state.messages,
      currentStepId: state.currentStepId,
      flowData: state.flowData,
    }));
  } catch {
    // Ignore errors
  }
}

// Clear saved state
function clearSavedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

export function useChatApplication() {
  const [state, setState] = useState<ChatState>(() => {
    const saved = loadSavedState();
    const initialStep = getStep('greeting')!;

    if (saved && saved.currentStepId && saved.flowData) {
      const step = getStep(saved.currentStepId);
      const stepOptions = step?.options;
      // Resolve options - can be static array or function
      const resolvedOptions = typeof stepOptions === 'function'
        ? stepOptions(saved.flowData as ChatFlowData)
        : (stepOptions || []);

      return {
        messages: saved.messages || [],
        currentStepId: saved.currentStepId,
        flowData: saved.flowData,
        isTyping: false,
        isComplete: saved.currentStepId.startsWith('end_'),
        isWaitingForInput: true,
        currentInputType: step?.inputType || 'text',
        currentOptions: resolvedOptions,
        currentPlaceholder: step?.placeholder || '',
        progress: getStepProgress(saved.currentStepId),
      };
    }

    // Resolve initial options
    const initialOptions = typeof initialStep.options === 'function'
      ? initialStep.options({ application: createEmptyApplication(), currentDirectorIndex: 0 })
      : (initialStep.options || []);

    return {
      messages: [],
      currentStepId: 'greeting',
      flowData: {
        application: createEmptyApplication(),
        currentDirectorIndex: 0,
      },
      isTyping: false,
      isComplete: false,
      isWaitingForInput: false,
      currentInputType: initialStep.inputType,
      currentOptions: initialOptions,
      currentPlaceholder: initialStep.placeholder || '',
      progress: getStepProgress('greeting'),
    };
  });

  // Add a bot message
  const addBotMessage = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: generateId(),
          type: 'bot',
          content,
          timestamp: new Date(),
        },
      ],
    }));
  }, []);

  // Add a user message
  const addUserMessage = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: generateId(),
          type: 'user',
          content,
          timestamp: new Date(),
        },
      ],
    }));
  }, []);

  // Show typing indicator
  const showTyping = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, isTyping: show }));
  }, []);

  // Process the current step's messages
  const processStepMessages = useCallback(async (step: ChatStep, flowData: ChatFlowData, autoProgressCallback?: (stepId: string, data: ChatFlowData) => Promise<void>) => {
    debugLog('STEP', `Processing step: ${step.id}`, { inputType: step.inputType, hasAction: !!step.action });

    const messages = typeof step.messages === 'function'
      ? step.messages(flowData)
      : step.messages;

    debugLog('STEP', `Messages to display: ${messages.length}`, messages);

    // Display messages with typing delay
    for (const message of messages) {
      if (message === '📋 SUMMARY_CARD') {
        // Special case - summary card will be handled separately
        addBotMessage(message);
        continue;
      }

      showTyping(true);
      await new Promise(resolve => setTimeout(resolve, TYPING_DELAY));
      showTyping(false);
      addBotMessage(message);
    }

    // Get options - can be static array or dynamic function
    const options = typeof step.options === 'function'
      ? step.options(flowData)
      : (step.options || []);

    debugLog('STEP', `Options resolved: ${options.length}`, options);

    // Auto-progress for steps with actions but no user input required (empty options)
    // Don't auto-progress if step requires text input (user needs to enter data first)
    const requiresTextInput = step.inputType === 'text' || step.inputType === 'number' ||
                              step.inputType === 'email' || step.inputType === 'phone' ||
                              step.inputType === 'date';
    if (step.action && options.length === 0 && !requiresTextInput && autoProgressCallback) {
      debugLog('AUTO', `Auto-progressing step ${step.id} with action: ${step.action}`);
      // Execute the action
      let updatedData = { ...flowData };

      switch (step.action) {
        case 'abn_lookup': {
          const abn = cleanABN(updatedData.application.business?.abn || '');
          try {
            const result = await lookupABN(abn);
            debugLog('ABN', 'Lookup result received', result);
            if (result) {
              debugLog('ABN', 'abnRegisteredDate value:', result.abnRegisteredDate);
              updatedData.abnLookup = {
                entityName: result.entityName,
                entityType: result.entityType,
                abnStatus: result.abnStatus,
                abnRegisteredDate: result.abnRegisteredDate || '',
                gstRegistered: result.gstRegistered,
                gstRegisteredDate: result.gstRegisteredDate,
                state: result.state,
                postcode: result.postcode,
              };
              debugLog('ABN', 'Stored abnLookup:', updatedData.abnLookup);
              // Update application with lookup data
              updatedData.application = {
                ...updatedData.application,
                business: {
                  ...(updatedData.application.business || {}),
                  abn: updatedData.application.business?.abn || '',
                  entityName: result.entityName,
                  entityType: result.entityType as ApplicationData['business']['entityType'],
                  gstRegistered: result.gstRegistered,
                  businessState: result.state || '',
                  abnRegisteredDate: result.abnRegisteredDate || '',
                  businessAddress: '',
                  businessPostcode: result.postcode || '',
                },
              };
            }
          } catch (error) {
            console.error('ABN lookup failed:', error);
          }
          break;
        }
        // Other actions can be added here if needed
      }

      // Move to next step automatically
      const nextStepId = typeof step.nextStep === 'function'
        ? step.nextStep('', updatedData)
        : step.nextStep;

      debugLog('AUTO', `Auto-progressing to next step: ${nextStepId}`);
      await autoProgressCallback(nextStepId, updatedData);
      return;
    }

    // Update state with input expectations
    debugLog('STEP', `Waiting for input`, { inputType: step.inputType, options });
    setState(prev => ({
      ...prev,
      isWaitingForInput: true,
      currentInputType: step.inputType,
      currentOptions: options,
      currentPlaceholder: step.placeholder || '',
    }));
  }, [addBotMessage, showTyping]);

  // Execute step action (ABN lookup, quote calculation, etc.)
  const executeAction = useCallback(async (action: string, flowData: ChatFlowData, userInput?: string): Promise<ChatFlowData> => {
    debugLog('ACTION', `Executing action: ${action}`, { userInput });
    const updatedData = { ...flowData };

    switch (action) {
      case 'abn_search': {
        // Search for businesses by name
        const businessName = flowData.application.business?.businessName || userInput || '';
        if (businessName && businessName.trim().length >= 2) {
          try {
            const results = await searchABNByName(businessName, 3);
            updatedData.abnSearchResults = results;
            updatedData.businessNameSearch = businessName;
          } catch (error) {
            console.error('ABN search failed:', error);
            updatedData.abnSearchResults = [];
          }
        } else {
          updatedData.abnSearchResults = [];
        }
        break;
      }

      case 'abn_lookup': {
        const abn = cleanABN(flowData.application.business?.abn || '');
        try {
          const result = await lookupABN(abn);
          debugLog('ABN', 'executeAction lookup result', result);
          if (result) {
            debugLog('ABN', 'executeAction abnRegisteredDate:', result.abnRegisteredDate);
            updatedData.abnLookup = {
              entityName: result.entityName,
              entityType: result.entityType,
              abnStatus: result.abnStatus,
              abnRegisteredDate: result.abnRegisteredDate || '',
              gstRegistered: result.gstRegistered,
              gstRegisteredDate: result.gstRegisteredDate,
              state: result.state,
              postcode: result.postcode,
            };
            // Update application with lookup data
            updatedData.application = {
              ...updatedData.application,
              business: {
                ...(updatedData.application.business || {}),
                abn: updatedData.application.business?.abn || '',
                entityName: result.entityName,
                entityType: result.entityType as ApplicationData['business']['entityType'],
                gstRegistered: result.gstRegistered,
                businessState: result.state || '',
                abnRegisteredDate: result.abnRegisteredDate || '',
                businessAddress: '',
                businessPostcode: result.postcode || '',
              },
            };
          }
        } catch (error) {
          console.error('ABN lookup failed:', error);
        }
        break;
      }

      case 'calculate_quote': {
        const asset = flowData.application.asset;
        const loan = flowData.application.loan;
        if (asset?.assetPriceIncGst) {
          try {
            const quote = calculateQuote({
              assetType: (asset.assetType as AssetType) || 'vehicle',
              assetCondition: (asset.assetCondition as AssetCondition) || 'new',
              loanAmount: asset.assetPriceIncGst - (loan?.depositAmount || 0),
              termMonths: loan?.termMonths || 60,
              balloonPercentage: loan?.balloonPercentage || 0,
            });
            updatedData.quote = {
              monthlyRepayment: quote.monthlyRepayment,
              weeklyRepayment: quote.weeklyRepayment,
              indicativeRate: quote.indicativeRate,
            };
          } catch (error) {
            console.error('Quote calculation failed:', error);
          }
        }
        break;
      }

      case 'save_lead': {
        // Save a lead (non-qualifying applicant) to Supabase
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured - skipping lead save');
          break;
        }

        const lead = flowData.lead;
        const abnLookup = flowData.abnLookup;
        const business = flowData.application.business;

        // Map loan amount range to a numeric value (midpoint)
        const loanAmountMap: Record<string, number> = {
          'Under $30k': 20000,
          '$30k - $75k': 50000,
          '$75k - $150k': 100000,
          'Over $150k': 200000,
        };
        const loanAmount = lead?.loanAmount ? (loanAmountMap[lead.loanAmount] || 0) : 0;

        try {
          const { error: insertError } = await supabase.from('leads').insert({
            name: lead?.name || '',
            email: lead?.email || '',
            phone: lead?.phone || '',
            business_name: abnLookup?.entityName || business?.entityName || business?.businessName || '',
            abn: business?.abn || '',
            asset_type: lead?.assetType || flowData.application.asset?.assetType || '',
            loan_amount: loanAmount,
            reason: lead?.reason || 'Did not qualify via chat',
            source: 'chat_application',
            status: 'new',
            consent_to_share: lead?.consentToShare ?? false,
          } as never);

          if (insertError) {
            console.error('Failed to save lead:', insertError);
          } else {
            console.log('Lead saved successfully');
            clearSavedState();

            // Send admin notification email for new lead
            try {
              const supabaseUrl = getSupabaseUrl();
              const anonKey = getSupabaseAnonKey();

              console.log('[EMAIL DEBUG] Lead saved, attempting to send email notification');
              console.log('[EMAIL DEBUG] supabaseUrl:', supabaseUrl ? 'SET' : 'MISSING');
              console.log('[EMAIL DEBUG] anonKey:', anonKey ? 'SET' : 'MISSING');

              if (supabaseUrl && anonKey) {
                const leadEmailData = {
                  type: 'new_lead',
                  name: lead?.name || '',
                  email: lead?.email || '',
                  phone: lead?.phone || '',
                  businessName: abnLookup?.entityName || business?.entityName || business?.businessName || '',
                  abn: business?.abn || '',
                  assetType: lead?.assetType || '',
                  loanAmount: loanAmount,
                  reason: lead?.reason || 'Did not qualify via chat',
                  consentToShare: lead?.consentToShare ?? false,
                };

                const emailUrl = `${supabaseUrl}/functions/v1/send-application-emails`;
                console.log('[EMAIL DEBUG] Calling edge function:', emailUrl);
                console.log('[EMAIL DEBUG] Email data:', leadEmailData);

                const emailResponse = await fetch(emailUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`,
                  },
                  body: JSON.stringify(leadEmailData),
                });

                console.log('[EMAIL DEBUG] Response status:', emailResponse.status);
                const responseText = await emailResponse.text();
                console.log('[EMAIL DEBUG] Response body:', responseText);

                if (!emailResponse.ok) {
                  console.error('Failed to send lead notification email:', emailResponse.status, responseText);
                } else {
                  console.log('Lead notification email sent successfully');
                }
              } else {
                console.error('[EMAIL DEBUG] Cannot send email - missing supabaseUrl or anonKey');
              }
            } catch (emailError) {
              console.error('[EMAIL DEBUG] Lead email error:', emailError);
            }
          }
        } catch (error) {
          console.error('Lead save error:', error);
        }
        break;
      }

      case 'save_novated_lead': {
        // Save novated lease enquiry to millarX lead bucket
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured - skipping novated lead save');
          break;
        }

        const novatedLead = flowData.lead;

        try {
          const { error: insertError } = await supabase.from('leads').insert({
            name: novatedLead?.name || '',
            email: novatedLead?.email || '',
            phone: novatedLead?.phone || '',
            business_name: '',
            abn: '',
            asset_type: 'Electric Vehicle (EV)',
            reason: 'Novated lease enquiry - route to millarX',
            source: 'chat_application_novated',
            status: 'new',
            consent_to_share: true, // Automatically consented to share with millarX
          } as never);

          if (insertError) {
            console.error('Failed to save novated lead:', insertError);
          } else {
            console.log('Novated lease lead saved for millarX');
            clearSavedState();
          }
        } catch (error) {
          console.error('Novated lead save error:', error);
        }
        break;
      }

      case 'send_director_form': {
        // Send email to additional director with form link
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured - skipping director form email');
          break;
        }

        const directorEmail = flowData.application.directors?.directors?.[1]?.email;
        const primaryDirector = flowData.application.directors?.directors?.[0];
        const business = flowData.application.business;
        const abnLookup = flowData.abnLookup;

        if (!directorEmail) {
          console.log('No director email to send to');
          break;
        }

        try {
          const supabaseUrl = getSupabaseUrl();
          const anonKey = getSupabaseAnonKey();

          if (supabaseUrl && anonKey) {
            const emailData = {
              type: 'director_form_request',
              directorEmail,
              businessName: business?.entityName || abnLookup?.entityName || '',
              primaryContactName: `${primaryDirector?.firstName || ''} ${primaryDirector?.lastName || ''}`.trim() || 'The applicant',
              primaryContactEmail: primaryDirector?.email || '',
            };

            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-application-emails`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`,
              },
              body: JSON.stringify(emailData),
            });

            if (!emailResponse.ok) {
              console.error('Failed to send director form email:', emailResponse.status);
            } else {
              console.log('Director form email sent successfully to:', directorEmail);
            }
          }
        } catch (emailError) {
          console.error('Director form email error:', emailError);
        }
        break;
      }

      case 'submit_application': {
        // Submit the complete application to Supabase
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured - skipping submission');
          break;
        }

        const app = flowData.application;
        const business = app.business;
        const asset = app.asset;
        const loan = app.loan;
        const directors = app.directors?.directors || [];
        const quote = flowData.quote;
        const abnLookup = flowData.abnLookup;

        try {
          const { error: insertError } = await supabase.from('applications').insert({
            // Business details
            abn: business?.abn || '',
            abn_status: abnLookup?.abnStatus || 'Active',
            abn_registered_date: abnLookup?.abnRegisteredDate ? new Date(abnLookup.abnRegisteredDate).toISOString().split('T')[0] : null,
            entity_name: business?.entityName || abnLookup?.entityName || '',
            entity_type: business?.entityType || abnLookup?.entityType || '',
            gst_registered: abnLookup?.gstRegistered ?? business?.gstRegistered ?? false,
            gst_registered_date: abnLookup?.gstRegisteredDate ? new Date(abnLookup.gstRegisteredDate).toISOString().split('T')[0] : null,
            trading_name: business?.tradingName || '',
            business_address: business?.businessAddress || '',
            business_state: business?.businessState || abnLookup?.state || '',
            business_postcode: business?.businessPostcode || abnLookup?.postcode || '',

            // Asset details
            asset_type: asset?.assetType || 'vehicle',
            asset_condition: asset?.assetCondition || 'new',
            asset_year: asset?.assetYear || null,
            asset_make: asset?.assetMake || '',
            asset_model: asset?.assetModel || '',
            asset_description: asset?.assetDescription || '',
            supplier_name: asset?.supplierName || '',
            asset_price_ex_gst: asset?.assetPriceExGst || 0,
            asset_gst: asset?.assetGst || 0,
            asset_price_inc_gst: asset?.assetPriceIncGst || 0,

            // Loan details
            loan_amount: loan?.loanAmount || (asset?.assetPriceIncGst || 0) - (loan?.depositAmount || 0),
            deposit_amount: loan?.depositAmount || 0,
            trade_in_amount: loan?.tradeInAmount || 0,
            term_months: loan?.termMonths || 60,
            balloon_percentage: loan?.balloonPercentage || 0,
            balloon_amount: loan?.balloonAmount || 0,
            business_use_percentage: loan?.businessUsePercentage || 100,

            // Quote
            indicative_rate: quote?.indicativeRate || 0,
            monthly_repayment: quote?.monthlyRepayment || 0,

            // Directors as JSONB (includes personal financial position)
            directors: directors.map(d => {
              // Calculate totals - individual assets
              const propertyValue = Number(d.propertyValue) || 0;
              const investmentPropertyValue = Number(d.investmentPropertyValue) || 0;
              const vehiclesValue = Number(d.vehiclesValue) || 0;

              // Individual liabilities
              const mortgageBalance = Number(d.mortgageBalance) || 0;
              const investmentMortgageBalance = Number(d.investmentMortgageBalance) || 0;
              const vehicleLoanBalance = Number(d.vehicleLoanBalance) || 0;
              const creditCardLimit = Number(d.creditCardLimit) || 0;

              const totalAssets = propertyValue + investmentPropertyValue + vehiclesValue;
              const totalLiabilities = mortgageBalance + investmentMortgageBalance + vehicleLoanBalance + creditCardLimit;

              return {
                firstName: d.firstName,
                lastName: d.lastName,
                dateOfBirth: d.dob,
                email: d.email,
                phone: d.phone,
                address: d.residentialAddress || d.address,
                licenceNumber: d.licenceNumber,
                licenceState: d.licenceState,
                // Address duration
                addressYearsMonths: d.addressYearsMonths,
                addressMonths: d.addressMonths,
                previousAddress: d.previousAddress,
                // Personal financial position - individual assets
                propertyValue,
                mortgageBalance,
                investmentPropertyValue,
                investmentMortgageBalance,
                vehiclesValue,
                vehicleLoanBalance,
                creditCardLimit,
                // Calculated totals
                totalAssets,
                totalLiabilities,
                netPosition: totalAssets - totalLiabilities,
              };
            }),
            primary_contact_index: app.directors?.primaryContactIndex || 0,

            // Status
            status: 'submitted',
            step_completed: 5,
          } as never);

          if (insertError) {
            console.error('Failed to submit application:', insertError);
          } else {
            console.log('Application submitted successfully');
            // Clear saved progress after successful submission
            clearSavedState();

            // Send confirmation emails via Edge Function
            const primaryDirector = directors[0];
            const emailData = {
              id: 'temp-' + Date.now(), // Will be replaced with actual ID from insert
              entityName: business?.entityName || abnLookup?.entityName || '',
              abn: business?.abn || '',
              contactName: `${primaryDirector?.firstName || ''} ${primaryDirector?.lastName || ''}`.trim(),
              contactEmail: primaryDirector?.email || '',
              contactPhone: primaryDirector?.phone || '',
              assetType: asset?.assetType || 'vehicle',
              assetDescription: asset?.assetDescription || '',
              loanAmount: loan?.loanAmount || 0,
              termMonths: loan?.termMonths || 60,
              balloonPercentage: loan?.balloonPercentage || 0,
              depositAmount: loan?.depositAmount || 0,
              monthlyRepayment: quote?.monthlyRepayment || 0,
              indicativeRate: quote?.indicativeRate || 0,
              documentsUploaded: flowData.documentsUploaded || false,
            };

            // Call the edge function to send emails (direct fetch to bypass auth token issues)
            try {
              const supabaseUrl = getSupabaseUrl();
              const anonKey = getSupabaseAnonKey();

              console.log('[EMAIL DEBUG] Application submitted, attempting to send emails');
              console.log('[EMAIL DEBUG] supabaseUrl:', supabaseUrl ? 'SET' : 'MISSING');
              console.log('[EMAIL DEBUG] anonKey:', anonKey ? 'SET' : 'MISSING');

              if (supabaseUrl && anonKey) {
                const emailUrl = `${supabaseUrl}/functions/v1/send-application-emails`;
                console.log('[EMAIL DEBUG] Calling edge function:', emailUrl);

                const emailResponse = await fetch(emailUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`,
                  },
                  body: JSON.stringify(emailData),
                });

                console.log('[EMAIL DEBUG] Response status:', emailResponse.status);
                const responseText = await emailResponse.text();
                console.log('[EMAIL DEBUG] Response body:', responseText);

                if (!emailResponse.ok) {
                  console.error('Failed to send confirmation emails:', emailResponse.status, responseText);
                } else {
                  console.log('Confirmation emails sent successfully');
                }
              } else {
                console.error('[EMAIL DEBUG] Cannot send email - missing supabaseUrl or anonKey');
              }
            } catch (emailError) {
              console.error('[EMAIL DEBUG] Email sending error:', emailError);
            }
          }
        } catch (error) {
          console.error('Application submission error:', error);
        }
        break;
      }
    }

    return updatedData;
  }, []);

  // Move to the next step
  const moveToStep = useCallback(async (stepId: string, flowData: ChatFlowData) => {
    debugLog('NAV', `Moving to step: ${stepId}`);

    // If moving to greeting from an end state, reset the chat completely
    if (stepId === 'greeting') {
      clearSavedState();
      flowData = {
        application: createEmptyApplication(),
        currentDirectorIndex: 0,
      };
    }

    const step = getStep(stepId);
    if (!step) {
      debugLog('ERROR', `Step not found: ${stepId}`);
      console.error('Step not found:', stepId);
      return;
    }

    // Check if step should be skipped
    if (step.skipIf && step.skipIf(flowData)) {
      debugLog('NAV', `Skipping step ${stepId} (skipIf returned true)`);
      const nextStepId = typeof step.nextStep === 'function'
        ? step.nextStep('', flowData)
        : step.nextStep;
      await moveToStep(nextStepId, flowData);
      return;
    }

    // Update progress
    setState(prev => ({
      ...prev,
      currentStepId: stepId,
      progress: getStepProgress(stepId),
      isComplete: stepId.startsWith('end_'),
    }));

    // Define auto-progress callback for steps with actions but no input required
    const autoProgressCallback = async (nextStepId: string, updatedData: ChatFlowData) => {
      // Update state with the new flow data
      setState(prev => ({ ...prev, flowData: updatedData }));
      // Save state
      saveState({
        ...state,
        currentStepId: nextStepId,
        flowData: updatedData,
      } as ChatState);
      // Move to next step
      await moveToStep(nextStepId, updatedData);
    };

    // Process step messages (with auto-progress callback for action steps)
    await processStepMessages(step, flowData, autoProgressCallback);

    // Save state (only if not auto-progressed)
    const currentOptions = typeof step.options === 'function'
      ? step.options(flowData)
      : (step.options || []);
    if (!step.action || currentOptions.length > 0) {
      saveState({
        ...state,
        currentStepId: stepId,
        flowData,
      } as ChatState);
    }
  }, [processStepMessages, state]);

  // Handle user input
  const handleUserInput = useCallback(async (input: string) => {
    debugLog('INPUT', `User input received`, { stepId: state.currentStepId, input });
    const currentStep = getStep(state.currentStepId);
    if (!currentStep) {
      debugLog('ERROR', `No current step found: ${state.currentStepId}`);
      return;
    }

    // Add user message
    addUserMessage(input);
    setState(prev => ({ ...prev, isWaitingForInput: false }));

    let flowData = { ...state.flowData };

    // Validate input if needed
    if (currentStep.validate) {
      const error = currentStep.validate(input, flowData);
      if (error) {
        debugLog('VALIDATE', `Validation failed: ${error}`);
        showTyping(true);
        await new Promise(resolve => setTimeout(resolve, TYPING_DELAY));
        showTyping(false);
        addBotMessage(error);
        setState(prev => ({ ...prev, isWaitingForInput: true }));
        return;
      }
    }

    // Store the value if field is specified
    if (currentStep.field) {
      let value: unknown = input;

      // Map select options to proper values
      if (currentStep.inputType === 'select') {
        value = mapOptionToValue(input, currentStep.field);
      }

      // Parse amounts
      if (currentStep.inputType === 'number' || currentStep.field.includes('Price') || currentStep.field.includes('deposit')) {
        value = parseAmount(input);
      }

      // Parse term months
      if (currentStep.field === 'loan.termMonths') {
        value = mapOptionToValue(input, currentStep.field);
      }

      // Handle lead.* fields
      if (currentStep.field.startsWith('lead.')) {
        const leadField = currentStep.field.replace('lead.', '');
        // Special handling for consent field - convert to boolean
        if (leadField === 'consentToShare') {
          const boolValue = input.toLowerCase().includes('yes') || input.toLowerCase().includes('fine');
          flowData.lead = {
            ...(flowData.lead || {}),
            [leadField]: boolValue,
          };
        } else {
          flowData.lead = {
            ...(flowData.lead || {}),
            [leadField]: value,
          };
        }
      }
      // Handle eligibility.* fields
      else if (currentStep.field.startsWith('eligibility.')) {
        const eligibilityField = currentStep.field.replace('eligibility.', '');
        const boolValue = input.toLowerCase().includes('yes');
        flowData.eligibility = {
          ...(flowData.eligibility || {}),
          [eligibilityField]: boolValue,
        };
      }
      // Handle application fields
      else {
        flowData.application = setNestedValue(
          flowData.application as Record<string, unknown>,
          currentStep.field,
          value
        ) as Partial<ApplicationData>;
      }
    }

    // Handle ABN selection from search results - extract ABN and store it
    if (currentStep.inputType === 'abn_select' && input.includes('ABN:')) {
      const abnMatch = input.match(/ABN:\s*([\d\s]+)/);
      if (abnMatch) {
        const selectedAbn = cleanABN(abnMatch[1]);
        flowData.application = setNestedValue(
          flowData.application as Record<string, unknown>,
          'business.abn',
          selectedAbn
        ) as Partial<ApplicationData>;
      }
    }

    // Execute action if needed
    if (currentStep.action) {
      flowData = await executeAction(currentStep.action, flowData, input);
    }

    // Update flowData state
    setState(prev => ({ ...prev, flowData }));

    // Determine next step
    const nextStepId = typeof currentStep.nextStep === 'function'
      ? currentStep.nextStep(input, flowData)
      : currentStep.nextStep;

    debugLog('NAV', `Next step determined: ${nextStepId}`);

    // Move to next step
    await moveToStep(nextStepId, flowData);
  }, [state.currentStepId, state.flowData, addUserMessage, addBotMessage, showTyping, executeAction, moveToStep]);

  // Handle quick reply selection
  const handleSelectOption = useCallback((option: string) => {
    handleUserInput(option);
  }, [handleUserInput]);

  // Start or resume the chat
  const startChat = useCallback(async () => {
    debugLog('INIT', 'Starting chat...');
    const saved = loadSavedState();

    if (saved && saved.currentStepId && !saved.currentStepId.startsWith('end_')) {
      debugLog('INIT', `Found saved state at step: ${saved.currentStepId}`);
      // Ask if user wants to resume
      addBotMessage("Welcome back! Want to continue where you left off?");
      setState(prev => ({
        ...prev,
        isWaitingForInput: true,
        currentInputType: 'select',
        currentOptions: ["Yes, continue", "No, start fresh"],
        currentStepId: 'resume_choice',
      }));
    } else {
      // Start fresh
      debugLog('INIT', 'Starting fresh from greeting');
      const firstStep = getStep('greeting')!;
      await processStepMessages(firstStep, state.flowData);
    }
  }, [addBotMessage, processStepMessages, state.flowData]);

  // Handle resume choice
  useEffect(() => {
    if (state.currentStepId === 'resume_choice') {
      // This is handled in handleUserInput
    }
  }, [state.currentStepId]);

  // Special handling for resume choice
  const handleResumeChoice = useCallback(async (choice: string) => {
    if (choice.toLowerCase().includes('yes') || choice.toLowerCase().includes('continue')) {
      // Resume from saved step
      const saved = loadSavedState();
      if (saved?.currentStepId && saved?.flowData) {
        addUserMessage(choice);
        await moveToStep(saved.currentStepId, saved.flowData as ChatFlowData);
      }
    } else {
      // Start fresh
      clearSavedState();
      addUserMessage(choice);
      setState(prev => ({
        ...prev,
        messages: prev.messages.slice(-1), // Keep only the user's choice
        currentStepId: 'greeting',
        flowData: {
          application: createEmptyApplication(),
          currentDirectorIndex: 0,
        },
      }));
      const firstStep = getStep('greeting')!;
      await processStepMessages(firstStep, {
        application: createEmptyApplication(),
        currentDirectorIndex: 0,
      });
    }
  }, [addUserMessage, moveToStep, processStepMessages]);

  // Modified handleUserInput to handle resume choice
  const handleInput = useCallback(async (input: string) => {
    if (state.currentStepId === 'resume_choice') {
      await handleResumeChoice(input);
    } else {
      await handleUserInput(input);
    }
  }, [state.currentStepId, handleResumeChoice, handleUserInput]);

  // Reset the chat
  const resetChat = useCallback(() => {
    clearSavedState();
    setState({
      messages: [],
      currentStepId: 'greeting',
      flowData: {
        application: createEmptyApplication(),
        currentDirectorIndex: 0,
      },
      isTyping: false,
      isComplete: false,
      isWaitingForInput: false,
      currentInputType: 'text',
      currentOptions: [],
      currentPlaceholder: '',
      progress: getStepProgress('greeting'),
    });
  }, []);

  // Get the application data for summary
  const getApplicationSummary = useCallback(() => {
    return {
      business: state.flowData.application.business,
      abnLookup: state.flowData.abnLookup,
      asset: state.flowData.application.asset,
      loan: state.flowData.application.loan,
      directors: state.flowData.application.directors,
      quote: state.flowData.quote,
    };
  }, [state.flowData]);

  return {
    messages: state.messages,
    isTyping: state.isTyping,
    isComplete: state.isComplete,
    isLeadCaptured: state.currentStepId === 'end_lead_captured',
    isWaitingForInput: state.isWaitingForInput,
    currentInputType: state.currentInputType,
    currentOptions: state.currentOptions,
    currentPlaceholder: state.currentPlaceholder,
    currentStepId: state.currentStepId,
    progress: state.progress,
    sendMessage: handleInput,
    selectOption: handleSelectOption,
    startChat,
    resetChat,
    getApplicationSummary,
  };
}
