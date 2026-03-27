import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

// Custom dropdown component for authentication type
const AuthTypeDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { id: 'none', label: 'No Auth' },
    { id: 'bearer', label: 'Bearer Token' },
    { id: 'basic', label: 'Basic Auth' },
    { id: 'apikey', label: 'API Key' },
  ];

  const selectedOption = options.find(opt => opt.id === value) || options[0];

  const handleSelect = (optionId) => {
    setIsOpen(false);
    onChange(optionId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg text-sm font-medium text-white py-2 px-3 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer flex items-center"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-dark-700',
                value === opt.id ? 'text-primary bg-primary/10' : 'text-gray-300'
              )}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                {value === opt.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="flex-1 truncate">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Custom dropdown component for "Add to" (header/query)
const AddToDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { id: 'header', label: 'Header' },
    { id: 'query', label: 'Query Params' },
  ];

  const selectedOption = options.find(opt => opt.id === value) || options[0];

  const handleSelect = (optionId) => {
    setIsOpen(false);
    onChange(optionId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg text-sm font-medium text-white py-2 px-3 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer flex items-center"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-dark-700',
                value === opt.id ? 'text-primary bg-primary/10' : 'text-gray-300'
              )}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                {value === opt.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="flex-1 truncate">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AuthPanel({ authType = 'none', onAuthTypeChange, authData = {}, onAuthDataChange }) {
  const handleFieldChange = (field, value) => {
    const newData = { ...authData, [field]: value };
    onAuthDataChange && onAuthDataChange(newData);
  };

  return (
    <div className="flex gap-4">
      <div className="w-40 flex flex-col gap-2 shrink-0 border-r border-dark-700 pr-4">
        <label className="text-xs font-medium text-gray-400">Type</label>
        <AuthTypeDropdown value={authType} onChange={onAuthTypeChange} />
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
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 font-mono placeholder:text-dark-500"
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
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 placeholder:text-dark-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Password</label>
              <input
                type="password"
                value={authData.password || ''}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 placeholder:text-dark-500"
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
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 placeholder:text-dark-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Value</label>
              <input
                type="text"
                value={authData.value || ''}
                onChange={(e) => handleFieldChange('value', e.target.value)}
                placeholder="API Key value"
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/50 font-mono placeholder:text-dark-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Add to</label>
              <AddToDropdown
                value={authData.addTo || 'header'}
                onChange={(newValue) => handleFieldChange('addTo', newValue)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}