import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

export default function ConfigCard({ 
  title, 
  icon: Icon, 
  children, 
  summary, // Summary text to show when collapsed
  defaultExpanded = false,
  className = '',
  onExpandChange
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onExpandChange) {
      onExpandChange(newExpanded);
    }
  };

  return (
    <div className={clsx("bg-dark-800/60 border border-dark-700/50 rounded-xl overflow-hidden transition-all", className)}>
      <button
        onClick={handleToggle}
        className={clsx(
          "w-full px-5 py-4 flex items-center justify-between transition-all",
          "hover:bg-dark-700/30",
          isExpanded && "border-b border-dark-700/50"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <div className="flex-1 min-w-0 text-left">
            <span className="text-sm font-semibold text-gray-200">{title}</span>
            {!isExpanded && summary && (
              <span className="ml-3 text-xs text-gray-500 font-normal">{summary}</span>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="p-5 bg-dark-900/30">
          {children}
        </div>
      )}
    </div>
  );
}
