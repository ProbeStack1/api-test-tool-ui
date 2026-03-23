import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, Plus, Search, MoreVertical, Check, X, Key, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

const emptyVariable = () => ({
  key: '',
  value: '',
  enabled: true,
  description: '',
  type: 'string',
  secret: false,
});

const normalizeVariable = (v) => ({
  key: v.key || '',
  value: v.value || '',
  enabled: v.enabled !== undefined ? v.enabled : true,
  description: v.description || '',
  type: v.type || 'string',
  secret: v.secret || false,
});

export default function VariablesEditor({ pairs, onChange, title = 'Variables' }) {
  const [variables, setVariables] = useState(() => pairs.map(normalizeVariable));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showSecret, setShowSecret] = useState({});
  const [sortDirection, setSortDirection] = useState(null); // null, 'asc', 'desc'

  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchButtonRef = useRef(null); // for outside click detection

  // Compute visible row numbers based on enabled state
  const enabledCounts = useMemo(() => {
    let count = 0;
    return variables.map(v => {
      if (v.enabled) {
        count += 1;
        return count;
      }
      return null;
    });
  }, [variables]);

  useEffect(() => {
    setVariables(pairs.map(normalizeVariable));
    setShowSecret({});
  }, [pairs]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close search on outside click only if empty, ignoring clicks on the search button
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSearch && searchContainerRef.current && !searchContainerRef.current.contains(e.target) &&
          searchButtonRef.current && !searchButtonRef.current.contains(e.target)) {
        if (searchQuery === '') {
          setShowSearch(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearch, searchQuery]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (index, field, value) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
    onChange(updated);

    if (index === variables.length - 1 && (updated[index].key || updated[index].value)) {
      const withNewRow = [...updated, emptyVariable()];
      setVariables(withNewRow);
      onChange(withNewRow);
    }

    if (field === 'secret') {
      setShowSecret(prev => ({ ...prev, [index]: false }));
    }

    if (field === 'value' && updated[index].secret) {
      setShowSecret(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleRemove = (index) => {
    if (variables.length === 1) {
      const reset = [emptyVariable()];
      setVariables(reset);
      onChange(reset);
      setShowSecret({});
      return;
    }
    const filtered = variables.filter((_, i) => i !== index);
    setVariables(filtered);
    onChange(filtered);

    const newShowSecret = {};
    Object.keys(showSecret).forEach(key => {
      const numKey = parseInt(key, 10);
      if (numKey < index) {
        newShowSecret[numKey] = showSecret[numKey];
      } else if (numKey > index) {
        newShowSecret[numKey - 1] = showSecret[numKey];
      }
    });
    setShowSecret(newShowSecret);
  };

  const handleAdd = () => {
    const withNew = [...variables, emptyVariable()];
    setVariables(withNew);
    onChange(withNew);
  };

  const handleResetAll = () => {
    const reset = [emptyVariable()];
    setVariables(reset);
    onChange(reset);
    setShowSecret({});
    setMenuOpen(false);
  };

  const allSecret = variables.length > 0 && variables.every(v => v.secret);

  const handleToggleAllSensitive = () => {
    const newSecret = !allSecret;
    const updated = variables.map(v => ({ ...v, secret: newSecret }));
    setVariables(updated);
    onChange(updated);
    setShowSecret({});
    setMenuOpen(false);
  };

  const handleToggleDescription = () => {
    setShowDescription(!showDescription);
    setMenuOpen(false);
  };

  // Sort and filter logic
  const baseList = useMemo(() => {
    if (!sortDirection) return variables;
    return [...variables].sort((a, b) => {
      if (a.key === '' && b.key === '') return 0;
      if (a.key === '') return 1;
      if (b.key === '') return -1;
      const keyA = a.key.toLowerCase();
      const keyB = b.key.toLowerCase();
      const comparison = keyA.localeCompare(keyB);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [variables, sortDirection]);

  const filteredVariables = useMemo(() => {
    const list = baseList;
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(v =>
      v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q)
    );
  }, [baseList, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Title header */}
      <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>

      {/* Editor Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-dark-700 rounded-lg overflow-hidden bg-[#0f172a]/30">
          {/* Header */}
          <div className="flex bg-[#161B30] border-b border-dark-600 text-[10px] text-gray-300 font-semibold uppercase tracking-wide relative">
            {/* # column */}
            <div className="w-8 px-3 py-2 border-r border-dark-600 flex items-center justify-center">#</div>
            {/* On column */}
            <div className="w-8 px-3 py-2 border-r border-dark-600 flex items-center justify-center">On</div>
            {/* Key column with sort */}
            <div
              className="flex-1 px-3 py-2 border-r border-dark-600 flex items-center gap-1 cursor-pointer hover:text-gray-100"
              onClick={() => {
                if (!sortDirection) setSortDirection('asc');
                else if (sortDirection === 'asc') setSortDirection('desc');
                else setSortDirection(null);
              }}
            >
              <span>Key</span>
              {sortDirection === 'asc' && <ChevronUp className="w-3 h-3" />}
              {sortDirection === 'desc' && <ChevronDown className="w-3 h-3" />}
            </div>
            {/* Value column */}
            <div className="flex-1 px-3 py-2 border-r border-dark-600">Value</div>
            {/* Description column (conditional) */}
            {showDescription && (
              <div className="flex-1 px-3 py-2 border-r border-dark-600">Description</div>
            )}
            {/* Actions column – search and menu (fixed width) */}
            <div className="w-20 px-2 py-2 flex items-center justify-end gap-1 relative">
              <div className="relative flex items-center">
                {/* Search button */}
                <button
                  ref={searchButtonRef}
                  type="button"
                  onClick={() => setShowSearch(!showSearch)}
                  className={clsx(
                    "p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700",
                    showSearch && "bg-dark-700 text-white"
                  )}
                  title="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
                {/* Menu button */}
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 py-1">
                      <button
                        onClick={handleResetAll}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-dark-700"
                      >
                        Reset all
                      </button>
                      <button
                        onClick={handleToggleAllSensitive}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-dark-700 flex items-center justify-between"
                      >
                        <span>Mark all as sensitive</span>
                        {allSecret && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      <button
                        onClick={handleToggleDescription}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-dark-700 flex items-center justify-between"
                      >
                        <span>Show description</span>
                        {showDescription && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Search input overlay (when active) */}
                {showSearch && (
                  <div
                    ref={searchContainerRef}
                    className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-20"
                    style={{ width: '240px' }}
                  >
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter by key or value..."
                        className="w-full bg-dark-900 border border-dark-700 rounded pl-7 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add button */}
          <div className="px-3 py-2 border-b border-dark-700/50 bg-[#161B30]">
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-dark-700/50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Rows */}
          {filteredVariables.map((variable, idx) => {
            const originalIndex = variables.findIndex(v => v === variable);
            const isEmpty = !variable.key && !variable.value;
            const rowNumber = enabledCounts[originalIndex];

            return (
              <div
                key={originalIndex}
                className="flex border-b border-dark-700/30 last:border-0 group hover:bg-dark-800/20 transition-colors"
              >
                {/* Row number column */}
                <div className="w-8 px-3 py-2 border-r border-dark-700/30 flex items-center justify-center text-xs text-gray-500">
                  {rowNumber !== null ? rowNumber : '-'}
                </div>

                {/* Checkbox column */}
                <div className="w-8 px-3 py-2 border-r border-dark-700/30 flex items-center justify-center">
                  <div
                    onClick={() => !isEmpty && handleChange(originalIndex, 'enabled', !variable.enabled)}
                    className={clsx(
                      "w-4 h-4 min-w-[16px] min-h-[16px] rounded border flex items-center justify-center cursor-pointer transition-all duration-200",
                      !variable.enabled && "border-gray-600 hover:border-gray-400 bg-transparent",
                      variable.enabled && "border-primary bg-primary/10 text-primary",
                      isEmpty && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {variable.enabled && <Check className="w-3 h-3" />}
                  </div>
                </div>

                {/* Key input */}
                <div className="flex-1 border-r border-dark-700/30 flex items-center">
                  <input
                    type="text"
                    placeholder="Key"
                    value={variable.key}
                    onChange={(e) => handleChange(originalIndex, 'key', e.target.value)}
                    className="flex-1 bg-[#0f172a]/50 px-3 py-2 text-sm text-white focus:outline-none hover:border-orange-500 focus:border-orange-500 placeholder:text-gray-500 font-mono transition-colors border border-transparent"
                  />
                  {!isEmpty && (
                    <button
                      onClick={() => handleChange(originalIndex, 'secret', !variable.secret)}
                      className="p-1 mr-1 rounded text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                      title={variable.secret ? 'Mark as normal' : 'Mark as sensitive'}
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Value input */}
                <div className="flex-1 border-r border-dark-700/30 flex items-center">
                  <input
                    type={variable.secret && !showSecret[originalIndex] ? 'password' : 'text'}
                    placeholder="Value"
                    value={variable.value}
                    onChange={(e) => handleChange(originalIndex, 'value', e.target.value)}
                    className="flex-1 bg-[#0f172a]/50 px-3 py-2 text-sm text-white focus:outline-none hover:border-orange-500 focus:border-orange-500 placeholder:text-gray-500 font-mono transition-colors border border-transparent"
                  />
                  {!isEmpty && variable.secret && (
                    <button
                      onClick={() => setShowSecret(prev => ({ ...prev, [originalIndex]: !prev[originalIndex] }))}
                      className="p-1 mr-1 rounded text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                      title={showSecret[originalIndex] ? 'Hide' : 'Show'}
                    >
                      {showSecret[originalIndex] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Description column (if enabled) */}
                {showDescription && (
                  <div className="flex-1 border-r border-dark-700/30 flex items-center">
                    <input
                      type="text"
                      placeholder="Description"
                      value={variable.description}
                      onChange={(e) => handleChange(originalIndex, 'description', e.target.value)}
                      className="flex-1 bg-[#0f172a]/50 px-3 py-2 text-sm text-white focus:outline-none hover:border-orange-500 focus:border-orange-500 placeholder:text-gray-500 font-mono transition-colors border border-transparent"
                    />
                  </div>
                )}

                {/* Delete button */}
                <div className="w-20 flex items-center justify-center">
                  <button
                    onClick={() => handleRemove(originalIndex)}
                    className="text-gray-600 hover:text-red-400 transition-all p-1 rounded hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Use <code className="bg-dark-800 px-1 py-0.5 rounded text-gray-300">{'{{variable}}'}</code> in requests to substitute these values
        </p>
      </div>
    </div>
  );
}