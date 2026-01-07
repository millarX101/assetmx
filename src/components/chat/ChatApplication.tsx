import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage, ChatTypingIndicator } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatQuickReplies } from './ChatQuickReplies';
import { ChatFileUpload } from './ChatFileUpload';
import { ChatProgress } from './ChatProgress';
import { ChatSummaryCard } from './ChatSummaryCard';
import { useChatApplication } from '@/hooks/useChatApplication';
import { Button } from '@/components/ui/button';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ChatApplication() {
  const navigate = useNavigate();
  const {
    messages,
    isTyping,
    isComplete,
    isLeadCaptured,
    isWaitingForInput,
    currentInputType,
    currentOptions,
    currentPlaceholder,
    progress,
    sendMessage,
    selectOption,
    startChat,
    resetChat,
    getApplicationSummary,
  } = useChatApplication();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Start chat on mount (only once)
  useEffect(() => {
    if (messages.length === 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startChat();
    }
  }, [startChat, messages.length]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-redirect to home page after lead capture (non-qualifying applicant)
  useEffect(() => {
    if (isLeadCaptured) {
      // Wait a moment so user can see the final message, then redirect
      const timeout = setTimeout(() => {
        navigate('/');
      }, 3000); // 3 second delay before redirect
      return () => clearTimeout(timeout);
    }
  }, [isLeadCaptured, navigate]);

  
  // Get input type for ChatInput
  const getInputType = () => {
    switch (currentInputType) {
      case 'email':
        return 'email';
      case 'phone':
        return 'phone';
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm">AssetMX</div>
              <div className="text-xs text-green-600">Online</div>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            hasStartedRef.current = false;
            resetChat();
          }}
          className="text-slate-400 hover:text-slate-600"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </header>

      {/* Progress Bar */}
      {!isComplete && <ChatProgress currentStep={progress.current} totalSteps={progress.total} />}

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        {messages.map((message) => {
          // Handle summary card token
          if (message.type === 'bot' && message.content === '📋 SUMMARY_CARD') {
            return (
              <div key={message.id} className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ChatSummaryCard
                  data={getApplicationSummary()}
                  onEdit={() => selectOption(`Need to change something`)}
                />
              </div>
            );
          }
          return <ChatMessage key={message.id} message={message} />;
        })}

        {/* Typing Indicator */}
        {isTyping && <ChatTypingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies - show for select, abn_select, and confirm types with options */}
      {isWaitingForInput && (currentInputType === 'select' || currentInputType === 'abn_select' || currentInputType === 'confirm') && currentOptions.length > 0 && (
        <ChatQuickReplies
          options={currentOptions}
          onSelect={selectOption}
          disabled={isTyping}
          vertical={currentInputType === 'abn_select'}
        />
      )}

      {/* File Upload - show for file_upload input type */}
      {isWaitingForInput && currentInputType === 'file_upload' && (
        <ChatFileUpload
          requiredDocs={[
            { id: 'drivers_licence', label: "Driver's Licence (front)", description: "Clear photo of your licence" },
            { id: 'financials', label: "Latest Tax Return or Financials", description: "Most recent ATO assessment or accountant-prepared financials" },
          ]}
          onComplete={(files) => {
            // Mark files as uploaded and proceed
            selectOption(`Uploaded ${files.length} documents`);
          }}
          onSkip={() => {
            selectOption('Skip for now');
          }}
          disabled={isTyping}
        />
      )}

      {/* Input Area - hide when file upload is active */}
      {!isComplete && currentInputType !== 'file_upload' && (
        <ChatInput
          onSend={sendMessage}
          disabled={isTyping || !isWaitingForInput || currentInputType === 'select' || currentInputType === 'abn_select' || (currentInputType === 'confirm' && currentOptions.length > 0)}
          placeholder={
            currentInputType === 'select' || currentInputType === 'abn_select' || (currentInputType === 'confirm' && currentOptions.length > 0)
              ? 'Tap an option above...'
              : currentPlaceholder || 'Type a message...'
          }
          inputType={getInputType()}
          autoFocus={currentInputType !== 'select' && currentInputType !== 'abn_select' && !(currentInputType === 'confirm' && currentOptions.length > 0)}
        />
      )}

      {/* Completed State */}
      {isComplete && (
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex flex-col gap-3">
            <Link to="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
            <Button onClick={resetChat} variant="ghost" className="w-full text-slate-500">
              Start New Application
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
