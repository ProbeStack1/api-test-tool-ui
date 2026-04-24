// utils/ImportFileParser.js

export const extractPath = (url) => {
  if (!url) return '/';

  // If it's a string
  if (typeof url === 'string') {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch (e) {
      // If it's just a path (starts with /), return it
      if (url.startsWith('/')) return url;
      // Otherwise, assume it's a relative path
      return `/${url}`;
    }
  }

  // If it's an object (Postman URL format)
  if (typeof url === 'object') {
    // Postman URL object can have 'path' as an array
    if (url.path && Array.isArray(url.path)) {
      // Join path segments, ensure leading slash
      const path = '/' + url.path.join('/');
      return path;
    }
    // If there's a 'raw' string, use that
    if (url.raw && typeof url.raw === 'string') {
      try {
        const urlObj = new URL(url.raw);
        return urlObj.pathname;
      } catch {
        if (url.raw.startsWith('/')) return url.raw;
        return `/${url.raw}`;
      }
    }
  }

  return '/';
};

// ✅ FIX: Accept the whole item (which contains both request and response)
const extractResponseExample = (item) => {
  // In Postman v2.1, response is at the same level as request
  if (!item.response || !Array.isArray(item.response) || item.response.length === 0) return null;
  
  // Prefer 200/201 responses, otherwise take the first
  const example = item.response.find(r => r.status === '200' || r.status === '201') || item.response[0];
  if (!example || !example.body) return null;
  
  let body = example.body;
  try {
    if (typeof body === 'string') body = JSON.parse(body);
    body = JSON.stringify(body, null, 2);
  } catch(e) {
    // If parsing fails, keep the raw string
  }
  
  return {
    statusCode: parseInt(example.status, 10) || 200,
    body: body || '{}',
  };
};

export const parsePostmanToEndpoints = (postmanJson) => {
  const endpoints = [];
  
  const traverse = (item) => {
    if (item.request) {
      const req = item.request;
      const path = extractPath(req.url);
      const method = (req.method || 'GET').toUpperCase();
      
      let requestBody = '';
      if (req.body && req.body.raw) requestBody = req.body.raw;
      
      let responseBody = '{}';
      let statusCode = 200;
      
      // ✅ Pass the whole item, not just req
      const example = extractResponseExample(item);
      if (example) {
        statusCode = example.statusCode;
        responseBody = example.body;
      }
      
      endpoints.push({
        id: `import-${Date.now()}-${Math.random()}`,
        method,
        path,
        statusCode,
        responseBody,
        requestBodySample: requestBody,
        validationMode: 'NONE',
        validateMethod: true,
        delayMs: 0,
        showRequestBody: !!requestBody,
      });
    } else if (item.item && Array.isArray(item.item)) {
      item.item.forEach(sub => traverse(sub));
    }
  };
  
  (postmanJson.item || []).forEach(traverse);
  return endpoints;
};