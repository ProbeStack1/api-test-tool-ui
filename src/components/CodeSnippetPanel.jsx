import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

// ----------------------------------------------------------------------
// Helper: parse query string from URL
// ----------------------------------------------------------------------
function parseQueryString(url) {
  if (!url) return [];
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return [];
  const queryString = url.slice(queryIndex + 1);
  if (!queryString) return [];
  return queryString.split('&').map(pair => {
    const eqIndex = pair.indexOf('=');
    let key, value;
    if (eqIndex === -1) {
      key = pair;
      value = '';
    } else {
      key = pair.slice(0, eqIndex);
      value = pair.slice(eqIndex + 1);
    }
    try { key = decodeURIComponent(key); } catch { /* keep as-is */ }
    try { value = decodeURIComponent(value); } catch { /* keep as-is */ }
    return { key: key || '', value: value || '', enabled: true };
  });
}

// ----------------------------------------------------------------------
// cURL Parser (extended to handle query params)
// ----------------------------------------------------------------------
function parseCurlToRequest(curlString) {
  if (!curlString.trim()) return null;

  // Remove line continuations (backslash + newline)
  let cleaned = curlString.replace(/\\\s*\n/g, ' ').trim();

  // Default values
  let method = 'GET';
  let url = '';
  let headers = [];
  let body = '';
  let authType = 'none';
  let authData = {};

  // 1. Extract method (-X or --request)
  const methodMatch = cleaned.match(/-X\s+([A-Z]+)/i) || cleaned.match(/--request\s+([A-Z]+)/i);
  if (methodMatch) method = methodMatch[1].toUpperCase();

  // 2. Extract URL (first argument that looks like a URL, or after -X)
  const urlMatch = cleaned.match(/(?:-X\s+[A-Z]+\s+)?(https?:\/\/[^\s'"]+)/i) ||
                   cleaned.match(/(?:-X\s+[A-Z]+\s+)?(['"])(https?:\/\/[^\1]+?)\1/i);
  if (urlMatch) url = urlMatch[2] || urlMatch[1];

  // 3. Extract headers (-H or --header)
  const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = headerRegex.exec(cleaned)) !== null) {
    const headerLine = match[1];
    const colonIndex = headerLine.indexOf(':');
    if (colonIndex !== -1) {
      const key = headerLine.slice(0, colonIndex).trim();
      const value = headerLine.slice(colonIndex + 1).trim();
      headers.push({ key, value, enabled: true });
    }
  }

  // 4. Extract body (-d, --data, --data-raw)
  const bodyMatch = cleaned.match(/(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/);
  if (bodyMatch) body = bodyMatch[1];

  // 5. Extract Basic Auth (-u user:pass)
  const basicMatch = cleaned.match(/-u\s+['"]?([^:]+):([^'"]+)['"]?/);
  if (basicMatch) {
    authType = 'basic';
    authData = { username: basicMatch[1], password: basicMatch[2] };
  }

  // 6. Extract Bearer token (Authorization: Bearer ...)
  const bearerHeader = headers.find(h => h.key.toLowerCase() === 'authorization' && h.value.toLowerCase().startsWith('bearer '));
  if (bearerHeader && authType === 'none') {
    authType = 'bearer';
    authData = { token: bearerHeader.value.slice(7).trim() };
    // remove the header because it's now represented by auth
    headers = headers.filter(h => h !== bearerHeader);
  }

  // 7. Parse query params from URL
  const queryParams = parseQueryString(url);

  // 8. Clean URL (remove query string) for the main url field
  const baseUrl = url.split('?')[0];

  return {
    method,
    url: baseUrl,
    queryParams,
    headers,
    body,
    authType,
    authData,
  };
}

// ----------------------------------------------------------------------
// cURL Generator (empty string if no URL)
// ----------------------------------------------------------------------
function generateCurl(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) {
    return ''; // empty, placeholder will show
  }

  // Build full URL with query params
  let fullUrl = url;
  if (queryParams && queryParams.length > 0) {
    const validParams = queryParams.filter(p => p.key && p.key.trim());
    if (validParams.length > 0) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let curl = `curl -X ${method || 'GET'} '${fullUrl}'`;

  // Add custom headers
  if (headers && Array.isArray(headers)) {
    headers.forEach(header => {
      if (header.key && header.key.trim()) {
        curl += ` \\\n  -H '${header.key}: ${header.value || ''}'`;
      }
    });
  }

  // Add auth headers
  if (authType === 'bearer' && authData?.token) {
    curl += ` \\\n  -H 'Authorization: Bearer ${authData.token}'`;
  } else if (authType === 'basic' && authData?.username) {
    const credentials = `${authData.username}:${authData.password || ''}`;
    const encoded = btoa(credentials);
    curl += ` \\\n  -H 'Authorization: Basic ${encoded}'`;
  } else if (authType === 'apikey' && authData?.key && authData?.value) {
    if (authData.in === 'header') {
      curl += ` \\\n  -H '${authData.key}: ${authData.value}'`;
    }
  }

  // Add body for POST/PUT/PATCH
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body && body.trim()) {
    const escapedBody = body.replace(/'/g, "'\\\\''");
    curl += ` \\\n  -d '${escapedBody}'`;
  }

  return curl;
}

export default function CodeSnippetPanel({
  className,
  method,
  url,
  queryParams = [],
  headers,
  body,
  authType,
  authData,
  onRequestUpdate,   // callback to update the request from cURL edit
}) {
  const [curlText, setCurlText] = useState('');
  const [copied, setCopied] = useState(false);
  const isInternalUpdate = useRef(false);

  // Generate cURL from props when they change (unless it's an internal update)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const newCurl = generateCurl(method, url, queryParams, headers, body, authType, authData);
    setCurlText(newCurl);
  }, [method, url, queryParams, headers, body, authType, authData]);

  // Handle cURL text change
  const handleCurlChange = useCallback(
    (e) => {
      const newCurl = e.target.value;
      setCurlText(newCurl);

      // Parse the new cURL and update the request
      const parsed = parseCurlToRequest(newCurl);
      if (parsed && onRequestUpdate) {
        isInternalUpdate.current = true;
        onRequestUpdate(parsed);
      }
    },
    [onRequestUpdate]
  );

  const handleCopy = () => {
    if (curlText) {
      navigator.clipboard.writeText(curlText);
      setCopied(true);
      toast.success('cURL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info('Nothing to copy yet');
    }
  };

  return (
    <aside
      className={clsx(
        'w-80 min-w-[18rem] max-w-[20rem] border-l border-dark-700 flex flex-col flex-shrink-0 min-h-0 overflow-hidden',
        className
      )}
    >
      <div className="p-3.5 border-b border-dark-700 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary text-sm font-semibold leading-none">&lt;/&gt;</span>
          <h3 className="text-sm font-semibold text-white">Code snippet</h3>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
          title="Copy"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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
        <div className="flex-1 min-h-0 rounded-md border border-dark-700 overflow-hidden">
          <textarea
            value={curlText}
            onChange={handleCurlChange}
            placeholder="Execute a request to see the cURL command, or paste a cURL command here to populate the request"
            className="w-full h-full p-4 text-xs font-mono text-gray-400  resize-none focus:outline-none focus:ring-0 leading-relaxed custom-scrollbar"
            spellCheck={false}
          />
        </div>
      </div>
    </aside>
  );
}