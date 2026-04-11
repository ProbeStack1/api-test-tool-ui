import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Zap, Shield, Gauge, Sparkles, Send, Loader2,
  CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';
import clsx from 'clsx';

export default function RightPanelAI({
  method,
  url,
  headers,
  body,
  authType,
  preRequestScript,
  tests,
  response,
  isLoading,
}) {
  const [activeTab, setActiveTab] = useState('analysis');
  const [aiResponse, setAiResponse] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const scrollContainerRef = useRef(null);

  const requestSummary = useMemo(() => {
    const headersCount = headers?.filter(h => h.key?.trim()).length || 0;
    const hasBody = body && body.trim() !== '' && body !== '{\n  \n}';
    const hasAuth = authType !== 'none';
    const hasPreScript = preRequestScript && preRequestScript.trim() !== '';
    const hasTests = tests && tests.trim() !== '';
    return { headersCount, hasBody, hasAuth, hasPreScript, hasTests };
  }, [headers, body, authType, preRequestScript, tests]);

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const generateAnalysis = async () => {
    setIsAiLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const analysis = {
      overview: `This ${method} request to ${url} ${
        response ? `returned ${response.status}` : 'has not been executed yet'
      }.`,
      suggestions: [
        response?.status >= 400
          ? `Status ${response.status} indicates an error. Check the URL and authentication.`
          : 'Request appears well-formed. Consider adding error handling.',
        requestSummary.hasAuth
          ? 'Authentication is configured. Ensure tokens are not expired.'
          : 'No authentication detected. Add API keys or tokens for protected endpoints.',
        requestSummary.headersCount === 0
          ? 'No custom headers. Add Content-Type if sending JSON payloads.'
          : `${requestSummary.headersCount} headers are set. Verify they are necessary.`,
        requestSummary.hasBody
          ? 'Request includes a body. Validate the schema matches API expectations.'
          : 'No request body. For GET requests this is fine.',
      ],
      security: [
        url?.startsWith('https') ? 'Uses HTTPS – good.' : 'Uses HTTP – upgrade to HTTPS for production.',
        requestSummary.hasAuth ? 'Authentication is present.' : 'Missing authentication – sensitive data may be exposed.',
        'Consider rate limiting and input validation on the server side.',
      ],
      performance: [
        response?.time
          ? `Response time: ${response.time}ms. ${response.time > 500 ? 'Consider optimising.' : 'Good performance.'}`
          : 'Execute the request to measure performance.',
        'Use compression (gzip) and caching headers for repeated calls.',
        'Avoid sending large payloads unnecessarily.',
      ],
    };
    setAiResponse(analysis);
    setIsAiLoading(false);
  };

  useEffect(() => {
    generateAnalysis();
  }, [method, url, JSON.stringify(headers), body, authType, response?.status]);

  const handleSendPrompt = async () => {
    if (!userPrompt.trim()) return;
    const newMessage = { role: 'user', content: userPrompt };
    setChatHistory(prev => [...prev, newMessage]);
    setUserPrompt('');
    setIsAiLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const aiReply = {
      role: 'assistant',
      content: `I'm analyzing your request. ${userPrompt.includes('error') ? 'The error may be due to incorrect URL or missing headers.' : 'Check the response body and status code for clues.'}`,
    };
    setChatHistory(prev => [...prev, aiReply]);
    setIsAiLoading(false);
  };

  return (
    <div className="w-80 min-w-[18rem] max-w-[20rem] border-l border-dark-700 bg-dark-800/90 flex flex-col h-full overflow-x-hidden">
      {/* Fixed Header */}
      <div className="p-4 border-b border-dark-700 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-xs font-semibold text-white">AI Assistant</h3>
        </div>
        <p className="text-xs text-gray-500 py-1.5">Analyze and improve your API requests</p>
        {/* Request summary badges – now wrap properly */}
        <div className="flex flex-nowrap gap-2 text-xs w-full">
          <span className={clsx(
            'px-2 py-1 rounded-full shrink-0',
            method === 'GET' && 'bg-green-500/20 text-green-300',
            method === 'POST' && 'bg-yellow-500/20 text-yellow-300',
            method === 'PUT' && 'bg-blue-500/20 text-blue-300',
            method === 'DELETE' && 'bg-red-500/20 text-red-300',
          )}>
            {method}
          </span>
          <span className="px-2 py-1 rounded-full bg-dark-700 text-gray-300 truncate max-w-[200px] shrink-0">
            {url?.length > 40 ? url.slice(0, 40) + '…' : url || 'No URL'}
          </span>
          {response?.status && (
            <span className={clsx(
              'px-2 py-1 rounded-full shrink-0',
              response.status >= 200 && response.status < 300
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            )}>
              {response.status}
            </span>
          )}
        </div>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <div className="border-b border-dark-700 px-2 py-1.5 shrink-0 overflow-x-auto overflow-y-hidden thin-horizontal-scrollbar">
        <div className="flex gap-1 min-w-max">
          {[
            { id: 'analysis', label: 'Analysis', icon: Info },
            { id: 'suggestions', label: 'Suggestions', icon: Zap },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'performance', label: 'Performance', icon: Gauge },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-white'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content Area – with auto-scroll */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 space-y-4">
        {isAiLoading && !aiResponse ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-gray-400">Analyzing request...</span>
          </div>
        ) : aiResponse ? (
          <>
            {activeTab === 'analysis' && (
              <div className="space-y-3">
                <div className="rounded-md p-3 border border-dark-700">
                  <p className="text-sm text-gray-300 break-words">{aiResponse.overview}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Request Details</h4>
                  <ul className="space-y-1 text-xs text-gray-300">
                    <li className="flex justify-between">
                      <span>Headers:</span>
                      <span>{requestSummary.headersCount} configured</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Body:</span>
                      <span>{requestSummary.hasBody ? 'Yes' : 'No'}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Authentication:</span>
                      <span>{requestSummary.hasAuth ? authType : 'None'}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Pre‑request Script:</span>
                      <span>{requestSummary.hasPreScript ? 'Yes' : 'No'}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Tests:</span>
                      <span>{requestSummary.hasTests ? 'Yes' : 'No'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="space-y-3">
                {aiResponse.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex gap-2 p-2 rounded-lg border border-dark-700">
                    <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-300 break-words">{suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-3">
                {aiResponse.security.map((item, idx) => (
                  <div key={idx} className="flex gap-2 p-2 rounded-lg border border-dark-700">
                    {item.includes('HTTPS') || item.includes('Authentication') ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    )}
                    <p className="text-xs text-gray-300 break-words">{item}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-3">
                {aiResponse.performance.map((item, idx) => (
                  <div key={idx} className="flex gap-2 p-2 rounded-lg border border-dark-700">
                    <Gauge className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-300 break-words">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-dark-700">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversation</h4>
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={clsx(
                'flex mb-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}>
                <div 
                  className={clsx(
                    'p-2 rounded text-xs max-w-[85%] break-words text-gray-300',
                    msg.role === 'user' 
                      ? ' text-right' 
                      : ' text-left'
                  )}
                  style={{
                    border: msg.role === 'user' ? '1px solid #4b5563' : '1px solid #4b5563',
                    borderRight: msg.role === 'user' ? '3px solid #6b7280' : '1px solid #4b5563',
                    borderLeft: msg.role === 'user' ? "1px solid #4b5563" : '2px solid #6b7280',
                  }}
                >
                  <span className="font-semibold">{msg.role === 'user' ? 'You' : 'AI'}:</span> {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Chat Input */}
      <div className="border-t border-dark-700 p-3 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
            placeholder="Ask about this request..."
            className="flex-1 border border-dark-700 rounded-md px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSendPrompt}
            disabled={isAiLoading || !userPrompt.trim()}
            className={clsx(
              'p-2 rounded-md transition-colors',
              !userPrompt.trim() || isAiLoading
                ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 cursor-pointer text-white'
            )}
          >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}