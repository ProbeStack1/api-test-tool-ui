import React, { useState, useEffect, useRef } from 'react';
import { Copy, ChevronDown, Check, Lock, Edit3 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
// cURL Parser (for editable cURL mode)
// ----------------------------------------------------------------------
function parseCurlToRequest(curlString) {
  if (!curlString.trim()) return null;
  let cleaned = curlString.replace(/\\\s*\n/g, ' ').trim();
  let method = 'GET';
  let url = '';
  let headers = [];
  let body = '';
  let authType = 'none';
  let authData = {};

  const methodMatch = cleaned.match(/-X\s+([A-Z]+)/i) || cleaned.match(/--request\s+([A-Z]+)/i);
  if (methodMatch) method = methodMatch[1].toUpperCase();

  const urlMatch = cleaned.match(/(?:-X\s+[A-Z]+\s+)?(https?:\/\/[^\s'"]+)/i) ||
                   cleaned.match(/(?:-X\s+[A-Z]+\s+)?(['"])(https?:\/\/[^\1]+?)\1/i);
  if (urlMatch) url = urlMatch[2] || urlMatch[1];

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

  const bodyMatch = cleaned.match(/(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/);
  if (bodyMatch) body = bodyMatch[1];

  const basicMatch = cleaned.match(/-u\s+['"]?([^:]+):([^'"]+)['"]?/);
  if (basicMatch) {
    authType = 'basic';
    authData = { username: basicMatch[1], password: basicMatch[2] };
  }

  const bearerHeader = headers.find(h => h.key.toLowerCase() === 'authorization' && h.value.toLowerCase().startsWith('bearer '));
  if (bearerHeader && authType === 'none') {
    authType = 'bearer';
    authData = { token: bearerHeader.value.slice(7).trim() };
    headers = headers.filter(h => h !== bearerHeader);
  }

  const queryParams = parseQueryString(url);
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
// Postman CLI Parser (for editable Postman CLI mode)
// ----------------------------------------------------------------------
function parsePostmanCliToRequest(cmdString) {
  if (!cmdString.trim()) return null;
  const cleaned = cmdString.trim();
  let method = 'GET';
  let url = '';
  let headers = [];
  let body = '';

  const methodMatch = cleaned.match(/--method\s+([A-Z]+)/i);
  if (methodMatch) method = methodMatch[1].toUpperCase();

  const urlMatch = cleaned.match(/--url\s+'([^']+)'/);
  if (urlMatch) url = urlMatch[1];

  const headerRegex = /--header\s+'([^']+)'/g;
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

  const bodyMatch = cleaned.match(/--body\s+'([^']+)'/);
  if (bodyMatch) body = bodyMatch[1];

  if (!url) return null;

  const queryParams = parseQueryString(url);
  const baseUrl = url.split('?')[0];

  let authType = 'none';
  let authData = {};
  const authHeader = headers.find(h => h.key.toLowerCase() === 'authorization');
  if (authHeader) {
    const authValue = authHeader.value;
    if (authValue.toLowerCase().startsWith('bearer ')) {
      authType = 'bearer';
      authData = { token: authValue.slice(7).trim() };
      headers = headers.filter(h => h !== authHeader);
    } else if (authValue.toLowerCase().startsWith('basic ')) {
      authType = 'basic';
      try {
        const decoded = atob(authValue.slice(6).trim());
        const colonIndex = decoded.indexOf(':');
        if (colonIndex !== -1) {
          authData = { username: decoded.slice(0, colonIndex), password: decoded.slice(colonIndex + 1) };
        }
      } catch (e) {}
      headers = headers.filter(h => h !== authHeader);
    }
  }

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

// =============================================================================
//  IMPROVED CODE GENERATORS (with manual line breaks)
// =============================================================================

// ----------------------------------------------------------------------
// 1. cURL – each header on a new line
// ----------------------------------------------------------------------
function generateCurl(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let curl = `curl -X ${method || 'GET'} '${fullUrl}'`;

  const addHeader = (key, value) => {
    curl += ` \\\n  -H '${key}: ${value || ''}'`;
  };

  (headers || []).forEach(header => {
    if (header.key?.trim()) addHeader(header.key, header.value);
  });

  if (authType === 'bearer' && authData?.token) {
    addHeader('Authorization', `Bearer ${authData.token}`);
  } else if (authType === 'basic' && authData?.username) {
    const credentials = `${authData.username}:${authData.password || ''}`;
    const encoded = btoa(credentials);
    addHeader('Authorization', `Basic ${encoded}`);
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    addHeader(authData.key, authData.value);
  }

  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    const escapedBody = body.replace(/'/g, "'\\\\''");
    curl += ` \\\n  -d '${escapedBody}'`;
  }

  return curl;
}

// ----------------------------------------------------------------------
// 2. Postman CLI – each header on a new line
// ----------------------------------------------------------------------
function generatePostmanCli(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let cmd = `postman request send --method ${method || 'GET'} --url '${fullUrl}'`;

  const addHeader = (key, value) => {
    cmd += ` \\\n  --header '${key}: ${value || ''}'`;
  };

  (headers || []).forEach(header => {
    if (header.key?.trim()) addHeader(header.key, header.value);
  });

  if (authType === 'bearer' && authData?.token) {
    addHeader('Authorization', `Bearer ${authData.token}`);
  } else if (authType === 'basic' && authData?.username) {
    const credentials = `${authData.username}:${authData.password || ''}`;
    const encoded = btoa(credentials);
    addHeader('Authorization', `Basic ${encoded}`);
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    addHeader(authData.key, authData.value);
  }

  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    const escapedBody = body.replace(/'/g, "'\\\\''");
    cmd += ` \\\n  --body '${escapedBody}'`;
  }

  return cmd;
}

// ----------------------------------------------------------------------
// 3. JavaScript (fetch) – unchanged
// ----------------------------------------------------------------------
function generateFetch(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  const requestHeaders = {};
  (headers || []).forEach(h => { if (h.key?.trim()) requestHeaders[h.key] = h.value || ''; });

  if (authType === 'bearer' && authData?.token) {
    requestHeaders['Authorization'] = `Bearer ${authData.token}`;
  } else if (authType === 'basic' && authData?.username) {
    const credentials = `${authData.username}:${authData.password || ''}`;
    requestHeaders['Authorization'] = `Basic ${btoa(credentials)}`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    requestHeaders[authData.key] = authData.value;
  }

  const fetchOptions = { method: method || 'GET', headers: requestHeaders };
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    fetchOptions.body = body;
    if (!requestHeaders['Content-Type']) requestHeaders['Content-Type'] = 'application/json';
  }

  return `fetch('${fullUrl}', ${JSON.stringify(fetchOptions, null, 2)})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error('Error:', error));`;
}

// ----------------------------------------------------------------------
// 4. JavaScript (jQuery.ajax) – unchanged
// ----------------------------------------------------------------------
function generateJQuery(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  const requestHeaders = {};
  (headers || []).forEach(h => { if (h.key?.trim()) requestHeaders[h.key] = h.value || ''; });

  if (authType === 'bearer' && authData?.token) {
    requestHeaders['Authorization'] = `Bearer ${authData.token}`;
  } else if (authType === 'basic' && authData?.username) {
    const credentials = `${authData.username}:${authData.password || ''}`;
    requestHeaders['Authorization'] = `Basic ${btoa(credentials)}`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    requestHeaders[authData.key] = authData.value;
  }

  let dataProp = '';
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    dataProp = `,\n  data: ${body}`;
  }

  return `$.ajax({\n  url: '${fullUrl}',\n  type: '${method || 'GET'}',\n  headers: ${JSON.stringify(requestHeaders, null, 2)}${dataProp}\n})`;
}

// ----------------------------------------------------------------------
// 5. Node.js (axios) – unchanged
// ----------------------------------------------------------------------
function generateNodeAxios(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let node = `const axios = require('axios');\n\nconst config = {\n  method: '${method || 'GET'}',\n  url: '${fullUrl}',\n  headers: {\n`;
  (headers || []).forEach(h => {
    if (h.key?.trim()) node += `    '${h.key}': '${h.value || ''}',\n`;
  });
  if (authType === 'bearer' && authData?.token) {
    node += `    'Authorization': 'Bearer ${authData.token}',\n`;
  } else if (authType === 'basic' && authData?.username) {
    const credentials = `${authData.username}:${authData.password || ''}`;
    node += `    'Authorization': 'Basic ${btoa(credentials)}',\n`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    node += `    '${authData.key}': '${authData.value}',\n`;
  }
  node += `  },\n`;
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    node += `  data: ${body},\n`;
  }
  node += `};\n\naxios(config)\n  .then(response => console.log(response.data))\n  .catch(error => console.error(error));`;
  return node;
}

// ----------------------------------------------------------------------
// 6. Python (requests) – unchanged
// ----------------------------------------------------------------------
function generatePython(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let python = `import requests\n\nurl = "${fullUrl}"\npayload = ${body ? JSON.stringify(body, null, 2) : '{}'}\nheaders = {\n`;
  (headers || []).forEach(h => {
    if (h.key?.trim()) python += `    "${h.key}": "${h.value || ''}",\n`;
  });
  if (authType === 'bearer' && authData?.token) {
    python += `    "Authorization": "Bearer ${authData.token}",\n`;
  } else if (authType === 'basic' && authData?.username) {
    const credentials = `${authData.username}:${authData.password || ''}`;
    python += `    "Authorization": "Basic ${btoa(credentials)}",\n`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    python += `    "${authData.key}": "${authData.value}",\n`;
  }
  python += `}\n\n`;
  if (method === 'GET') python += `response = requests.get(url, headers=headers)\n`;
  else if (method === 'POST') python += `response = requests.post(url, headers=headers, json=payload)\n`;
  else if (method === 'PUT') python += `response = requests.put(url, headers=headers, json=payload)\n`;
  else if (method === 'DELETE') python += `response = requests.delete(url, headers=headers)\n`;
  else if (method === 'PATCH') python += `response = requests.patch(url, headers=headers, json=payload)\n`;
  else python += `response = requests.request("${method}", url, headers=headers, json=payload)\n`;
  python += `\nprint(response.status_code)\nprint(response.json())`;
  return python;
}

// ----------------------------------------------------------------------
// 7. HTTPie – unchanged
// ----------------------------------------------------------------------
function generateHttpie(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let httpie = `http ${method.toLowerCase()} "${fullUrl}"`;
  (headers || []).forEach(h => {
    if (h.key?.trim()) httpie += ` "${h.key}:${h.value || ''}"`;
  });
  if (authType === 'bearer' && authData?.token) {
    httpie += ` "Authorization:Bearer ${authData.token}"`;
  } else if (authType === 'basic' && authData?.username) {
    httpie += ` --auth ${authData.username}:${authData.password || ''}`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    httpie += ` "${authData.key}:${authData.value}"`;
  }
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    httpie += ` <<< '${body.replace(/'/g, "'\\''")}'`;
  }
  return httpie;
}

// ----------------------------------------------------------------------
// 8. Java (OkHttp) – unchanged
// ----------------------------------------------------------------------
function generateJavaOkHttp(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let java = `// Add dependency: com.squareup.okhttp3:okhttp:4.12.0\nimport okhttp3.*;\nimport java.io.IOException;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        OkHttpClient client = new OkHttpClient();\n\n        MediaType mediaType = MediaType.parse("application/json");\n        RequestBody requestBody = ${body ? `RequestBody.create(mediaType, ${JSON.stringify(body)})` : "null"};\n        Request.Builder requestBuilder = new Request.Builder()\n                .url("${fullUrl}")\n                .method("${method || 'GET'}", requestBody);\n`;
  (headers || []).forEach(h => {
    if (h.key?.trim()) java += `        requestBuilder.addHeader("${h.key}", "${h.value || ''}");\n`;
  });
  if (authType === 'bearer' && authData?.token) {
    java += `        requestBuilder.addHeader("Authorization", "Bearer ${authData.token}");\n`;
  } else if (authType === 'basic' && authData?.username) {
    java += `        requestBuilder.addHeader("Authorization", Credentials.basic("${authData.username}", "${authData.password || ''}"));\n`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    java += `        requestBuilder.addHeader("${authData.key}", "${authData.value}");\n`;
  }
  java += `        Request request = requestBuilder.build();\n\n        try (Response response = client.newCall(request).execute()) {\n            System.out.println(response.code());\n            System.out.println(response.body().string());\n        }\n    }\n}`;
  return java;
}

// ----------------------------------------------------------------------
// 9. Java (Unirest) – unchanged
// ----------------------------------------------------------------------
function generateJavaUnirest(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let java = `// Add dependency: com.konghq:unirest-java:3.14.5\nimport kong.unirest.Unirest;\nimport kong.unirest.HttpResponse;\n\npublic class Main {\n    public static void main(String[] args) {\n        HttpResponse<String> response = Unirest.${method.toLowerCase()}("${fullUrl}")\n`;
  (headers || []).forEach(h => {
    if (h.key?.trim()) java += `            .header("${h.key}", "${h.value || ''}")\n`;
  });
  if (authType === 'bearer' && authData?.token) {
    java += `            .header("Authorization", "Bearer ${authData.token}")\n`;
  } else if (authType === 'basic' && authData?.username) {
    java += `            .basicAuth("${authData.username}", "${authData.password || ''}")\n`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    java += `            .header("${authData.key}", "${authData.value}")\n`;
  }
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    java += `            .body(${body})\n`;
  }
  java += `            .asString();\n        System.out.println(response.getStatus());\n        System.out.println(response.getBody());\n    }\n}`;
  return java;
}

// ----------------------------------------------------------------------
// 10. Java (HttpURLConnection) – unchanged
// ----------------------------------------------------------------------
function generateJavaHttpUrlConnection(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let java = `import java.io.*;\nimport java.net.HttpURLConnection;\nimport java.net.URL;\nimport java.util.Base64;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        URL url = new URL("${fullUrl}");\n        HttpURLConnection conn = (HttpURLConnection) url.openConnection();\n        conn.setRequestMethod("${method || 'GET'}");\n`;
  (headers || []).forEach(h => {
    if (h.key?.trim()) java += `        conn.setRequestProperty("${h.key}", "${h.value || ''}");\n`;
  });
  if (authType === 'bearer' && authData?.token) {
    java += `        conn.setRequestProperty("Authorization", "Bearer ${authData.token}");\n`;
  } else if (authType === 'basic' && authData?.username) {
    java += `        String auth = "${authData.username}:${authData.password || ''}";\n        String encoded = Base64.getEncoder().encodeToString(auth.getBytes());\n        conn.setRequestProperty("Authorization", "Basic " + encoded);\n`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    java += `        conn.setRequestProperty("${authData.key}", "${authData.value}");\n`;
  }
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    java += `        conn.setDoOutput(true);\n        try (OutputStream os = conn.getOutputStream()) {\n            byte[] input = ${JSON.stringify(body)}.getBytes("utf-8");\n            os.write(input, 0, input.length);\n        }\n`;
  }
  java += `        int responseCode = conn.getResponseCode();\n        System.out.println(responseCode);\n        BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));\n        String line;\n        while ((line = br.readLine()) != null) {\n            System.out.println(line);\n        }\n        conn.disconnect();\n    }\n}`;
  return java;
}

