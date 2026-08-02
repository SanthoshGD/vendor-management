'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatComposer from './ChatComposer';
import SuggestionChips from './SuggestionChips';
import EmptyState from './EmptyState';
import TypingIndicator from './TypingIndicator';
import { ChatMessageModel, simulateStreamingResponse } from './MockAIEngine';
import { AICopilotResponse } from './MockAIResponses';
import { useNexus } from '../../../context/NexusContext';
import { NexusApiService, API_BASE_URL } from '../../../services/api';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVendor?: (id: string, view?: string) => void;
  currentVendorId?: string | null;
}

// Map backend ChatResponse → AICopilotResponse for the rich ChatMessage renderer
function mapBackendResponse(
  message: string,
  citations: Array<{ collection: string; title?: string; vendor_id?: string; excerpt?: string; similarity?: number }>,
  suggestions: string[]
): AICopilotResponse {
  const sources = citations.map(c => c.title || c.collection).filter(Boolean) as string[];
  return {
    summary: message,
    sources: sources.length > 0 ? sources : undefined,
  };
}

export default function AIAssistantPanel({
  isOpen,
  onClose,
  onOpenVendor,
  currentVendorId = null,
}: AIAssistantPanelProps) {
  const { notify } = useNexus();
  const [messages, setMessages] = useState<ChatMessageModel[]>([
    {
      id: 'welcome',
      type: 'assistant',
      text: 'Hello! I am your StyleSphere AI Compliance Copilot. Ask me questions about vendors, risk factors, or document approvals.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // Cancel any in-flight stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMsg: ChatMessageModel = {
      id: `user-${Date.now()}`,
      type: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Try real backend first
    const success = await tryBackend(text, abortRef.current);
    if (!success) {
      // Fallback: mock streaming
      runMockFallback(text);
    }
  };

  // ─── Real backend SSE streaming ──────────────────────────────────────────────
  const tryBackend = async (text: string, abort: AbortController): Promise<boolean> => {
    const tempId = `ai-stream-${Date.now()}`;
    let firstChunk = true;
    let accText = '';

    try {
      const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          vendor_id: currentVendorId || null,
          conversation_id: conversationId,
          stream: true,
        }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) return false;

      setIsTyping(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      // Insert streaming placeholder
      setMessages(prev => [...prev, {
        id: tempId,
        type: 'assistant',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: true,
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;

          try {
            const evt = JSON.parse(raw);

            // Capture conversationId from first event
            if (firstChunk && evt.conversation_id) {
              setConversationId(evt.conversation_id);
              firstChunk = false;
            }

            // Token delta streaming
            if (evt.delta) {
              accText += evt.delta;
              setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...m, text: accText } : m
              ));
            }

            // Final complete event with citations + suggestions
            if (evt.done && evt.message) {
              const richResponse = mapBackendResponse(
                evt.message,
                evt.citations ?? [],
                evt.suggestions ?? []
              );
              setMessages(prev => prev.map(m =>
                m.id === tempId ? {
                  id: `ai-final-${Date.now()}`,
                  type: 'assistant',
                  response: richResponse,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isStreaming: false,
                } : m
              ));
            }
          } catch {
            // Non-JSON SSE line (raw text delta from some backends)
            accText += raw;
            setMessages(prev => prev.map(m =>
              m.id === tempId ? { ...m, text: accText } : m
            ));
          }
        }
      }

      // If stream ended without a `done` event, finalize the text-only message
      setMessages(prev => prev.map(m =>
        m.id === tempId && m.isStreaming ? { ...m, isStreaming: false } : m
      ));
      return true;

    } catch (err: any) {
      if (err?.name === 'AbortError') return true; // user cancelled — not a failure
      setIsTyping(false);
      return false;
    }
  };

  // ─── Mock fallback ────────────────────────────────────────────────────────────
  const runMockFallback = (text: string) => {
    const tempAiId = `ai-stream-${Date.now()}`;
    let isFirstWord = true;

    setTimeout(() => {
      simulateStreamingResponse(
        text,
        (textSoFar) => {
          if (isFirstWord) {
            setIsTyping(false);
            setMessages(prev => [...prev, {
              id: tempAiId,
              type: 'assistant',
              text: textSoFar,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isStreaming: true,
            }]);
            isFirstWord = false;
          } else {
            setMessages(prev => prev.map(m => m.id === tempAiId ? { ...m, text: textSoFar } : m));
          }
        },
        (finalResponse) => {
          setMessages(prev => prev.map(m => m.id === tempAiId ? {
            id: `ai-final-${Date.now()}`,
            type: 'assistant',
            response: finalResponse,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          } : m));
        }
      );
    }, 800);
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      text: 'Hello! I am your StyleSphere AI Compliance Copilot. Ask me questions about vendors, risk factors, or document approvals.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    notify('Copilot chat history cleared.', 'blue');
  };

  const handleCommsAction = (vendorId: string, _msg: string) => {
    notify(`Clarification request sent to vendor (${vendorId})`, 'green');
  };

  const handleThumbsUp = (_id: string) => {
    notify('Thank you for your feedback! Rating recorded.', 'green');
  };

  const handleThumbsDown = (_id: string) => {
    notify('Feedback recorded. Model behavior will adjust in next run.', 'blue');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '88px',
        right: '24px',
        zIndex: 100,
        width: isExpanded ? '780px' : '420px',
        height: '660px',
        borderRadius: '20px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1)'
      }}
      className="animate-in fade-in zoom-in-95 duration-200"
    >
      <ChatHeader
        onClose={onClose}
        onClear={handleClear}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxSizing: 'border-box'
      }}>
        {messages.length === 1 && messages[0].id === 'welcome' ? (
          <EmptyState onActionClick={handleSend} />
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOpenVendor={onOpenVendor}
                onCommsAction={handleCommsAction}
                onThumbsUp={handleThumbsUp}
                onThumbsDown={handleThumbsDown}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {messages.length > 1 && <SuggestionChips onSelect={handleSend} />}

      <ChatComposer onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
