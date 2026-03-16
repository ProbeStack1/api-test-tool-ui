import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Search, MoreVertical, Check, X } from 'lucide-react';
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
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync internal state when external pairs change (e.g., environment switch)
  useEffect(() => {
    setVariables(pairs.map(normalizeVariable));
  }, [pairs]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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

    // Auto‑add new row when last row is filled
    if (index === variables.length - 1 && (updated[index].key || updated[index].value)) {
      const withNewRow = [...updated, emptyVariable()];
      setVariables(withNewRow);
      onChange(withNewRow);
    }
  };

  const handleRemove = (index) => {
    if (variables.length === 1) {
      const reset = [emptyVariable()];
      setVariables(reset);
      onChange(reset);
      return;
    }
    const filtered = variables.filter((_, i) => i !== index);
    setVariables(filtered);
    onChange(filtered);
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
    setMenuOpen(false);
  };

  const allSecret = variables.length > 0 && variables.every(v => v.secret);

  const handleToggleAllSensitive = () => {
    const newSecret = !allSecret;
    const updated = variables.map(v => ({ ...v, secret: newSecret }));
    setVariables(updated);
    onChange(updated);
    setMenuOpen(false);
  };

  const handleToggleDescription = () => {
    setShowDescription(!showDescription);
    setMenuOpen(false);
  };

  const filteredVariables = searchQuery
    ? variables.filter(v =>
        v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : variables;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Title header with search input to the left of icons */}
      <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-1">
          {showSearch && (
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by key..."
              className="w-64 bg-dark-900 border border-dark-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
          <button
            type="button"
            onClick={() => {
              if (showSearch) {
                setSearchQuery('');
                setShowSearch(false);
              } else {
                setShowSearch(true);
              }
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700"
            title={showSearch ? 'Close search' : 'Search'}
          >
            {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700"
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
                  <span>Show column for description</span>
                  {showDescription && <Check className="w-4 h-4 text-primary" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Table – unchanged */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-dark-700 rounded-lg overflow-hidden bg-dark-900/30">
          {/* Header */}
          <div className="flex bg-dark-800/50 border-b border-dark-700 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
            <div className="w-8 px-3 py-2 border-r border-dark-700 flex items-center justify-center">#</div>
            <div className="w-8 px-3 py-2 border-r border-dark-700 flex items-center justify-center">On</div>
            <div className="flex-1 px-3 py-2 border-r border-dark-700">Key</div>
            <div className="flex-1 px-3 py-2 border-r border-dark-700">Value</div>
            {showDescription && <div className="flex-1 px-3 py-2 border-r border-dark-700">Description</div>}
            <div className="w-10 px-3 py-2"></div>
          </div>

          {/* Add button */}
          <div className="px-3 py-2 border-b border-dark-700/50 bg-dark-800/30">
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-dark-700/50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Rows */}
          <div className="bg-dark-900/20">
            {filteredVariables.map((variable, idx) => {
              const originalIndex = variables.findIndex(v => v === variable);
              return (
                <div
                  key={originalIndex}
                  className="flex border-b border-dark-700/30 last:border-0 group hover:bg-dark-800/40 transition-colors"
                >
                  <div className="w-8 px-3 py-2 border-r border-dark-700/30 flex items-center justify-center text-xs text-gray-500">
                    {originalIndex + 1}
                  </div>
                  <div className="w-8 px-3 py-2 border-r border-dark-700/30 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={variable.enabled}
                      onChange={(e) => handleChange(originalIndex, 'enabled', e.target.checked)}
                      className="rounded border-dark-600 bg-dark-700 text-primary focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex-1 border-r border-dark-700/30">
                    <input
                      type="text"
                      placeholder="Key"
                      value={variable.key}
                      onChange={(e) => handleChange(originalIndex, 'key', e.target.value)}
                      className="w-full bg-transparent px-3 py-2 text-xs text-gray-200 focus:outline-none focus:bg-dark-900/30 placeholder:text-dark-500 font-mono"
                    />
                  </div>
                  <div className="flex-1 border-r border-dark-700/30">
                    <input
                      type={variable.secret ? 'password' : 'text'}
                      placeholder="Value"
                      value={variable.value}
                      onChange={(e) => handleChange(originalIndex, 'value', e.target.value)}
                      className="w-full bg-transparent px-3 py-2 text-xs text-gray-200 focus:outline-none focus:bg-dark-900/30 placeholder:text-dark-500 font-mono"
                    />
                  </div>
                  {showDescription && (
                    <div className="flex-1 border-r border-dark-700/30">
                      <input
                        type="text"
                        placeholder="Description"
                        value={variable.description}
                        onChange={(e) => handleChange(originalIndex, 'description', e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs text-gray-200 focus:outline-none focus:bg-dark-900/30 placeholder:text-dark-500 font-mono"
                      />
                    </div>
                  )}
                  <div className="w-10 flex items-center justify-center">
                    <button
                      onClick={() => handleRemove(originalIndex)}
                      className="text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Use <code className="bg-dark-800 px-1 py-0.5 rounded text-gray-300">{'{{variable}}'}</code> in requests to substitute these values
        </p>
      </div>
    </div>
  );
}