// ----------------------------------------------------------------------
// 11. Node.js (native http) – unchanged
// ----------------------------------------------------------------------
function generateNodeHttp(method, url, queryParams, headers, body, authType, authData) {
  if (!url || !url.trim()) return '';

  let fullUrl = url;
  if (queryParams?.length) {
    const validParams = queryParams.filter(p => p.key?.trim());
    if (validParams.length) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl = `${url}?${queryString}`;
    }
  }

  let parsedUrl;
  try { parsedUrl = new URL(fullUrl); } catch { return ''; }
  const isHttps = parsedUrl.protocol === 'https:';
  const moduleName = isHttps ? 'https' : 'http';

  let node = `const ${moduleName} = require('${moduleName}');\n\nconst options = {\n  hostname: '${parsedUrl.hostname}',\n  port: ${parsedUrl.port || (isHttps ? 443 : 80)},\n  path: '${parsedUrl.pathname + parsedUrl.search}',\n  method: '${method || 'GET'}',\n  headers: {\n`;
  (headers || []).forEach(h => {
    if (h.key?.trim()) node += `    '${h.key}': '${h.value || ''}',\n`;
  });
  if (authType === 'bearer' && authData?.token) {
    node += `    'Authorization': 'Bearer ${authData.token}',\n`;
  } else if (authType === 'basic' && authData?.username) {
    const authString = `${authData.username}:${authData.password || ''}`;
    const encoded = btoa(authString);
    node += `    'Authorization': 'Basic ${encoded}',\n`;
  } else if (authType === 'apikey' && authData?.key && authData?.value && authData.in === 'header') {
    node += `    '${authData.key}': '${authData.value}',\n`;
  }
  node += `  }\n};\n\n`;
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body?.trim()) {
    node += `const req = ${moduleName}.request(options, (res) => {\n  let data = '';\n  res.on('data', chunk => data += chunk);\n  res.on('end', () => console.log(data));\n});\nreq.write(${JSON.stringify(body)});\nreq.end();\n`;
  } else {
    node += `${moduleName}.request(options, (res) => {\n  let data = '';\n  res.on('data', chunk => data += chunk);\n  res.on('end', () => console.log(data));\n}).end();\n`;
  }
  return node;
}

