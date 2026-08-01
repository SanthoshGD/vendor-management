import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, ChevronRight, MessageSquareText, ShieldAlert } from 'lucide-react';

export default function AIAssistantChatbot({ isOpen, onClose, vendors, onOpenVendor }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'assistant',
      text: 'Hello! I am your StyleSphere AI Assistant. How can I help you manage your vendor queue today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  const samplePrompts = [
    { label: 'Show pending vendors', query: 'Show vendors awaiting approval' },
    { label: 'Missing tax certificate', query: 'Vendors missing tax certificate' },
    { label: 'Vendors from China', query: 'Vendors from China' },
    { label: 'Recently rejected', query: 'Recently rejected vendors' },
    { label: 'High-risk vendors', query: 'Show high-risk vendors' }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (text) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response based on query
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
    }, 750);
  };

  const processQuery = (query) => {
    const q = query.toLowerCase();
    
    if (q.includes('awaiting') || q.includes('pending') || q.includes('approval') || q.includes('queue')) {
      const pendingList = vendors.filter(v => !v.finalStatus && v.hasSubmittedApplication);
      if (pendingList.length === 0) {
        return {
          text: 'There are currently no vendors awaiting review in the queue.',
          actions: []
        };
      }
      return {
        text: `I found ${pendingList.length} vendor(s) awaiting review:`,
        actions: pendingList.map(v => ({
          label: `${v.name} (${v.category || 'Uncategorized'})`,
          vendorId: v.id,
          detail: `SLA: ${v.sla || '48h'} · Progress: ${v.progress || 0}%`
        }))
      };
    }

    if (q.includes('tax') || q.includes('certificate') || q.includes('missing')) {
      const taxMissing = vendors.filter(v => v.documents.some(d => d.code === 'TAX' && d.status === 'Missing'));
      if (taxMissing.length === 0) {
        return {
          text: 'Great! No vendors are currently missing their Tax Registration Certificate.',
          actions: []
        };
      }
      return {
        text: `Here are the vendors missing their Tax Certificate:`,
        actions: taxMissing.map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: 'Tax Registration Certificate: Outstanding'
        }))
      };
    }

    if (q.includes('china') || q.includes('chinese')) {
      const chinaVendors = vendors.filter(v => (v.country || '').toLowerCase().includes('china') || (v.profile?.country || '').toLowerCase().includes('china') || v.initials === 'ZF'); // Match Guangzhou too
      if (chinaVendors.length === 0) {
        return {
          text: 'I could not find any vendors registered from China in the current view.',
          actions: []
        };
      }
      return {
        text: `I found ${chinaVendors.length} vendor(s) from China:`,
        actions: chinaVendors.map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `Status: ${v.finalStatus || 'In Progress'} · Category: ${v.category}`
        }))
      };
    }

    if (q.includes('reject') || q.includes('rejected')) {
      const rejectedList = vendors.filter(v => v.finalStatus === 'Rejected');
      if (rejectedList.length === 0) {
        return {
          text: 'No vendors have been rejected recently.',
          actions: []
        };
      }
      return {
        text: `Here are the recently rejected vendors:`,
        actions: rejectedList.map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: 'Status: Rejected'
        }))
      };
    }

    if (q.includes('risk') || q.includes('high')) {
      const highRisk = vendors.filter(v => v.risk === 'High' || v.baseRiskScore > 70);
      if (highRisk.length === 0) {
        return {
          text: 'Excellent! There are no high-risk vendors flagged in the system right now.',
          actions: []
        };
      }
      return {
        text: `Here are the flagged high-risk vendors:`,
        actions: highRisk.map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `Risk Score: ${v.riskScore || v.baseRiskScore}/100 · ${v.risk || 'High Risk'}`
        }))
      };
    }

    return {
      text: "I'm here to help! You can ask me query prompts like:\n• 'Show vendors awaiting approval'\n• 'Who is missing their tax certificate?'\n• 'List vendors from China'\n• 'Show high-risk vendors'",
      actions: []
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-3.5 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">AI Assistant</h3>
            <p className="text-[10px] text-emerald-400 font-medium">Context-Aware Portal Copilot</p>
          </div>
        </div>
        <button onClick={onClose} type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs shadow-2xs leading-relaxed ${
              msg.type === 'user'
                ? 'bg-emerald-600 text-white rounded-br-xs'
                : 'bg-slate-100 text-slate-800 rounded-bl-xs'
            }`}>
              {msg.text.split('\n').map((line, idx) => <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>)}
              
              {/* Context Action Links */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-200/50 pt-2.5">
                  {msg.actions.map((act, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onOpenVendor(act.vendorId);
                        onClose();
                      }}
                      className="flex w-full items-center justify-between rounded-lg bg-white p-2 text-left border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-800 font-medium transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-[11px] group-hover:text-emerald-700">{act.label}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{act.detail}</span>
                      </div>
                      <ChevronRight size={13} className="text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1" />
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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Suggested Queries</p>
        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(p.query)}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 transition-all cursor-pointer"
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
          placeholder="Ask me anything..."
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
