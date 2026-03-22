/**
 * AIChatbotHelper.jsx
 * 
 * A draggable AI chatbot popup that appears when API errors occur (4xx/5xx/network errors).
 * Features:
 * - Draggable across the screen
 * - Resizable (small/medium toggle) - stays within viewport bounds
 * - Minimize/Collapse snaps to bottom-right corner
 * - Modern, professional design matching the app's color scheme
 * - Analyzes errors and provides helpful responses (dummy data for now - real AI integration later)
 * 
 * Position Options (one active, two commented for testing):
 * 1. Bottom-right corner (draggable) - ACTIVE
 * 2. Right side panel (slide-in) - COMMENTED (full code, just uncomment)
 * 3. Floating bubble that expands - COMMENTED (full code, just uncomment)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Bot, X, Minimize2, Maximize2, Send, AlertCircle, 
  Loader2, Move, MessageSquare, Sparkles,
  ChevronDown, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';


// ============================================================================
// Shared helper: generates dummy AI analysis from error details
// Used by all 3 position options
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
// POSITION OPTION 1: Bottom-right corner (draggable) - ACTIVE
// ============================================================================

/**
 * Draggable AI Chatbot Helper Component
 * This is the ACTIVE position option - bottom-right draggable
 * 
 * @param {boolean} isVisible - Controls visibility
 * @param {function} onClose - Close handler
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
  // Size toggle state - small (320x420) or medium (420x540)
  const [size, setSize] = useState('small');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [hasAcceptedHelp, setHasAcceptedHelp] = useState(false);
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 360, y: window.innerHeight - 480 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Size dimensions
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
      setSize('small');
      // Reset position to bottom-right
      setPosition({
        x: window.innerWidth - dimensions.small.width - MARGIN,
        y: window.innerHeight - dimensions.small.height - MARGIN
      });
    }
  }, [isVisible]);

  // Reset chat when error changes (but only when visible)
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

  // Handle window resize - keep chatbot in viewport
  useEffect(() => {
    const handleResize = () => {
      const h = isMinimized ? HEADER_HEIGHT : currentSize.height;
      setPosition(prev => clampPosition(prev.x, prev.y, currentSize.width, h));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentSize, isMinimized, clampPosition]);

  // Handle size toggle - maintain right-edge alignment when resizing
  const handleSizeToggle = (e) => {
    e.stopPropagation();
    const newSize = size === 'small' ? 'medium' : 'small';
    const newDims = dimensions[newSize];
    const oldWidth = currentSize.width;
    setSize(newSize);
    // Shift x to keep the right edge in the same place, then clamp
    setPosition(prev => {
      const adjustedX = prev.x + (oldWidth - newDims.width);
      return clampPosition(adjustedX, prev.y, newDims.width, newDims.height);
    });
  };

  // Handle minimize toggle - snap to bottom-right when minimizing
  const handleMinimizeToggle = (e) => {
    e.stopPropagation();
    const willMinimize = !isMinimized;
    setIsMinimized(willMinimize);

    if (willMinimize) {
      // Snap to bottom-right corner when minimizing
      setPosition({
        x: window.innerWidth - currentSize.width - MARGIN,
        y: window.innerHeight - HEADER_HEIGHT - MARGIN
      });
    } else {
      // When expanding back, place so the full panel fits on screen
      setPosition(prev => clampPosition(prev.x, prev.y, currentSize.width, currentSize.height));
    }
  };

  // Dragging handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.chatbot-drag-handle')) {
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
      const h = isMinimized ? HEADER_HEIGHT : currentSize.height;
      const clamped = clampPosition(
        e.clientX - offsetRef.current.x,
        e.clientY - offsetRef.current.y,
        currentSize.width,
        h
      );
      setPosition(clamped);
    }
  }, [isDragging, currentSize, isMinimized, clampPosition]);

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

  // Analyze error and generate helpful response (dummy implementation - real AI later)
  const analyzeError = useCallback(async () => {
    setIsProcessing(true);
    setChatMessages(prev => [...prev, {
      type: 'bot',
      content: 'Analyzing your error...',
      isLoading: true
    }]);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysis = generateErrorAnalysis(response, error, requestInfo);

    // Replace loading message with analysis
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

  // Handle user accepting help
  const handleAcceptHelp = () => {
    setHasAcceptedHelp(true);
    setChatMessages([{
      type: 'user',
      content: 'Yes, please help me understand this error.'
    }]);
    analyzeError();
  };

  // Handle user sending a follow-up message
  const handleSendMessage = () => {
    if (!userInput.trim() || isProcessing) return;
    
    const message = userInput.trim();
    setChatMessages(prev => [...prev, {
      type: 'user',
      content: message
    }]);
    
    setUserInput('');
    setIsProcessing(true);
    
    // Simulate bot response (dummy - real AI later)
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        type: 'bot',
        content: "I understand your concern. Based on the error analysis above, I recommend:\n\n1️⃣ Double-check your request configuration\n2️⃣ Verify all required parameters\n3️⃣ Test with a simpler request first\n\n💡 **Pro tip:** Try using the environment variables feature to manage your API keys securely.\n\nWould you like me to generate a sample request?"
      }]);
      setIsProcessing(false);
    }, 1500);
  };

  if (!isVisible) return null;

  return ReactDOM.createPortal(
    <div
      ref={dragRef}
      className={clsx(
        "fixed z-[200] flex flex-col rounded-2xl shadow-2xl overflow-hidden",
        "bg-gradient-to-b from-dark-800 to-dark-900 border border-dark-600/50",
        isDragging && "cursor-grabbing select-none opacity-90"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: currentSize.width,
        height: isMinimized ? HEADER_HEIGHT : currentSize.height,
        // Smooth transition for collapse/expand/resize but NOT during drag
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
            {/* Animated pulse indicator */}
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <p className="text-[10px] text-gray-400">Error Analysis Helper</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Drag indicator */}
          <Move className="w-4 h-4 text-gray-500 mr-2" />
          
          {/* Size toggle */}
          <button
            onClick={handleSizeToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            title={size === 'small' ? 'Expand' : 'Shrink'}
            data-testid="chatbot-size-toggle"
          >
            {size === 'small' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          
          {/* Minimize/Collapse toggle */}
          <button
            onClick={handleMinimizeToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
            data-testid="chatbot-minimize-toggle"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Close"
            data-testid="chatbot-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content - only show when not minimized */}
      {!isMinimized && (
        <>
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
                {/* Typing indicator */}
                {isProcessing && chatMessages.length > 0 && !chatMessages[chatMessages.length - 1]?.isLoading && (
                  <TypingIndicator />
                )}
              </>
            )}
          </div>

          {/* Input area - only show after accepting help */}
          {hasAcceptedHelp && (
            <ChatInputBar
              userInput={userInput}
              setUserInput={setUserInput}
              onSend={handleSendMessage}
              isProcessing={isProcessing}
            />
          )}
        </>
      )}
    </div>,
    document.body
  );
};


