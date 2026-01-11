import React from 'react';

export default function AuthPanel({ authType = 'none', onAuthTypeChange, authData = {}, onAuthDataChange }) {
    const handleFieldChange = (field, value) => {
        const newData = { ...authData, [field]: value };
        onAuthDataChange && onAuthDataChange(newData);
    };

    return (
        <div className="flex gap-4">
            <div className="w-40 flex flex-col gap-2 shrink-0 border-r border-dark-700 pr-4">
                <label className="text-xs font-medium text-gray-400">Type</label>
                <select 
                    value={authType} 
                    onChange={(e) => onAuthTypeChange && onAuthTypeChange(e.target.value)}
                    className="w-full bg-dark-900/50 border border-dark-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50"
                >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apikey">API Key</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                    Authorization header will be automatically generated.
                </p>
            </div>
            <div className="flex-1">
                {authType === 'none' && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                        <p className="text-xs text-gray-400">No authorization configured</p>
                    </div>
                )}
                
                {authType === 'bearer' && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Token</label>
                            <input
                                type="text"
                                value={authData.token || ''}
                                onChange={(e) => handleFieldChange('token', e.target.value)}
                                placeholder="Enter Bearer token"
                                className="w-full bg-dark-900/50 border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 font-mono placeholder:text-dark-500"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">This token will be sent as: Authorization: Bearer {authData.token || '&lt;token&gt;'}</p>
                        </div>
                    </div>
                )}

                {authType === 'basic' && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Username</label>
                            <input
                                type="text"
                                value={authData.username || ''}
                                onChange={(e) => handleFieldChange('username', e.target.value)}
                                placeholder="Enter username"
                                className="w-full bg-dark-900/50 border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 placeholder:text-dark-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Password</label>
                            <input
                                type="password"
                                value={authData.password || ''}
                                onChange={(e) => handleFieldChange('password', e.target.value)}
                                placeholder="Enter password"
                                className="w-full bg-dark-900/50 border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 placeholder:text-dark-500"
                            />
                        </div>
                    </div>
                )}

                {authType === 'apikey' && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Key</label>
                            <input
                                type="text"
                                value={authData.key || ''}
                                onChange={(e) => handleFieldChange('key', e.target.value)}
                                placeholder="API Key name"
                                className="w-full bg-dark-900/50 border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 placeholder:text-dark-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Value</label>
                            <input
                                type="text"
                                value={authData.value || ''}
                                onChange={(e) => handleFieldChange('value', e.target.value)}
                                placeholder="API Key value"
                                className="w-full bg-dark-900/50 border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 font-mono placeholder:text-dark-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Add to</label>
                            <select
                                value={authData.addTo || 'header'}
                                onChange={(e) => handleFieldChange('addTo', e.target.value)}
                                className="w-full bg-dark-900/50 border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50"
                            >
                                <option value="header">Header</option>
                                <option value="query">Query Params</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
