import React, { useState } from 'react';
import { Server, Globe, Layers, ChevronRight, Search, Plus, Tag, User, Filter } from 'lucide-react';
import clsx from 'clsx';

export default function APISourcesPanel({ onSelectEndpoint, showHeader = true, forgeqStyle = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedServices, setExpandedServices] = useState(new Set());

  // Mock API sources - in real app, this would come from backend
  const apiSources = [
    {
      id: 'user-service',
      name: 'User Service',
      icon: Server,
      environment: 'Production',
      version: 'v2.1.0',
      owner: 'Platform Team',
      endpoints: [
        { id: '1', method: 'GET', path: '/api/users', description: 'List all users' },
        { id: '2', method: 'GET', path: '/api/users/:id', description: 'Get user by ID' },
        { id: '3', method: 'POST', path: '/api/users', description: 'Create new user' },
      ]
    },
    {
      id: 'product-service',
      name: 'Product Service',
      icon: Layers,
      environment: 'Staging',
      version: 'v1.5.2',
      owner: 'E-commerce Team',
      endpoints: [
        { id: '4', method: 'GET', path: '/api/products', description: 'List products' },
        { id: '5', method: 'POST', path: '/api/products', description: 'Create product' },
      ]
    },
    {
      id: 'external-apis',
      name: 'External APIs',
      icon: Globe,
      environment: 'External',
      version: null,
      owner: 'External',
      endpoints: [
        { id: '6', method: 'GET', path: 'https://api.github.com/users', description: 'GitHub Users API' },
        { id: '7', method: 'GET', path: 'https://jsonplaceholder.typicode.com/posts', description: 'JSONPlaceholder Posts' },
      ]
    }
  ];

  const toggleService = (serviceId) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const filteredSources = apiSources.filter(source => 
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.endpoints.some(ep => 
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header (conditional) */}
      {showHeader && (
        <div className="px-3 py-2 border-b border-dark-700/50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-300">API Sources</h2>
            <button className="p-1 hover:bg-dark-700/50 rounded text-gray-500 hover:text-gray-300">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-900/50 border border-dark-700/50 rounded px-7 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-primary/50 placeholder:text-dark-500"
            />
          </div>
        </div>
      )}
      
      {/* Search (when no header) - Forgeq style: Collections + Filter + Filter input */}
      {!showHeader && (
        <div className={clsx('border-b border-dark-700/50', forgeqStyle ? 'p-4 space-y-3' : 'px-3 py-2')}>
          {forgeqStyle && (
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Collections</span>
              <button type="button" className="p-1.5 rounded-lg transition-colors hover:bg-dark-700 text-gray-500 hover:text-white">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={clsx(
                'w-full border border-dark-700 rounded-lg pl-9 pr-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-gray-500',
                forgeqStyle ? 'bg-dark-800 py-2 text-xs' : 'bg-dark-900/50 px-7 py-1.5 text-xs'
              )}
            />
          </div>
        </div>
      )}

      {/* Services List */}
      <div className={clsx('flex-1 overflow-y-auto custom-scrollbar min-h-0', forgeqStyle ? 'p-3 space-y-2.5' : 'p-2 space-y-2')}>
        {filteredSources.map((source, index) => {
          const isExpanded = expandedServices.has(source.id);
          const Icon = source.icon;
          const isFirst = index === 0;

          return (
            <div
              key={source.id}
              className={clsx(
                'rounded-xl overflow-hidden border cursor-pointer transition-all shadow-sm',
                forgeqStyle
                  ? isFirst
                    ? 'border-primary/30 bg-primary/10 border-l-4 border-l-primary shadow-primary/5'
                    : 'border-dark-700 bg-dark-800 hover:border-primary/20 hover:bg-dark-700/50'
                  : 'bg-dark-800/40 border-dark-700/50'
              )}
            >
              {/* Service Header */}
              <button
                onClick={() => toggleService(source.id)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-dark-700/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-dark-700/50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gray-200 truncate">{source.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={clsx(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                      source.environment === 'Production' && "bg-green-500/10 text-green-400 border border-green-500/20",
                      source.environment === 'Staging' && "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
                      "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                    )}>
                      <Tag className="w-3 h-3" />
                      {source.environment}
                    </span>
                    {source.version && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-dark-700/30 border border-dark-600/50">
                        {source.version}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight
                  className={clsx(
                    "w-4 h-4 text-gray-500 transition-transform flex-shrink-0 mt-1",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>

              {/* Endpoints */}
              {isExpanded && (
                <div className="border-t border-dark-700/50 bg-dark-900/20">
                  {source.endpoints.map(endpoint => (
                    <button
                      key={endpoint.id}
                      onClick={() => onSelectEndpoint && onSelectEndpoint(endpoint)}
                      className="w-full px-4 py-3 text-left hover:bg-dark-700/40 transition-colors border-b border-dark-700/30 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded",
                            endpoint.method === 'GET' && "text-green-400 bg-green-400/10",
                            endpoint.method === 'POST' && "text-yellow-400 bg-yellow-400/10",
                            endpoint.method === 'PUT' && "text-blue-400 bg-blue-400/10",
                            endpoint.method === 'DELETE' && "text-red-400 bg-red-400/10",
                            "text-purple-400 bg-purple-400/10"
                          )}
                        >
                          {endpoint.method}
                        </span>
                        <span className="text-xs font-mono text-gray-300 truncate flex-1">
                          {endpoint.path}
                        </span>
                      </div>
                      {endpoint.description && (
                        <p className="text-[10px] text-gray-500 leading-relaxed">{endpoint.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredSources.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Search className="w-8 h-8 text-gray-500 mb-3 opacity-50" />
            <p className="text-xs text-gray-500">No APIs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
