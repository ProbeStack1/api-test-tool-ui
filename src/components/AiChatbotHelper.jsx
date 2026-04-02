/**
 * AIChatbotHelper.jsx
 * 
 * A draggable AI chatbot popup that appears when API errors occur (4xx/5xx/network errors).
 * Features:
 * - Draggable across the screen (via header, no drag handle icon)
 * - Resizable (small/medium toggle) - stays within viewport bounds
 * - Minimize to floating bubble with smooth fade/scale
 * - Modern, professional design matching the app's color scheme
 * - Analyzes errors and provides helpful responses (dummy data for now - real AI integration later)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Bot, X, Minimize2, Maximize2, Send, AlertCircle, 
  Loader2, MessageSquare, Sparkles
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Shared helper: generates dummy AI analysis from error details
// ============================================================================
const generateErrorAnalysis = (response, error, requestInfo) => {
  const statusCode = response?.status || error?.status || 0;
  const errorMessage = error?.message || response?.statusText || 'Unknown error';

  if (statusCode >= 400 && statusCode < 500) {
    if (statusCode === 401) {
      return `🔐 **Authentication Error (401)**\n\nYour request was rejected - authentication required.\n\n**Quick Fixes:**\n• Verify your API key/token is valid\n• Check Authorization header format\n• Ensure credentials haven't expired\n\n**Example:**\n\`Authorization: Bearer <your-token>\``;
    } else if (statusCode === 403) {
      return `🚫 **Forbidden Error (403)**\n\nYou don't have permission for this resource.\n\n**Quick Fixes:**\n• Verify account permissions\n• Check if resource requires specific roles\n• Contact API administrator`;
    } else if (statusCode === 404) {
      return `🔍 **Not Found Error (404)**\n\nThe requested resource doesn't exist.\n\n**Quick Fixes:**\n• Double-check the URL endpoint\n• Verify resource ID is correct\n• Check API documentation for correct path\n\n**Your URL:** \`${requestInfo?.url || 'N/A'}\``;
    } else if (statusCode === 422 || statusCode === 400) {
      return `⚠️ **Validation Error (${statusCode})**\n\nServer couldn't process your request - invalid data.\n\n**Quick Fixes:**\n• Check required fields in request body\n• Verify data types match API spec\n• Review error message for field issues\n\n**Details:** ${errorMessage}`;
    } else {
      return `❌ **Client Error (${statusCode})**\n\nThere's an issue with your request.\n\n**Message:** ${errorMessage}\n\n**Quick Fixes:**\n• Review request parameters\n• Check API documentation\n• Verify request body format`;
    }
  } else if (statusCode >= 500) {
    return `🔥 **Server Error (${statusCode})**\n\nThe server encountered an internal error.\n\n**This is likely not your fault!**\n\n**What to do:**\n• Wait a few minutes and retry\n• Check if API service is down\n• Contact API provider if it persists\n\n💡 **Tip:** Server errors are often temporary.`;
  } else {
    return `🌐 **Network/Connection Error**\n\nFailed to connect to the server.\n\n**Possible causes:**\n• No internet connection\n• Server is unreachable\n• CORS policy blocking request\n• Firewall/proxy issues\n\n**Quick Fixes:**\n• Check internet connection\n• Verify server URL\n• Check browser console for CORS errors`;
  }
};

// Shared: renders a single chat message (bot or user)
const ChatMessage = ({ msg, index }) => (
  <div
    key={index}
    className={clsx(
      "flex gap-3",
      msg.type === 'user' && "flex-row-reverse"
    )}
  >
    {/* Avatar */}
    <div className={clsx(
      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
      msg.type === 'bot' ? "bg-primary/20 border border-primary/20" : "bg-dark-700"
    )}>
      {msg.type === 'bot' ? (
        <Bot className="w-4 h-4 text-primary" />
      ) : (
        <MessageSquare className="w-4 h-4 text-gray-400" />
      )}
    </div>
    {/* Message bubble */}
    <div className={clsx(
      "flex-1 px-4 py-3 rounded-xl text-sm max-w-[85%]",
      msg.type === 'bot'
        ? "bg-dark-800 border border-dark-700"
        : "bg-primary/10 border border-primary/20 ml-auto"
    )}>
      {msg.isLoading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="animate-pulse">Analyzing error...</span>
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-200">
          {msg.content.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
          )}
        </div>
      )}
    </div>
  </div>
);