// =============================================================================
// Helper: get language for syntax highlighter
// =============================================================================
function getSyntaxLanguage(selectedLang) {
  const map = {
    'curl': 'bash',
    'postman': 'bash',
    'javascript-fetch': 'javascript',
    'javascript-jquery': 'javascript',
    'node-axios': 'javascript',
    'node-http': 'javascript',
    'python': 'python',
    'httpie': 'bash',
    'java-okhttp': 'java',
    'java-unirest': 'java',
    'java-httpurlconnection': 'java',
  };
  return map[selectedLang] || 'text';
}

// ----------------------------------------------------------------------
// Custom wrapper styles for forcing word wrap
// ----------------------------------------------------------------------
const codeWrapperStyles = `
  .code-wrap-container pre {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  .code-wrap-container pre code {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  .code-wrap-container pre code span {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    word-break: break-word !important;
  }
`;

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function CodeSnippetPanel({
  className,
  method,
  url,
  queryParams = [],
  headers,
  body,
  authType,
  authData,
  onRequestUpdate,
}) {
  const [selectedLang, setSelectedLang] = useState('curl');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [snippetText, setSnippetText] = useState('');
  const [copyStatus, setCopyStatus] = useState(null);
  const isInternalUpdate = useRef(false);
  const textareaRef = useRef(null);
  const highlighterRef = useRef(null);

  const languages = [
    { value: 'curl', label: 'cURL' },
    { value: 'postman', label: 'Postman CLI' },
    { value: 'javascript-fetch', label: 'JavaScript (fetch)' },
    { value: 'javascript-jquery', label: 'JavaScript (jQuery)' },
    { value: 'node-axios', label: 'Node.js (axios)' },
    { value: 'node-http', label: 'Node.js (native http)' },
    { value: 'python', label: 'Python (requests)' },
    { value: 'httpie', label: 'HTTPie' },
    { value: 'java-okhttp', label: 'Java (OkHttp)' },
    { value: 'java-unirest', label: 'Java (Unirest)' },
    { value: 'java-httpurlconnection', label: 'Java (HttpURLConnection)' },
  ];

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate snippet when props or language changes
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    let newSnippet = '';
    switch (selectedLang) {
      case 'curl': newSnippet = generateCurl(method, url, queryParams, headers, body, authType, authData); break;
      case 'postman': newSnippet = generatePostmanCli(method, url, queryParams, headers, body, authType, authData); break;
      case 'javascript-fetch': newSnippet = generateFetch(method, url, queryParams, headers, body, authType, authData); break;
      case 'javascript-jquery': newSnippet = generateJQuery(method, url, queryParams, headers, body, authType, authData); break;
      case 'node-axios': newSnippet = generateNodeAxios(method, url, queryParams, headers, body, authType, authData); break;
      case 'node-http': newSnippet = generateNodeHttp(method, url, queryParams, headers, body, authType, authData); break;
      case 'python': newSnippet = generatePython(method, url, queryParams, headers, body, authType, authData); break;
      case 'httpie': newSnippet = generateHttpie(method, url, queryParams, headers, body, authType, authData); break;
      case 'java-okhttp': newSnippet = generateJavaOkHttp(method, url, queryParams, headers, body, authType, authData); break;
      case 'java-unirest': newSnippet = generateJavaUnirest(method, url, queryParams, headers, body, authType, authData); break;
      case 'java-httpurlconnection': newSnippet = generateJavaHttpUrlConnection(method, url, queryParams, headers, body, authType, authData); break;
      default: newSnippet = '';
    }
    setSnippetText(newSnippet);
  }, [selectedLang, method, url, queryParams, headers, body, authType, authData]);

  const handleSnippetChange = (e) => {
    const newText = e.target.value;
    setSnippetText(newText);
    if (selectedLang === 'curl') {
      const parsed = parseCurlToRequest(newText);
      if (parsed && onRequestUpdate) {
        isInternalUpdate.current = true;
        onRequestUpdate(parsed);
      }
    } else if (selectedLang === 'postman') {
      const parsed = parsePostmanCliToRequest(newText);
      if (parsed && onRequestUpdate) {
        isInternalUpdate.current = true;
        onRequestUpdate(parsed);
      }
    }
  };

  const handleCopy = () => {
    if (snippetText && snippetText.trim()) {
      navigator.clipboard.writeText(snippetText);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(null), 2000);
    } else {
      toast.info('Nothing to copy yet');
    }
  };

  const handleScroll = (e) => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const isEditable = selectedLang === 'curl' || selectedLang === 'postman';

  return (
    <aside
      className={clsx(
        'w-80 min-w-[18rem] max-w-[20rem] border-l border-dark-700 flex flex-col flex-shrink-0 min-h-0 overflow-hidden bg-probestack-bg',
        className
      )}
    >
      <style>{codeWrapperStyles}</style>

      {/* Header */}
      <div className="p-4.5 border-b border-dark-700 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary text-sm font-semibold leading-none">&lt;/&gt;</span>
          <h3 className="text-xs font-semibold text-white">Code snippet</h3>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Toolbar: Dropdown (fixed width) + status + copy icon */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          {/* Language dropdown - fixed width */}
          <div className="relative w-40" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full border border-dark-700 rounded-lg text-sm text-gray-300 py-2 pl-3 pr-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer flex items-center justify-between"
            >
              <span className="truncate">{languages.find(l => l.value === selectedLang)?.label}</span>
              <ChevronDown className={clsx('w-4 h-4 text-gray-500 transition-transform shrink-0', isDropdownOpen && 'rotate-180')} />
            </button>
            {isDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {languages.map((lang) => (
                  <div
                    key={lang.value}
                    onClick={() => {
                      setSelectedLang(lang.value);
                      setIsDropdownOpen(false);
                    }}
                    className={clsx(
                      'flex items-center justify-between px-3 py-1 text-xs cursor-pointer hover:bg-dark-700 whitespace-nowrap',
                      selectedLang === lang.value ? 'bg-primary/10 text-primary' : 'text-gray-300'
                    )}
                  >
                    <span>{lang.label}</span>
                    {selectedLang === lang.value && <Check className="w-3.5 h-3.5 text-primary ml-2 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editable/Read-only indicator - plain text */}
          <div className="text-xs text-gray-400 px-2">
            {isEditable ? 'Editable' : 'Read-only'}
          </div>

          {/* Copy button - icon only */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors ml-auto"
            title="Copy"
          >
            {copyStatus === 'copied' ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Code display area */}
        <div className="flex-1 min-h-0 rounded-md border border-dark-700 overflow-hidden relative bg-probestack-bg code-wrap-container">
          {isEditable ? (
            <div className="relative h-full w-full overflow-hidden">
              {/* Syntax highlighter layer */}
              <div
                ref={highlighterRef}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden pointer-events-none"
                aria-hidden="true"
              >
                <SyntaxHighlighter
                  language={getSyntaxLanguage(selectedLang)}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    fontSize: '0.75rem',
                    lineHeight: '1.6',
                    minHeight: '100%',
                    overflow: 'visible',
                  }}
                  codeTagProps={{
                    style: {
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }
                  }}
                  wrapLongLines={true}
                >
                  {snippetText || ' '}
                </SyntaxHighlighter>
              </div>
              {/* Textarea layer */}
              <textarea
                ref={textareaRef}
                value={snippetText}
                onChange={handleSnippetChange}
                onScroll={handleScroll}
                className="absolute inset-0 w-full h-full p-4 text-xs font-mono resize-none focus:outline-none focus:ring-0 leading-relaxed bg-transparent caret-white overflow-y-auto overflow-x-hidden"
                style={{
                  color: 'transparent',
                  caretColor: 'white',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
                spellCheck={false}
                placeholder={
                  selectedLang === 'curl'
                    ? 'Paste cURL command here...'
                    : 'Paste Postman CLI command here...'
                }
              />
            </div>
          ) : (
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <SyntaxHighlighter
                language={getSyntaxLanguage(selectedLang)}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.75rem',
                  lineHeight: '1.6',
                  minHeight: '100%',
                  overflow: 'visible',
                }}
                codeTagProps={{
                  style: {
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }
                }}
                wrapLongLines={true}
              >
                {snippetText || ' '}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}