// ============================================================================
// POSITION OPTION 2: Right side panel (slide-in) - COMMENTED
// To test: Uncomment this block, comment out Option 1's export at the bottom,
// and change the default export to AIChatbotHelperSidePanel
// ============================================================================

/*
const AIChatbotHelperSidePanel = ({
  isVisible,
  onClose,
  error,
  response,
  requestInfo
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [hasAcceptedHelp, setHasAcceptedHelp] = useState(false);

  // Reset everything when hidden
  useEffect(() => {
    if (!isVisible) {
      setChatMessages([]);
      setHasAcceptedHelp(false);
      setIsProcessing(false);
    }
  }, [isVisible]);

  // Reset when error changes
  useEffect(() => {
    if (error && isVisible) {
      setChatMessages([]);
      setHasAcceptedHelp(false);
      setIsProcessing(false);
    }
  }, [error, isVisible]);

  // Analyze error with dummy AI response
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

  // User clicks "Yes, help me out!"
  const handleAcceptHelp = () => {
    setHasAcceptedHelp(true);
    setChatMessages([{
      type: 'user',
      content: 'Yes, please help me understand this error.'
    }]);
    analyzeError();
  };

  // User sends a follow-up message
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

  return ReactDOM.createPortal(
    <div
      className={clsx(
        "fixed top-0 right-0 h-full z-[200] flex flex-col",
        "bg-gradient-to-b from-dark-800 to-dark-900 border-l border-dark-600/50",
        "transition-transform duration-300 ease-out shadow-2xl",
        isVisible ? "translate-x-0" : "translate-x-full"
      )}
      style={{ width: 400 }}
      data-testid="ai-chatbot-sidepanel"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-dark-800/90 border-b border-dark-700 shrink-0">
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
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

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
*/


