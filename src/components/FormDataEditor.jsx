// src/components/FormDataEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Upload, X, Check } from 'lucide-react';
import clsx from 'clsx';

const emptyItem = () => ({
  key: '',
  value: '',
  type: 'text',
  file: null,
  enabled: true,
  contentType: '',
});

export default function FormDataEditor({ pairs = [], onChange }) {
  const [items, setItems] = useState(() => {
    if (pairs.length === 0) return [emptyItem()];
    return pairs.map(p => ({ ...emptyItem(), ...p }));
  });

  // Ref to track internal updates (so we don't re‑sync from props when the user types)
  const isInternalUpdate = useRef(false);

  // Convert internal items to the backend format (without File objects)
  const toBackendFormat = (newItems) =>
    newItems.map(({ key, value, type, file, enabled, contentType }) => ({
      key,
      value: type === 'file' ? (file ? file.name : value) : value,
      type,
      enabled,
      contentType,
    }));

  const updateItems = (newItems) => {
    isInternalUpdate.current = true;
    setItems(newItems);
    const backendItems = toBackendFormat(newItems);
    onChange(backendItems);
  };

  // Sync external `pairs` changes (e.g., switching body type or loading a request)
  useEffect(() => {
    if (isInternalUpdate.current) {
      // This change came from the user typing – ignore the prop update
      isInternalUpdate.current = false;
      return;
    }

    // If the incoming pairs are empty, reset to one empty row
    if (pairs.length === 0) {
      setItems([emptyItem()]);
      return;
    }

    // Build the expected internal items from the new pairs
    const newItems = pairs.map(p => ({ ...emptyItem(), ...p }));
    // Compare only the serializable fields (ignore the File object)
    const currentBackend = toBackendFormat(items);
    const newBackend = toBackendFormat(newItems);
    if (JSON.stringify(currentBackend) !== JSON.stringify(newBackend)) {
      setItems(newItems);
    }
  }, [pairs, items]);

  const handleChange = (idx, field, val) => {
    const newItems = [...items];
    newItems[idx][field] = val;
    if (field === 'type' && val === 'text') {
      newItems[idx].file = null;
      newItems[idx].value = '';
    }
    updateItems(newItems);
  };

  const handleFileSelect = (idx, file) => {
    const newItems = [...items];
    newItems[idx].file = file;
    newItems[idx].value = file.name;
    newItems[idx].contentType = file.type;
    updateItems(newItems);
  };

  const handleRemove = (idx) => {
    if (items.length === 1) {
      updateItems([emptyItem()]);
      return;
    }
    const newItems = items.filter((_, i) => i !== idx);
    updateItems(newItems);
  };

  const handleAdd = () => {
    updateItems([...items, emptyItem()]);
  };

  return (
    <div className="border border-dark-700 rounded overflow-hidden">
      {/* Header */}
      <div className="flex bg-[var(--color-card-bg)] border-b border-dark-700 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
        <div className="w-8 px-3 py-2 border-r border-dark-700 text-center">On</div>
        <div className="flex-1 px-3 py-2 border-r border-dark-700">Key</div>
        <div className="w-20 px-3 py-2 border-r border-dark-700 text-center">Type</div>
        <div className="flex-1 px-3 py-2 border-r border-dark-700">Value</div>
        <div className="w-10"></div>
      </div>

      {/* Add button */}
      <div className="px-3 py-2 border-b border-dark-700/50 bg-[var(--color-input-bg)]">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-dark-700/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Rows */}
      <div className="bg-[var(--color-input-bg)]">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex border-b border-dark-700/30 last:border-0 group transition-colors"
          >
            {/* Enabled checkbox */}
            <div className="w-8 px-3 py-2 border-r border-dark-700/30 flex items-center justify-center">
              <div
                onClick={() => handleChange(idx, 'enabled', !item.enabled)}
                className={clsx(
                  "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
                  item.enabled
                    ? "border-primary bg-primary/30 text-primary"
                    : "border-gray-600 hover:border-gray-400 bg-transparent"
                )}
              >
                {item.enabled && <Check className="w-3 h-3" />}
              </div>
            </div>

            {/* Key input */}
            <div className="flex-1 border-r border-dark-700/30">
              <div className="mx-0.5 my-0.5 rounded border border-transparent hover:border-primary/80 focus-within:border-primary/80">
                <input
                  type="text"
                  placeholder="Key"
                  value={item.key}
                  onChange={(e) => handleChange(idx, 'key', e.target.value)}
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-gray-200 placeholder:text-dark-500 font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Type selector */}
            <div className="w-20 border-r border-dark-700/30">
              <div className="mx-0.5 my-0.5 rounded border border-transparent hover:border-primary/80 focus-within:border-primary/80">
                <select
                  value={item.type}
                  onChange={(e) => handleChange(idx, 'type', e.target.value)}
                  className="w-full bg-transparent px-2 py-1.5 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
              </div>
            </div>

            {/* Value / File picker */}
            <div className="flex-1 border-r border-dark-700/30">
              <div className="mx-0.5 my-0.5 rounded border border-transparent hover:border-primary/80 focus-within:border-primary/80">
                {item.type === 'text' ? (
                  <input
                    type="text"
                    placeholder="Value"
                    value={item.value}
                    onChange={(e) => handleChange(idx, 'value', e.target.value)}
                    className="w-full bg-transparent px-3 py-1.5 text-xs text-gray-200 placeholder:text-dark-500 font-mono focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <label className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-dark-700 hover:bg-dark-600 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      Choose file
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(idx, file);
                        }}
                      />
                    </label>
                    {item.file && (
                      <span className="text-xs text-gray-400 truncate max-w-[150px]">
                        {item.file.name}
                      </span>
                    )}
                    {item.value && !item.file && (
                      <span className="text-xs text-gray-400 truncate max-w-[150px]">
                        {item.value}
                      </span>
                    )}
                    {item.file && (
                      <button
                        onClick={() => handleFileSelect(idx, null)}
                        className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Delete button */}
            <div className="w-10 flex items-center justify-center">
              <button
                onClick={() => handleRemove(idx)}
                className="text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}