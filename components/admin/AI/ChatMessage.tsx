'use client';

import React, { useState } from 'react';
import { Sparkles, ThumbsUp, ThumbsDown, Copy, Check, Info, FileText } from 'lucide-react';
import { ChatMessageModel } from './MockAIEngine';
import VendorResponseCard from './VendorResponseCard';
import TableResponse from './TableResponse';

interface ChatMessageProps {
  message: ChatMessageModel;
  onOpenVendor?: (id: string, view?: string) => void;
  onCommsAction?: (vendorId: string, msg: string) => void;
  onThumbsUp?: (id: string) => void;
  onThumbsDown?: (id: string) => void;
  onRegenerate?: (text: string) => void;
}

export default function ChatMessage({
  message,
  onOpenVendor,
  onCommsAction,
  onThumbsUp,
  onThumbsDown,
  onRegenerate
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState<'up' | 'down' | null>(null);

  const isUser = message.type === 'user';

  const handleCopy = () => {
    const textToCopy = message.text || message.response?.summary || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: '4px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        maxWidth: '85%',
        flexDirection: isUser ? 'row-reverse' : 'row'
      }}>
        {/* Avatar */}
        {!isUser && (
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669',
            marginTop: '2px',
            flexShrink: 0
          }}>
            <Sparkles size={11} />
          </div>
        )}

        {/* Content Bubble */}
        <div style={{
          padding: '10px 14px',
          borderRadius: '16px',
          backgroundColor: isUser ? '#059669' : '#FFFFFF',
          color: isUser ? '#FFFFFF' : '#1E293B',
          fontSize: '12px',
          lineHeight: '1.5',
          border: isUser ? 'none' : '1px solid #E2E8F0',
          borderBottomRightRadius: isUser ? '2px' : '16px',
          borderBottomLeftRadius: isUser ? '16px' : '2px',
          boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Main text summary / response */}
          {message.text && (
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
          )}

          {/* RAG response layout if present */}
          {message.response && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div>{message.response.summary}</div>

              {/* RAG Reasons Bullet List */}
              {message.response.reasons && message.response.reasons.length > 0 && (
                <ul style={{
                  margin: '4px 0',
                  paddingLeft: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {message.response.reasons.map((r, i) => (
                    <li key={i} style={{ color: '#475569', fontSize: '11.5px' }}>{r}</li>
                  ))}
                </ul>
              )}

              {/* AI generated Interactive Cards */}
              {message.response.cards && message.response.cards.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {message.response.cards.map((c, i) => (
                    <VendorResponseCard
                      key={i}
                      card={c}
                      onOpenVendor={onOpenVendor}
                      onCommsAction={onCommsAction}
                    />
                  ))}
                </div>
              )}

              {/* AI generated Interactive Tables */}
              {message.response.table && (
                <div style={{ marginTop: '4px' }}>
                  <TableResponse table={message.response.table} onOpenVendor={onOpenVendor} />
                </div>
              )}

              {/* Details list if any */}
              {message.response.details && message.response.details.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #EEF2F6',
                  marginTop: '4px'
                }}>
                  {message.response.details.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
                      <span>{d.label}:</span>
                      <strong style={{ color: '#1E293B' }}>{d.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Detailed recommendation block */}
              {message.response.recommendation && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: '#15803D',
                  marginTop: '4px'
                }}>
                  <Info size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <strong>Recommendation:</strong> {message.response.recommendation}
                  </div>
                </div>
              )}

              {/* Grounded RAG References / Sources */}
              {message.response.sources && message.response.sources.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  borderTop: '1px solid #EEF2F6',
                  paddingTop: '8px',
                  marginTop: '4px'
                }}>
                  <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>Retrieved From:</span>
                  {message.response.sources.map((src, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '9.5px',
                        fontWeight: 650,
                        color: '#475569',
                        backgroundColor: '#F1F5F9',
                        padding: '1.5px 5px',
                        borderRadius: '4px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <FileText size={9} />
                      {src}
                    </span>
                  ))}

                  {message.response.confidence && (
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      padding: '1.5px 5px',
                      borderRadius: '4px',
                      border: '1px solid #A7F3D0',
                      marginLeft: 'auto'
                    }}>
                      {message.response.confidence}% match
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metadata and Actions bar below message */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: isUser ? '0 4px 0 0' : '0 0 0 32px',
        boxSizing: 'border-box'
      }}>
        <span style={{ fontSize: '9px', color: '#94A3B8' }}>{message.timestamp}</span>

        {!isUser && !message.isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy Response"}
              style={{ background: 'none', border: 0, padding: '3px', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}
            >
              {copied ? <Check size={11} style={{ color: '#059669' }} /> : <Copy size={11} />}
            </button>
            <button
              type="button"
              onClick={() => { setRated('up'); onThumbsUp?.(message.id); }}
              title="Thumbs Up"
              style={{ background: 'none', border: 0, padding: '3px', cursor: 'pointer', color: rated === 'up' ? '#059669' : '#94A3B8', display: 'flex', alignItems: 'center' }}
            >
              <ThumbsUp size={11} />
            </button>
            <button
              type="button"
              onClick={() => { setRated('down'); onThumbsDown?.(message.id); }}
              title="Thumbs Down"
              style={{ background: 'none', border: 0, padding: '3px', cursor: 'pointer', color: rated === 'down' ? '#E11D48' : '#94A3B8', display: 'flex', alignItems: 'center' }}
            >
              <ThumbsDown size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
