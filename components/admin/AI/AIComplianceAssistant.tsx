'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, ChevronRight, ArrowRight } from 'lucide-react';

interface AIComplianceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: any[];
  onOpenVendor: (vendorId: string, page?: string) => void;
  currentVendorId?: string | null;
  currentPage?: string | null;
}

export default function AIComplianceAssistant({
  isOpen,
  onClose,
  vendors,
  onOpenVendor,
  currentVendorId = null,
  currentPage = null
}: AIComplianceAssistantProps) {
  const [messages, setMessages] = useState<any[]>([
    {
      id: 'welcome',
      type: 'assistant',
      text: 'Hi Sarah 👋 How can I help today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    { label: 'Show pending vendors', query: 'Show pending vendors' },
    { label: 'High risk vendors', query: 'Show high risk vendors' },
    { label: 'Chinese suppliers', query: 'Show Chinese suppliers' },
    { label: 'Insurance expiring', query: 'Which suppliers have insurance expiring?' },
    { label: 'Missing tax certificates', query: 'Show suppliers with missing tax certificates' },
    { label: 'Recently approved', query: 'Show recently approved suppliers' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = processQuery(text);
      const assistantMsg = {
        id: `ai-${Date.now()}`,
        type: 'assistant',
        ...responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 600);
  };

  const processQuery = (query: string) => {
    const q = query.toLowerCase();

    if (q.includes('pending')) {
      const pendingList = vendors.filter(v => v.hasSubmittedApplication && !v.finalStatus);
      const count = pendingList.length || 4;
      return {
        text: `${count} vendors found requiring pending approval:`,
        actions: (pendingList.length ? pendingList : vendors.slice(0, 4)).map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `Status: ${v.stage || 'Pending Review'}`,
          actionType: 'Review →',
        }))
      };
    }

    if (q.includes('risk') || q.includes('high')) {
      const highRiskList = vendors.filter(v => (v.risk || '').toLowerCase() === 'high');
      const count = highRiskList.length || 3;
      return {
        text: `${count} high risk vendor(s) identified in portfolio:`,
        actions: (highRiskList.length ? highRiskList : vendors.slice(0, 3)).map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `Risk Score: 78/100 (Address Mismatch)`,
          actionType: 'Open →',
        }))
      };
    }

    if (q.includes('chin') || q.includes('chinese')) {
      const chinaList = vendors.filter(
        v => (v.country || '').toLowerCase().includes('china') || (v.profile?.country || '').toLowerCase().includes('china')
      );
      const count = chinaList.length || 4;
      return {
        text: `${count} Chinese supplier(s) found in active review:`,
        actions: (chinaList.length ? chinaList : vendors.slice(0, 4)).map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `Assigned Executive: Priya Sharma`,
          actionType: 'Assign →',
        }))
      };
    }

    if (q.includes('insurance') || q.includes('expir')) {
      return {
        text: '3 suppliers found with liability insurance expiring within 7 days:',
        actions: vendors.slice(0, 3).map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: 'COI Policy expires in 7 days',
          actionType: 'Review →',
        }))
      };
    }

    if (q.includes('tax')) {
      return {
        text: '2 suppliers flagged for missing or unverified Tax Registration certificates:',
        actions: vendors.slice(0, 2).map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: 'Tax Registration Certificate pending',
          actionType: 'Open →',
        }))
      };
    }

    if (q.includes('approved') || q.includes('recent')) {
      const approvedList = vendors.filter(v => v.finalStatus === 'Approved' || v.finalStatus === 'Active');
      return {
        text: `${approvedList.length || 5} recently approved suppliers active in ERP:`,
        actions: (approvedList.length ? approvedList : vendors.slice(0, 3)).map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: 'Approved & Portal invitation sent',
          actionType: 'Open →',
        }))
      };
    }

    return {
      text: "I can assist you with quick compliance queries. Try selecting a suggestion below:",
      actions: []
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200 global-ai-copilot">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-3.5 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">AI Compliance Copilot</h3>
            <p className="text-[10px] text-emerald-400 font-medium">StyleSphere Nexus Assistant</p>
          </div>
        </div>
        <button onClick={onClose} type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed ${
              msg.type === 'user'
                ? 'bg-emerald-600 text-white rounded-br-xs'
                : 'bg-slate-100 text-slate-800 rounded-bl-xs'
            }`}>
              {msg.text.split('\n').map((line: string, idx: number) => <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>)}
              
              {/* Context Action Links (Open →, Assign →, Review →) */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-2.5">
                  {msg.actions.map((act: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onOpenVendor(act.vendorId, 'vendor-details');
                        onClose();
                      }}
                      className="flex w-full items-center justify-between rounded-xl bg-white p-2.5 text-left border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-800 transition-all cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-[11px] text-slate-900 group-hover:text-emerald-700">{act.label}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{act.detail}</span>
                      </div>
                      <span className="ml-2 text-[11px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                        {act.actionType || 'Open →'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="mt-1 text-[9px] text-slate-400 px-1">{msg.time}</span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-1">
            <div className="rounded-2xl bg-slate-100 px-3.5 py-2 text-slate-500 text-xs rounded-bl-xs flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompt Pills */}
      <div className="border-t border-slate-100 bg-slate-50 p-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Copilot Shortcuts</p>
        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(p.query)}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 transition-all cursor-pointer shadow-2xs"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputValue);
        }}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask Copilot..."
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
