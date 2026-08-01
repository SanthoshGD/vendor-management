'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatComposer from './ChatComposer';
import SuggestionChips from './SuggestionChips';
import EmptyState from './EmptyState';
import TypingIndicator from './TypingIndicator';
import { ChatMessageModel, simulateStreamingResponse } from './MockAIEngine';
import { useNexus } from '../../../context/NexusContext';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVendor?: (id: string, view?: string) => void;
}

export default function AIAssistantPanel({ isOpen, onClose, onOpenVendor }: AIAssistantPanelProps) {
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or typing state changes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  if (!isOpen) return null;

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    // 1. Add user message
    const userMsg: ChatMessageModel = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // 2. Simulate streaming AI response
    // First, let's create a temporary streaming message
    const tempAiId = `ai-stream-${Date.now()}`;
    
    setTimeout(() => {
      let isFirstWord = true;
      
      simulateStreamingResponse(
        text,
        (textSoFar) => {
          if (isFirstWord) {
            setIsTyping(false);
            setMessages(prev => [
              ...prev,
              {
                id: tempAiId,
                type: 'assistant',
                text: textSoFar,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isStreaming: true
              }
            ]);
            isFirstWord = false;
          } else {
            setMessages(prev => prev.map(m => m.id === tempAiId ? { ...m, text: textSoFar } : m));
          }
        },
        (finalResponse) => {
          // Replace streaming text message with the rich structured RAG response
          setMessages(prev => prev.map(m => m.id === tempAiId ? {
            id: `ai-final-${Date.now()}`,
            type: 'assistant',
            response: finalResponse,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          } : m));
        }
      );
    }, 800); // Small thinking delay
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        type: 'assistant',
        text: 'Hello! I am your StyleSphere AI Compliance Copilot. Ask me questions about vendors, risk factors, or document approvals.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    notify('Copilot chat history cleared.', 'blue');
  };

  const handleCommsAction = (vendorId: string, msg: string) => {
    notify(`Clarification request sent to vendor (${vendorId})`, 'green');
  };

  const handleThumbsUp = (id: string) => {
    notify('Thank you for your feedback! Rating recorded.', 'green');
  };

  const handleThumbsDown = (id: string) => {
    notify('Feedback recorded. Model behavior will adjust in next run.', 'blue');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '88px', // Float above bottom-right button
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
      {/* Header */}
      <ChatHeader
        onClose={onClose}
        onClear={handleClear}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      {/* Main chat log viewport */}
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

      {/* Suggestion Chips */}
      {messages.length > 1 && <SuggestionChips onSelect={handleSend} />}

      {/* Sticky Bottom composer */}
      <ChatComposer onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
