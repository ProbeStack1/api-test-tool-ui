/**
 * ErrorAnalyzer.js
 * 
 * Utility module for analyzing API and JavaScript errors, and generating helpful messages.
 * Produces analysis text based on error status codes and details.
 * 
 * NOTE: All responses are currently static/dummy data.
 * When a real AI (e.g., ChatGPT) is integrated later, these functions
 * will be replaced with actual AI-generated responses.
 * 
 * Exported Functions:
 * - generateErrorAnalysis: Generates analysis for HTTP error codes (4xx, 5xx, network)
 * - analyzeJSError: Analyzes JavaScript runtime errors
 * - generateFollowUpResponse: Provides dummy follow-up responses for chat interactions
 */

/**
 * Generates an analysis of an API error based on status code and error details.
 * @param {Object} response - API response object (status, statusText, headers, body)
 * @param {Object} error - Error object (message, stack, etc.)
 * @param {Object} requestInfo - Request details (method, url, headers, body)
 * @returns {string} - Formatted analysis text with **bold** markers for markdown rendering
 */
export const generateErrorAnalysis = (response, error, requestInfo) => {
  const statusCode = response?.status || error?.status || 0;
  const errorMessage = error?.message || response?.statusText || 'Unknown error';
  const url = requestInfo?.url || 'N/A';
  const method = requestInfo?.method || 'GET';

  // ----- 4xx Client Errors -----
  if (statusCode >= 400 && statusCode < 500) {
    if (statusCode === 400) {
      return `**Validation Error (400 Bad Request)**\n\nThe server rejected your request due to invalid data.\n\n**Possible Causes:**\n• Required fields are missing from the request body\n• Data types are incorrect (e.g., sending a string where a number is expected)\n• Invalid JSON format\n\n**Quick Fixes:**\n• Check your request body - are all required fields present?\n• Verify the body format against the API documentation\n• Ensure the Content-Type header is set correctly (e.g., application/json)\n\n**Error Details:** ${errorMessage}\n**URL:** ${url}`;
    }
    if (statusCode === 401) {
      return `**Authentication Error (401 Unauthorized)**\n\nYour request was rejected - authentication is required.\n\n**Possible Causes:**\n• API key or token is missing\n• Token has expired\n• Authorization header format is incorrect\n\n**Quick Fixes:**\n• Add your token/API key in the Auth tab\n• Refresh your token if it has expired\n• Verify the header format: Authorization: Bearer <token>\n\n**URL:** ${url}`;
    }
    if (statusCode === 403) {
      return `**Forbidden Error (403)**\n\nYou do not have permission to access this resource.\n\n**Possible Causes:**\n• Your account roles/permissions are insufficient\n• The resource is restricted\n• Your IP is not whitelisted\n\n**Quick Fixes:**\n• Verify your account permissions\n• Request access from the API administrator\n• Ensure you are using the correct credentials\n\n**URL:** ${url}`;
    }
    if (statusCode === 404) {
      return `**Not Found Error (404)**\n\nThe requested resource does not exist or the URL is incorrect.\n\n**Possible Causes:**\n• The URL endpoint is wrong\n• The resource ID is incorrect\n• The API version is wrong\n\n**Quick Fixes:**\n• Double-check the URL\n• Verify the correct endpoint from API documentation\n• Confirm the resource ID\n\n**Your Request:** ${method} ${url}`;
    }
    if (statusCode === 405) {
      return `**Method Not Allowed (405)**\n\nThe ${method} method is not supported on this endpoint.\n\n**Quick Fixes:**\n• Use the correct HTTP method (GET/POST/PUT/DELETE)\n• Check the API documentation for allowed methods on this endpoint\n\n**Your Request:** ${method} ${url}`;
    }
    if (statusCode === 409) {
      return `**Conflict Error (409)**\n\nThe resource already exists or there is conflicting data.\n\n**Quick Fixes:**\n• Check if the resource has already been created\n• Verify unique fields (email, username, etc.)\n• Consider using PUT/UPDATE instead of POST/CREATE\n\n**URL:** ${url}`;
    }
    if (statusCode === 422) {
      return `**Unprocessable Entity (422)**\n\nThe data provided is not valid and could not be processed.\n\n**Quick Fixes:**\n• Check all required fields\n• Review data validation rules (min/max length, format, etc.)\n• Look at the response body for specific field errors\n\n**Error:** ${errorMessage}\n**URL:** ${url}`;
    }
    if (statusCode === 429) {
      return `**Rate Limit Exceeded (429)**\n\nToo many requests were sent - the rate limit has been exceeded.\n\n**Quick Fixes:**\n• Wait a few seconds/minutes before retrying\n• Add a delay between your requests\n• Check rate limit headers (X-RateLimit-*)\n• The Retry-After header will indicate how long to wait`;
    }
    // Generic 4xx
    return `**Client Error (${statusCode})**\n\nThere is an issue with your request.\n\n**Message:** ${errorMessage}\n\n**Quick Fixes:**\n• Review your request parameters\n• Check the API documentation\n• Verify the request body format\n\n**URL:** ${url}`;
  }

  // ----- 5xx Server Errors -----
  if (statusCode >= 500) {
    if (statusCode === 500) {
      return `**Internal Server Error (500)**\n\nSomething went wrong on the server - this is likely not your fault.\n\n**What to do:**\n• Wait a few seconds and retry\n• If the error persists, contact the API provider\n• Check the API service status page\n\n**Tip:** Server errors are usually temporary.`;
    }
    if (statusCode === 502) {
      return `**Bad Gateway (502)**\n\nCommunication between servers failed.\n\n**What to do:**\n• Wait 30-60 seconds and retry\n• Check the API service status page\n• This is usually a temporary issue`;
    }
    if (statusCode === 503) {
      return `**Service Unavailable (503)**\n\nThe server is temporarily down or under maintenance.\n\n**What to do:**\n• Wait and try again later\n• Check the API provider's status page\n• Look for a Retry-After header in the response`;
    }
    if (statusCode === 504) {
      return `**Gateway Timeout (504)**\n\nThe server did not respond in time.\n\n**What to do:**\n• Increase the request timeout setting\n• Simplify the request (reduce data payload)\n• Wait for the server load to decrease`;
    }
    return `**Server Error (${statusCode})**\n\nA server-side issue occurred.\n\n**Message:** ${errorMessage}\n\n**What to do:**\n• Wait and retry\n• Contact the API provider`;
  }

  // ----- Network/Connection Errors (no status code) -----
  return `**Network/Connection Error**\n\nUnable to connect to the server.\n\n**Possible Causes:**\n• Internet connection is down\n• Server is unreachable\n• CORS policy is blocking the request\n• Firewall or proxy issue\n• SSL/TLS certificate problem\n\n**Quick Fixes:**\n• Check your internet connection\n• Verify the server URL\n• Check the browser console (F12) for CORS errors\n• Review VPN/proxy settings\n\n**Error:** ${errorMessage}`;
};

