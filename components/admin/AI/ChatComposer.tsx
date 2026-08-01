'use client';

import React, { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatComposer({ onSend, disabled = false }: ChatComposerProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #EEF2F6',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        borderBottomLeftRadius: '20px',
        borderBottomRightRadius: '20px',
        boxSizing: 'border-box'
      }}
    >
      {/* Attachment Button */}
      <button
        type="button"
        disabled
        title="File attachments disabled in Demo"
        style={{
          background: 'none',
          border: 0,
          padding: '8px',
          borderRadius: '8px',
          color: '#94A3B8',
          cursor: 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Paperclip size={16} />
      </button>

      {/* Input Textarea */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about vendors, compliance, approvals..."
        rows={1}
        disabled={disabled}
        style={{
          flex: 1,
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          padding: '8px 12px',
          fontSize: '12px',
          fontFamily: 'inherit',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: '34px',
          maxHeight: '120px',
          lineHeight: '1.4',
          transition: 'border-color 0.2s',
          backgroundColor: disabled ? '#F8FAFC' : '#FFFFFF'
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#10B981'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
      />

      {/* Send Button */}
      <button
        type="submit"
        disabled={!value.trim() || disabled}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          backgroundColor: (!value.trim() || disabled) ? '#F1F5F9' : '#059669',
          color: (!value.trim() || disabled) ? '#94A3B8' : '#FFFFFF',
          border: 0,
          cursor: (!value.trim() || disabled) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s'
        }}
      >
        <Send size={14} />
      </button>
    </form>
  );
}
