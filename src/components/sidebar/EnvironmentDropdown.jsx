import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

export default function EnvironmentDropdown({
  environments,
  activeEnvironmentId,
  onSelect,
}) {
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

  // Filter out global environments – they cannot be activated
  const filteredEnvironments = environments.filter(env => 
    env.id === 'no-env' || env.environmentType !== 'global'
  );

  const activeEnv = filteredEnvironments.find(env => env.id === activeEnvironmentId) ||
                    filteredEnvironments.find(env => env.id === 'no-env') ||
                    { name: 'No Environment' };

  const handleSelect = (envId) => {
    setIsOpen(false);
    onSelect(envId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-dark-800 border border-dark-700 rounded-lg text-sm font-medium text-white py-2 px-3 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer flex items-center"
      >
        <span className="truncate">{activeEnv.name}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredEnvironments.map(env => (
            <div
              key={env.id}
              onClick={() => handleSelect(env.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-dark-700',
                activeEnvironmentId === env.id ? 'text-primary bg-primary/10' : 'text-gray-300'
              )}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                {activeEnvironmentId === env.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="flex-1 truncate">{env.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}