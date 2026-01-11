import axios from 'axios';
import { executeScript } from './scriptExecutor';

axios.interceptors.request.use((config) => {
    config.metadata = { startTime: new Date() }
    return config;
}, (error) => {
    return Promise.reject(error);
});

axios.interceptors.response.use((response) => {
    response.config.metadata.endTime = new Date()
    response.duration = response.config.metadata.endTime - response.config.metadata.startTime
    return response;
}, (error) => {
    if (error.config && error.config.metadata) {
        error.config.metadata.endTime = new Date();
        error.duration = error.config.metadata.endTime - error.config.metadata.startTime;
    }
    return Promise.reject(error);
});

const keyValuePairsToObject = (pairs) => {
    return pairs.reduce((acc, pair) => {
        if (pair.key) {
            acc[pair.key] = pair.value;
        }
        return acc;
    }, {});
};

// Apply authentication to headers/params
const applyAuth = (authType, authData, headers, params) => {
    const newHeaders = { ...headers };
    const newParams = { ...params };

    if (authType === 'bearer' && authData.token) {
        newHeaders['Authorization'] = `Bearer ${authData.token}`;
    } else if (authType === 'basic' && authData.username && authData.password) {
        const credentials = btoa(`${authData.username}:${authData.password}`);
        newHeaders['Authorization'] = `Basic ${credentials}`;
    } else if (authType === 'apikey' && authData.key && authData.value) {
        if (authData.addTo === 'header') {
            newHeaders[authData.key] = authData.value;
        } else {
            newParams[authData.key] = authData.value;
        }
    }

    return { headers: newHeaders, params: newParams };
};

export const sendRequest = async (requestDetails) => {
    let { url, method, queryParams, headers, body, authType, authData, preRequestScript } = requestDetails;

    // Convert array of pairs to object for script context
    let params = keyValuePairsToObject(queryParams);
    let headerObj = keyValuePairsToObject(headers);
    let requestBody = body;

    // Execute pre-request script if provided
    let preRequestResult = { environment: {}, variables: {} };
    if (preRequestScript) {
        try {
            preRequestResult = executeScript(preRequestScript, {
                url: { toString: () => url },
                method,
                headers: headerObj,
                body: requestBody,
                params
            });
            
            // Apply environment variables to headers/params/body if modified
            if (preRequestResult.environment) {
                Object.entries(preRequestResult.environment).forEach(([key, value]) => {
                    // Replace {{variable}} syntax in URL
                    if (typeof url === 'string') {
                        url = url.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                    }
                    // Replace in headers
                    Object.keys(headerObj).forEach(hKey => {
                        if (typeof headerObj[hKey] === 'string') {
                            headerObj[hKey] = headerObj[hKey].replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                        }
                    });
                });
            }
        } catch (e) {
            console.warn('Pre-request script error:', e);
        }
    }


    // Apply authentication
    if (authType && authType !== 'none') {
        const authResult = applyAuth(authType, authData || {}, headerObj, params);
        headerObj = authResult.headers;
        params = authResult.params;
    }

    let data;
    try {
        data = body ? JSON.parse(body) : undefined;
    } catch (e) {
        data = null; // Or handle invalid JSON
        // If body is plain text or raw, we might want to send it as is. 
        // For now assuming JSON.
    }

    try {
        const response = await axios({
            url,
            method,
            params,
            headers: headerObj,
            data,
            validateStatus: () => true // Don't throw on status >= 400
        });

        return {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            time: response.duration || 0,
            size: JSON.stringify(response.data).length + JSON.stringify(response.headers).length
        };
    } catch (error) {
        // Network errors, etc.
        throw {
            message: error.message,
            description: "Could not connect to the server."
        };
    }
}
