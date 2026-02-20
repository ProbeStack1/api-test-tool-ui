import React from 'react';
import { Copy } from 'lucide-react';
import clsx from 'clsx';

/**
 * Postman-style code snippet panel (e.g. cURL equivalent).
 */
export default function CodeSnippetPanel({ className, method, url, headers, body, authType, authData }) {
  const generateCurl = () => {
    if (!url || !url.trim()) {
      return '# Execute a request to see the equivalent cURL command.';
    }

    let curl = `curl -X ${method || 'GET'} '${url}'`;

    // Add headers
    if (headers && Array.isArray(headers)) {
      headers.forEach(header => {
        if (header.key && header.key.trim()) {
          curl += ` \\
  -H '${header.key}: ${header.value || ''}'`;
        }
      });
    }

    // Add auth headers
    if (authType === 'bearer' && authData?.token) {
      curl += ` \\
  -H 'Authorization: Bearer ${authData.token}'`;
    } else if (authType === 'basic' && authData?.username) {
      const credentials = `${authData.username}:${authData.password || ''}`;
      const encoded = btoa(credentials);
      curl += ` \\
  -H 'Authorization: Basic ${encoded}'`;
    } else if (authType === 'apikey' && authData?.key && authData?.value) {
      if (authData.in === 'header') {
        curl += ` \\
  -H '${authData.key}: ${authData.value}'`;
      }
    }

    // Add body for POST/PUT/PATCH
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body && body.trim()) {
      const escapedBody = body.replace(/'/g, "'\\\\''" );
      curl += ` \\
  -d '${escapedBody}'`;
    }

    return curl;
  };

  const curlCommand = generateCurl();

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCommand);
  };
  return (
    <aside
      className={clsx(
        'w-80 min-w-[18rem] max-w-[22rem] border-l border-dark-700 flex flex-col bg-dark-800/40 flex-shrink-0 min-h-0 overflow-hidden',
        className
      )}
    >
      <div className="p-4 border-b border-dark-700 shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Code snippet</h3>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
          title="Copy"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="mb-3">
          <select
            className="w-full bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 py-2 pl-3 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            defaultValue="curl"
          >
            <option value="curl" className="bg-dark-800 text-white">cURL</option>
            <option value="javascript" className="bg-dark-800 text-white">JavaScript (fetch)</option>
            <option value="postman" className="bg-dark-800 text-white">Postman CLI</option>
          </select>
        </div>
        <div className="flex-1 min-h-0 rounded-lg border border-dark-700 bg-dark-900/80 overflow-auto">
          <pre className="p-4 text-xs font-mono text-gray-400 whitespace-pre-wrap break-all leading-relaxed">
            {curlCommand}
          </pre>
        </div>
      </div>
    </aside>
  );
}
