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

  const samplePrompts = [
    { label: 'Show pending vendors', query: 'Show pending vendors' },
    { label: 'Attention needed today', query: 'Which vendors need attention today?' },
    { label: 'High risk breakdown', query: 'Why is this vendor high risk?' },
    { label: 'Vendors from China', query: 'Show vendors from China' },
    { label: 'Expiring insurance', query: 'Which insurance certificates expire this month?' }
  ];

  const processQuery = (query) => {
    const q = query.toLowerCase();

    if (q.includes('pending') || q.includes('awaiting') || q.includes('approval') || q.includes('queue')) {
      const pendingList = vendors.filter(v => !v.finalStatus && v.hasSubmittedApplication);
      if (pendingList.length === 0) {
        return {
          text: 'There are currently no pending vendors awaiting review in the queue.',
          actions: []
        };
      }
      return {
        text: `I found ${pendingList.length} pending vendor(s) awaiting review:`,
        actions: pendingList.map(v => ({
          label: `${v.name} (${v.category || 'Apparel'})`,
          vendorId: v.id,
          detail: `SLA: ${v.sla || '48h'} · Status: Pending Review`
        }))
      };
    }

    if (q.includes('attention') || q.includes('today') || q.includes('urgent')) {
      const urgentList = vendors.filter(v => (v.slaHours && v.slaHours <= 12) || v.risk === 'High' || !v.finalStatus);
      return {
        text: `The following ${urgentList.length} vendor(s) require attention today due to SLA deadlines or open risk items:`,
        actions: urgentList.slice(0, 4).map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `SLA Remaining: ${v.sla} · Risk Level: ${v.risk || 'High'}`
        }))
      };
    }

    if (q.includes('why') || q.includes('risk')) {
      const highRisk = vendors.filter(v => v.risk === 'High' || v.baseRiskScore > 50 || v.documents.some((d) => d.status === 'Flagged' || d.status === 'Needs Review'));
      return {
        text: `High-risk status is triggered by cross-document entity mismatches, unverified tax IDs, or expiring insurance policies. Here are current high-risk cases:`,
        actions: highRisk.slice(0, 3).map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `Risk Score: ${v.riskScore || v.baseRiskScore || 78}/100 · Reason: Entity Mismatch / Unverified Tax`
        }))
      };
    }

    if (q.includes('china') || q.includes('chinese')) {
      const chinaVendors = vendors.filter(v => (v.country || '').toLowerCase().includes('china') || (v.profile?.country || '').toLowerCase().includes('china'));
      if (chinaVendors.length === 0) {
        return {
          text: 'No registered suppliers from China were found.',
          actions: []
        };
      }
      return {
        text: `I located ${chinaVendors.length} supplier(s) based in China:`,
        actions: chinaVendors.map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `Region: ${v.country} · Category: ${v.category} · Status: ${v.finalStatus || 'In Review'}`
        }))
      };
    }

    if (q.includes('insurance') || q.includes('expire') || q.includes('coi')) {
      const expiringIns = vendors.filter(v => v.documents.some((d) => d.code === 'COI' || d.title.toLowerCase().includes('insurance')));
      return {
        text: `Found 2 insurance certificates requiring renewal verification this month:`,
        actions: expiringIns.slice(0, 3).map(v => ({
          label: `${v.name} - Liability Policy`,
          vendorId: v.id,
          detail: 'Policy Expiry: 15 Nov 2026 · Status: Renewal Needed'
        }))
      };
    }

    return {
      text: "I'm your StyleSphere enterprise assistant. You can ask me:\n• 'Show pending vendors'\n• 'Which vendors need attention today?'\n• 'Why is this vendor high risk?'\n• 'Show vendors from China'\n• 'Which insurance certificates expire this month?'",
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
            <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs shadow-2xs leading-relaxed ${msg.type === 'user'
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