// ============================================================================
// POSITION OPTION 3: Floating bubble that expands - COMMENTED
// To test: Uncomment this block, comment out Option 1's export at the bottom,
// and change the default export to AIChatbotHelperBubble
// ============================================================================

/*
const AIChatbotHelperBubble = ({
  isVisible,
  onClose,
  error,
  response,
  requestInfo
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [hasAcceptedHelp, setHasAcceptedHelp] = useState(false);

  const PANEL_WIDTH = 360;
  const PANEL_HEIGHT = 480;

  // Reset everything when hidden
  useEffect(() => {
    if (!isVisible) {
      setChatMessages([]);
      setHasAcceptedHelp(false);
      setIsProcessing(false);
      setIsExpanded(false);
      setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
    }
  }, [isVisible]);

  // Reset when error changes
  useEffect(() => {
    if (error && isVisible) {
      setChatMessages([]);
      setHasAcceptedHelp(false);
      setIsProcessing(false);
      setIsExpanded(false);
    }
  }, [error, isVisible]);

  // Dragging handlers for the collapsed bubble
  const handleBubbleMouseDown = useCallback((e) => {
    setIsDragging(true);
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    e.preventDefault();
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - offsetRef.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - offsetRef.current.y));
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

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

  // Analyze error with dummy AI response
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

  // User clicks "Yes, help me out!"
  const handleAcceptHelp = () => {
    setHasAcceptedHelp(true);
    setChatMessages([{
      type: 'user',
      content: 'Yes, please help me understand this error.'
    }]);
    analyzeError();
  };

  // User sends a follow-up message
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

  // Calculate panel position based on bubble position (keep within viewport)
  const getPanelPosition = () => {
    let left = position.x - PANEL_WIDTH + 56;
    let top = position.y - PANEL_HEIGHT;

    // Keep within viewport bounds
    if (left < 10) left = 10;
    if (left + PANEL_WIDTH > window.innerWidth - 10) left = window.innerWidth - PANEL_WIDTH - 10;
    if (top < 10) top = 10;
    if (top + PANEL_HEIGHT > window.innerHeight - 10) top = window.innerHeight - PANEL_HEIGHT - 10;

    return { left, top };
  };

  if (!isVisible) return null;

  const panelPos = getPanelPosition();

  return ReactDOM.createPortal(
    <>
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          onMouseDown={handleBubbleMouseDown}
          className={clsx(
            "fixed z-[200] w-14 h-14 rounded-full shadow-2xl transition-all",
            "bg-gradient-to-br from-primary to-primary/80 hover:scale-110",
            "flex items-center justify-center",
            isDragging && "cursor-grabbing"
          )}
          style={{ left: position.x, top: position.y }}
          data-testid="ai-chatbot-bubble"
        >
          <Bot className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center animate-pulse font-bold">!</span>
        </button>
      )}

      {isExpanded && (
        <div
          className="fixed z-[200] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-b from-dark-800 to-dark-900 border border-dark-600/50"
          style={{ left: panelPos.left, top: panelPos.top, width: PANEL_WIDTH, height: PANEL_HEIGHT }}
          data-testid="ai-chatbot-bubble-expanded"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-dark-800/90 border-b border-dark-700 shrink-0">
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
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                title="Collapse to bubble"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

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

          {hasAcceptedHelp && (
            <ChatInputBar
              userInput={userInput}
              setUserInput={setUserInput}
              onSend={handleSendMessage}
              isProcessing={isProcessing}
            />
          )}
        </div>
      )}
    </>,
    document.body
  );
};
*/


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
      // Small delay to let response render first
      const timer = setTimeout(() => setShouldShow(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShouldShow(false);
    }
  }, [response, error]);

  return [shouldShow, setShouldShow];
};

export default AIChatbotHelper;
