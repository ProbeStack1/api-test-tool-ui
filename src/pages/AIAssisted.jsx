import React, { useState } from 'react';
import { Bot, Send, CheckCircle2, TestTube, Shield, Sparkles, Paperclip, Mic, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

const AIAssisted = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: "Hi! I'm your AI test assistant. Let's create comprehensive API test cases together. Describe the API endpoint you want to test, or paste your API specification to get started.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState("");
  const [testStatus, setTestStatus] = useState({
    unitTests: { status: "Ready", icon: TestTube, completed: false },
    integrationTests: { status: "Not configured", icon: Shield, completed: false },
    assertions: { status: "Not configured", icon: CheckCircle2, completed: false },
  });

  const quickActions = [
    "Generate test for GET /api/users",
    "Create assertions for status 200",
    "Add JSON schema validation",
    "Export test collection",
  ];

  const aiTips = [
    "Be specific about HTTP methods and endpoint paths for accurate test generation.",
    "Mention expected response codes (200, 404, 500) for comprehensive test coverage.",
    "Describe your data models clearly to ensure correct validation rules.",
    "Include authentication requirements early for proper test scaffolding.",
    "Use natural language to ask for complex logic like pagination or error handling tests.",
  ];

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, userMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        role: "assistant",
        content: "I'll help you create API test cases. Let me analyze your requirements and generate comprehensive tests...",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-probestack-bg text-white min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">AI-Assisted Test Generation</h2>
            <p className="text-sm text-gray-400 mt-1">
              Create API test cases with conversational AI assistance.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">
          {/* Chat Interface - Left Side */}
          <div className="col-span-12 lg:col-span-8 flex flex-col rounded-xl overflow-hidden bg-dark-800/60 border border-dark-700 shadow-xl">
            {/* Chat Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx(
                    "flex gap-4 items-start",
                    message.role === "user" ? "justify-end" : "max-w-[85%]"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary ring-1 ring-primary/30">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}
                  <div className={clsx(
                    "flex flex-col gap-1.5",
                    message.role === "user" ? "items-end max-w-[85%]" : ""
                  )}>
                    <div
                      className={clsx(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        message.role === "user"
                          ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20"
                          : "bg-dark-700/50 text-gray-100 rounded-tl-none border border-dark-600"
                      )}
                    >
                      <p>{message.content}</p>
                    </div>
                    <span className="text-[10px] text-gray-500 px-1">{message.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-dark-700 bg-dark-800/30">
              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(action)}
                    className="px-3 py-1.5 bg-dark-700/50 rounded-lg text-xs font-medium border border-dark-600 hover:border-primary/50 hover:bg-primary/5 transition-all text-gray-300"
                  >
                    {action}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="relative group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSend(e);
                    }
                  }}
                  className="w-full bg-dark-900/50 border border-dark-600 rounded-2xl p-4 pr-16 text-sm text-white focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder-gray-500 resize-none"
                  placeholder="Describe your API test requirements (e.g., 'Create tests for user authentication endpoints' or 'Generate assertions for JSON response validation')..."
                  rows="2"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary/30 group-hover:scale-105 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>

              {/* Bottom Actions */}
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                    <Paperclip className="w-4 h-4" />
                    Attach Spec
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                    <Mic className="w-4 h-4" />
                    Voice Input
                  </button>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">Press Cmd + Enter to send</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Test Status Panel */}
            <section className="bg-dark-800/60 border border-dark-700 rounded-xl p-6 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles className="w-16 h-16" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2">
                <span className="w-5 h-5 text-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </span>
                Test Generation Status
              </h3>
              <div className="space-y-6">
                {Object.entries(testStatus).map(([key, value]) => {
                  const Icon = value.icon;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          value.completed
                            ? "bg-green-500/20 text-green-400"
                            : "bg-dark-700/50 text-gray-400"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className={clsx(
                            "text-sm font-semibold",
                            value.completed ? "text-white" : "text-gray-400"
                          )}>
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                          </h4>
                          <p className={clsx(
                            "text-xs",
                            value.completed ? "text-green-400 font-medium" : "text-gray-500"
                          )}>
                            {value.status}
                          </p>
                        </div>
                      </div>
                      {value.completed && (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* AI Tips Panel */}
            <section className="bg-dark-800/60 border border-dark-700 rounded-xl p-6 shadow-lg relative overflow-hidden flex-grow">
              <div className="absolute -bottom-6 -right-6 opacity-5">
                <Sparkles className="w-32 h-32 text-primary" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Test Assistant Tips
              </h3>
              <ul className="space-y-4">
                {aiTips.map((tip, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-primary text-xl leading-none">•</span>
                    <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssisted;
