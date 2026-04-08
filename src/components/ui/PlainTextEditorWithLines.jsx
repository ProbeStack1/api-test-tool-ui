import React, { useRef, useState } from 'react';
import VariableHighlightInput from './VariableHighlightInput';

export default function PlainTextEditorWithLines({
  value,
  onChange,
  placeholder,
  activeEnvVars,
  inactiveEnvVars,
  activeEnvValues,
  inactiveEnvInfo,
  globalVars,
  globalValues,
}) {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const lines = value ? value.split('\n') : [''];
  
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };
  
  return (
    <div className="relative border border-dark-700 rounded-lg overflow-hidden bg-[#1e1e1e]">
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="absolute left-0 top-0 bottom-0 w-10 bg-dark-800/50 border-r border-dark-700 overflow-y-auto select-none z-10"
      >
        <div className="pt-4 pb-4">
          {lines.map((_, i) => (
            <div key={i} className="text-right pr-2 text-xs text-gray-500 font-mono" style={{ lineHeight: '1.5rem' }}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      
      <div className="pl-10">
        <VariableHighlightInput
          ref={textareaRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          multiline
          activeEnvVars={activeEnvVars}
          inactiveEnvVars={inactiveEnvVars}
          activeEnvValues={activeEnvValues}
          inactiveEnvInfo={inactiveEnvInfo}
          globalVars={globalVars}
          globalValues={globalValues}
          onScroll={handleScroll}
          className="w-full border-0 rounded-none"
          inputClassName="min-h-[256px]"
        />
      </div>
    </div>
  );
}