/**
 * Analyzes a JavaScript runtime error and provides guidance.
 * @param {Error} error - JavaScript Error object
 * @returns {string} - Analysis text with guidance
 */
export const analyzeJSError = (error) => {
  const message = error?.message || 'Unknown JavaScript error';

  if (message.includes('TypeError')) {
    return `**JavaScript TypeError**\n\nA type-related error occurred in the code.\n\n**Common Causes:**\n• Performing operations on undefined variables\n• Accessing properties of null values\n• Passing wrong argument types to functions\n\n**Error:** ${message}`;
  }
  if (message.includes('ReferenceError')) {
    return `**JavaScript ReferenceError**\n\nA variable or function reference could not be found.\n\n**Common Causes:**\n• Variable was not declared\n• Typo in the variable name\n• Scope issue (variable not accessible)\n\n**Error:** ${message}`;
  }
  if (message.includes('SyntaxError')) {
    return `**JavaScript SyntaxError**\n\nThere is a syntax error in the code.\n\n**Error:** ${message}`;
  }
  if (message.includes('NetworkError') || message.includes('fetch')) {
    return `**Network Error (JavaScript)**\n\nAn API call failed.\n\n**Possible Causes:**\n• Server is down\n• CORS is blocking the request\n• URL is incorrect\n\n**Error:** ${message}`;
  }

  return `**JavaScript Error**\n\nAn unexpected error occurred.\n\n**Error:** ${message}\n\n**What to do:**\n• Check the browser console (F12) for the full stack trace\n• Revert any recent changes\n• Try to reproduce the error consistently`;
};