// Shared: typing indicator dots
const TypingIndicator = () => (
  <div className="flex gap-3">
    <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
      <Bot className="w-4 h-4 text-primary" />
    </div>
    <div className="px-4 py-3 rounded-xl bg-dark-800 border border-dark-700">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// Shared: initial help-offer screen before user clicks "Yes"
const HelpOfferScreen = ({ response, error, requestInfo, onAccept, onClose }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center mb-4 border border-red-500/20">
      <AlertCircle className="w-8 h-8 text-red-400" />
    </div>
    <h4 className="text-base font-semibold text-white mb-2">
      Facing an issue?
    </h4>
    <p className="text-sm text-gray-400 mb-6">
      I detected an error in your API response. Want me to help analyze it?
    </p>
    {/* Error preview */}
    <div className="w-full p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-6">
      <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="font-medium">
          {response?.status || 'Error'} {response?.statusText || error?.message || 'Request Failed'}
        </span>
      </div>
      <p className="text-xs text-gray-500 truncate">
        {requestInfo?.method || 'GET'} {requestInfo?.url || 'Unknown endpoint'}
      </p>
    </div>
    <button
      onClick={onAccept}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-sm transition-all active:scale-95 shadow-lg shadow-primary/25"
    >
      <Sparkles className="w-4 h-4" />
      Yes, help me out!
    </button>
    <button
      onClick={onClose}
      className="mt-3 text-xs text-gray-500 hover:text-gray-400 transition-colors"
    >
      No thanks, I'll figure it out
    </button>
  </div>
);

// Shared: chat input bar
const ChatInputBar = ({ userInput, setUserInput, onSend, isProcessing }) => (
  <div className="p-3 border-t border-dark-700 bg-dark-800/50">
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
        placeholder="Ask a follow-up question..."
        className="flex-1 bg-dark-900/60 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        disabled={isProcessing}
      />
      <button
        onClick={onSend}
        disabled={!userInput.trim() || isProcessing}
        className="p-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT: Bottom-right corner (draggable) - ACTIVE
// ============================================================================

/**
 * Draggable AI Chatbot Helper Component
 * - Draggable by header (no separate drag icon)
 * - Resizable (small/medium)
 * - Minimize to floating bubble at bottom-right with smooth fade/scale
 * 
 * @param {boolean} isVisible - Controls visibility
 * @param {function} onClose - Close handler (still passed but not used in header)
 * @param {object} error - Error object from request
 * @param {object} response - Response object from request
 * @param {object} requestInfo - Request details (url, method, etc.)
 */
const AIChatbotHelper = ({
  isVisible,
  onClose,
  error,
  response,
  requestInfo
}) => {
  const [size, setSize] = useState('small');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [hasAcceptedHelp, setHasAcceptedHelp] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [animatingIn, setAnimatingIn] = useState(false);

  const [position, setPosition] = useState({ x: window.innerWidth - 360, y: window.innerHeight - 480 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const dimensions = {
    small: { width: 320, height: 420 },
    medium: { width: 420, height: 540 }
  };
  const currentSize = dimensions[size];
  const HEADER_HEIGHT = 56;
  const MARGIN = 20;

  // Reset everything when chatbot is hidden
  useEffect(() => {
    if (!isVisible) {
      setChatMessages([]);
      setHasAcceptedHelp(false);
      setIsProcessing(false);
      setIsMinimized(false);
      setAnimatingOut(false);
      setAnimatingIn(false);
      setSize('small');
      setPosition({
        x: window.innerWidth - dimensions.small.width - MARGIN,
        y: window.innerHeight - dimensions.small.height - MARGIN
      });
    }
  }, [isVisible]);

  // Reset chat when error changes
  useEffect(() => {
    if (error && isVisible) {
      setChatMessages([]);
      setHasAcceptedHelp(false);
      setIsProcessing(false);
    }
  }, [error, isVisible]);

  // Clamp position to stay within viewport
  const clampPosition = useCallback((x, y, w, h) => {
    return {
      x: Math.max(0, Math.min(x, window.innerWidth - w - MARGIN)),
      y: Math.max(0, Math.min(y, window.innerHeight - h - MARGIN))
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMinimized) {
        setPosition(prev => clampPosition(prev.x, prev.y, currentSize.width, currentSize.height));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentSize, isMinimized, clampPosition]);

  // Handle size toggle (only when expanded)
  const handleSizeToggle = (e) => {
    e.stopPropagation();
    const newSize = size === 'small' ? 'medium' : 'small';
    const newDims = dimensions[newSize];
    const oldWidth = currentSize.width;
    setSize(newSize);
    setPosition(prev => {
      const adjustedX = prev.x + (oldWidth - newDims.width);
      return clampPosition(adjustedX, prev.y, newDims.width, newDims.height);
    });
  };

  // Minimize to bubble with smooth fade-out
  const handleMinimize = (e) => {
    if (e) e.stopPropagation();
    if (animatingOut) return;
    setAnimatingOut(true);
    setTimeout(() => {
      setIsMinimized(true);
      setAnimatingOut(false);
    }, 200);
  };

  // Expand from bubble with smooth fade-in
  const handleExpand = () => {
    if (animatingIn) return;
    setIsMinimized(false);
    setAnimatingIn(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        setAnimatingIn(false);
      }, 50);
    });
    setPosition(prev => clampPosition(prev.x, prev.y, currentSize.width, currentSize.height));
  };

  // Dragging handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.chatbot-drag-handle') && !e.target.closest('button')) {
      setIsDragging(true);
      offsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      e.preventDefault();
    }
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const clamped = clampPosition(
        e.clientX - offsetRef.current.x,
        e.clientY - offsetRef.current.y,
        currentSize.width,
        currentSize.height
      );
      setPosition(clamped);
    }
  }, [isDragging, currentSize, clampPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // AI analysis (dummy)
  const analyzeError = useCallback(async () => {
    setIsProcessing(true);
    setChatMessages(prev => [...prev, {
      type: 'bot',
      content: 'Analyzing your error...',
      isLoading: true
    }]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysis = generateErrorAnalysis(response, error, requestInfo);

    setChatMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        type: 'bot',
        content: analysis,
        isLoading: false
      };
      return updated;
    });

    setIsProcessing(false);
  }, [error, response, requestInfo]);

  const handleAcceptHelp = () => {
    setHasAcceptedHelp(true);
    setChatMessages([{
      type: 'user',
      content: 'Yes, please help me understand this error.'
    }]);
    analyzeError();
  };

  const handleSendMessage = () => {
    if (!userInput.trim() || isProcessing) return;
    
    const message = userInput.trim();
    setChatMessages(prev => [...prev, {
      type: 'user',
      content: message
    }]);
    
    setUserInput('');
    setIsProcessing(true);
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        type: 'bot',
        content: "I understand your concern. Based on the error analysis above, I recommend:\n\n1️⃣ Double-check your request configuration\n2️⃣ Verify all required parameters\n3️⃣ Test with a simpler request first\n\n💡 **Pro tip:** Try using the environment variables feature to manage your API keys securely.\n\nWould you like me to generate a sample request?"
      }]);
      setIsProcessing(false);
    }, 1500);
  };

  if (!isVisible) return null;

  // Minimized state: bubble with smooth pop-in
  if (isMinimized) {
    return ReactDOM.createPortal(
      <button
        onClick={handleExpand}
        className="fixed z-[200] w-14 h-14 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center animate-in fade-in zoom-in"
        style={{ bottom: MARGIN, right: MARGIN }}
        data-testid="ai-chatbot-bubble"
      >
        <Bot className="w-6 h-6 text-white" />
        {error && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center animate-pulse font-bold">!</span>}
      </button>,
      document.body
    );
  }

  // Expanded panel with smooth fade-in/out transitions
  const panelClasses = clsx(
    "fixed z-[200] flex flex-col rounded-2xl shadow-2xl overflow-hidden",
    "bg-gradient-to-b from-dark-800 to-dark-900 border border-dark-600/50",
    isDragging && "cursor-grabbing select-none opacity-90",
    (animatingOut || animatingIn) && "transition-all duration-200 ease-out",
    animatingOut && "opacity-0 scale-95",
    animatingIn && "opacity-0 scale-95"
  );

  return ReactDOM.createPortal(
    <div
      ref={dragRef}
      className={panelClasses}
      style={{
        left: position.x,
        top: position.y,
        width: currentSize.width,
        height: currentSize.height,
        transition: isDragging
          ? 'none'
          : 'left 350ms cubic-bezier(0.4, 0, 0.2, 1), top 350ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms ease-out, height 250ms ease-out',
      }}
      onMouseDown={handleMouseDown}
      data-testid="ai-chatbot-draggable"
    >
      {/* Header - Draggable area */}
      <div className="chatbot-drag-handle flex items-center justify-between px-4 py-3 bg-dark-800/90 border-b border-dark-700 cursor-grab active:cursor-grabbing select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <p className="text-[10px] text-gray-400">Error Analysis Helper</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Size toggle */}
          <button
            onClick={handleSizeToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            title={size === 'small' ? 'Expand' : 'Shrink'}
            data-testid="chatbot-size-toggle"
          >
            {size === 'small' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          
          {/* Close button now minimizes instead of closing */}
          <button
            onClick={(e) => { e.stopPropagation(); handleMinimize(e); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            title="Minimize to bubble"
            data-testid="chatbot-minimize-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {!hasAcceptedHelp ? (
          <HelpOfferScreen
            response={response}
            error={error}
            requestInfo={requestInfo}
            onAccept={handleAcceptHelp}
            onClose={onClose}
          />
        ) : (
          <>
            {chatMessages.map((msg, index) => (
              <ChatMessage key={index} msg={msg} index={index} />
            ))}
            {isProcessing && chatMessages.length > 0 && !chatMessages[chatMessages.length - 1]?.isLoading && (
              <TypingIndicator />
            )}
          </>
        )}
      </div>

      {/* Input area */}
      {hasAcceptedHelp && (
        <ChatInputBar
          userInput={userInput}
          setUserInput={setUserInput}
          onSend={handleSendMessage}
          isProcessing={isProcessing}
        />
      )}
    </div>,
    document.body
  );
};

// ============================================================================
// Helper hook to determine if chatbot should show
// ============================================================================

/**
 * Hook to determine if the AI chatbot should be visible based on response
 * Shows for 4xx/5xx errors and network errors
 * 
 * @param {Object} response - API response object
 * @param {Object} error - Error object if request failed
 * @returns {[boolean, function]} - [shouldShow, setShouldShow]
 */
export const useShouldShowChatbot = (response, error) => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const statusCode = response?.status || 0;
    const hasError = error !== null && error !== undefined;
    const is4xxError = statusCode >= 400 && statusCode < 500;
    const is5xxError = statusCode >= 500;
    const isNetworkError = hasError && !statusCode;

    if (is4xxError || is5xxError || isNetworkError) {
      const timer = setTimeout(() => setShouldShow(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShouldShow(false);
    }
  }, [response, error]);

  return [shouldShow, setShouldShow];
};

export default AIChatbotHelper;