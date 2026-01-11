// Script execution utility for Pre-request and Test scripts
// Mimics Postman's pm object for script execution

export const createPmObject = (context = {}) => {
  const variables = new Map();
  const env = new Map();
  
  return {
    // Environment variables
    environment: {
      set: (key, value) => {
        env.set(key, value);
        context.environment = context.environment || {};
        context.environment[key] = value;
      },
      get: (key) => {
        return env.get(key) || context.environment?.[key] || null;
      },
      unset: (key) => {
        env.delete(key);
        if (context.environment) {
          delete context.environment[key];
        }
      },
      toObject: () => {
        return Object.fromEntries(env);
      }
    },
    
    // Variables
    variables: {
      set: (key, value) => {
        variables.set(key, value);
        context.variables = context.variables || {};
        context.variables[key] = value;
      },
      get: (key) => {
        return variables.get(key) || context.variables?.[key] || null;
      },
      unset: (key) => {
        variables.delete(key);
        if (context.variables) {
          delete context.variables[key];
        }
      },
      toObject: () => {
        return Object.fromEntries(variables);
      }
    },
    
    // Request (for pre-request scripts)
    request: {
      url: context.url || {},
      method: context.method || 'GET',
      headers: context.headers || {},
      body: context.body || {}
    },
    
    // Response (for test scripts)
    response: context.response ? {
      code: context.response.status,
      status: context.response.statusText,
      headers: context.response.headers || {},
      json: () => {
        try {
          return typeof context.response.data === 'string' 
            ? JSON.parse(context.response.data)
            : context.response.data;
        } catch {
          return {};
        }
      },
      text: () => {
        return typeof context.response.data === 'string'
          ? context.response.data
          : JSON.stringify(context.response.data);
      },
      to: {
        have: {
          status: (code) => {
            return context.response.status === code;
          }
        }
      }
    } : null,
    
    // Test assertions
    test: (name, fn) => {
      try {
        fn();
        context.testResults = context.testResults || [];
        context.testResults.push({ name, passed: true, error: null });
      } catch (error) {
        context.testResults = context.testResults || [];
        context.testResults.push({ name, passed: false, error: error.message });
      }
    },
    
    // Console logging (for debugging)
    console: {
      log: (...args) => console.log('[Script]', ...args),
      error: (...args) => console.error('[Script Error]', ...args),
      warn: (...args) => console.warn('[Script Warning]', ...args)
    }
  };
};

export const executeScript = (script, context = {}) => {
  if (!script || !script.trim()) {
    return { success: true, error: null, testResults: [] };
  }

  const pm = createPmObject(context);
  const testResults = [];
  context.testResults = testResults;

  try {
    // Create a function that has access to pm and common globals
    const scriptFunction = new Function(
      'pm',
      'console',
      `
      ${script}
    `
    );

    // Execute the script
    scriptFunction(pm, pm.console);
    
    return {
      success: true,
      error: null,
      testResults: testResults,
      environment: pm.environment.toObject(),
      variables: pm.variables.toObject()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      testResults: testResults,
      environment: pm.environment.toObject(),
      variables: pm.variables.toObject()
    };
  }
};