/**
 * Generates dummy follow-up responses for chat interaction mode.
 * When a real AI (ChatGPT) is integrated later, this function will be replaced.
 * 
 * @param {string} userMessage - The user's typed message
 * @param {string} context - Current context: 'error' (error analysis mode) or 'general' (normal chat)
 * @returns {string} - Dummy response text
 */
export const generateFollowUpResponse = (userMessage, context) => {
  const msg = userMessage.toLowerCase();

  // More specific responses when in error analysis context
  if (context === 'error') {
    if (msg.includes('detail') || msg.includes('explain') || msg.includes('more') || msg.includes('why')) {
      return `**Detailed Explanation:**\n\nLet's understand this error in detail:\n\n1. When you send a request, an HTTP connection is established between your browser and the server\n2. The server processes the request and sends back a response\n3. If something goes wrong, the server rejects the request with an error code\n\n**Debug Steps:**\n• Check the error details in the response body\n• Open the Debug Info tab for the full request/response cycle\n• Verify all headers - Content-Type, Authorization, etc.\n• Use the browser Network tab (F12) to inspect the actual request\n\nNeed anything else more specific?`;
    }
    if (msg.includes('fix') || msg.includes('solve') || msg.includes('how') || msg.includes('resolve')) {
      return `**Steps to resolve the issue:**\n\n1. Read the error message carefully\n2. Identify the status code (4xx = client issue, 5xx = server issue)\n3. Check your request configuration:\n   • Is the URL correct?\n   • Is the HTTP method correct? (GET/POST/PUT/DELETE)\n   • Are the headers set properly?\n   • Is the body format correct?\n4. Verify your authentication credentials\n5. Make sure environment variables are set correctly\n6. Compare your request against the API documentation\n\n**Pro Tip:** The Debug Info tab contains complete request/response details for troubleshooting.`;
    }
    if (msg.includes('retry') || msg.includes('again') || msg.includes('resend')) {
      return `**Want to retry?**\n\nTo resend the request:\n1. First fix the identified issue\n2. Click the Send button again\n3. If the same error occurs, try a different approach\n\n**Tip:** For 5xx and 429 errors, waiting briefly before retrying often helps.`;
    }
  }

  // General help responses (dummy - no real AI connected yet)
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hello! I'm your AI Assistant. Real-time AI integration is not available yet, but it's coming soon!\n\nIn the meantime, you can use Guide Mode for step-by-step instructions on every feature.`;
  }
  if (msg.includes('test') || msg.includes('testing')) {
    return `**About Testing:**\n\nYou can test your APIs in multiple ways:\n• Send individual requests\n• Run entire collections (functional test)\n• Run load tests (performance test)\n• Generate test cases with AI\n\nSelect "Performance Testing" in Guide Mode for detailed instructions.`;
  }
  if (msg.includes('help') || msg.includes('assist')) {
    return `**I can help you!**\n\nHere's what's currently available:\n• Guide Mode: Step-by-step instructions for every feature\n• Error Analysis: I automatically analyze API errors\n\nReal-time AI chat integration is coming soon - you'll be able to ask anything!\n\nFor now, try using Guide Mode for detailed instructions.`;
  }

  // Default response for unrecognized queries
  return `**Real-time AI Chatbot is not yet integrated.**\n\nYour message: "${userMessage}"\n\nFor now, you can:\n• Use Guide Mode for step-by-step instructions\n• When errors occur, I'll automatically analyze them and help\n\nReal-time ChatGPT integration is coming soon - then you'll be able to chat freely!\n\nWould you like to check Guide Mode for something specific?`;
};
