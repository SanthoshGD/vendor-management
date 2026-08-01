'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, ChevronRight, MessageSquareText, ShieldAlert } from 'lucide-react';

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
      text: 'Hello! I am your AI Compliance Assistant. Ask me about vendor risks, expired documents, or China approval queues.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    { label: 'Need attention', query: 'Which vendors need attention today?' },
    { label: 'Risk factor', query: 'Why is this vendor risk flagged?' },
    { label: 'China Sourcing', query: 'Show all vendors from China waiting approval' },
    { label: 'Expired Insurance', query: 'Which suppliers have expired insurance?' }
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
    }, 750);
  };

  const processQuery = (query: string) => {
    const q = query.toLowerCase();

    // 1. Context aware risk analysis of current vendor
    if (q.includes('risk') || q.includes('why')) {
      const currentVendor = vendors.find(v => v.id === currentVendorId);
      if (currentVendor) {
        const docs = currentVendor.documents || [];
        const missingDocs = docs.filter((d: any) => d.status === 'Missing').map((d: any) => d.title);
        const flaggedDocs = docs.filter((d: any) => d.status === 'Flagged' || d.status === 'Rejected').map((d: any) => d.title);
        
        let explanation = `Vendor ${currentVendor.name} has a risk score of ${currentVendor.riskScore} (${currentVendor.risk} Risk). `;
        const drivers = [];
        if (missingDocs.length) drivers.push(`missing documents: ${missingDocs.join(', ')}`);
        if (flaggedDocs.length) drivers.push(`unresolved findings: ${flaggedDocs.join(', ')}`);
        if (currentVendor.riskScore >= 70) drivers.push(`high risk country status/profile alerts`);

        if (drivers.length) {
          explanation += `Risk is driven by: ${drivers.join('; ')}.`;
        } else {
          explanation += `No critical findings or missing items are currently flagged.`;
        }

        return {
          text: explanation,
          actions: [{ label: `View details for ${currentVendor.name}`, vendorId: currentVendor.id, detail: 'Overview & Risk Drivers' }]
        };
      } else {
        return {
          text: 'To get a detailed risk explanation, please navigate into a specific vendor profile details view or select one of the high-risk suppliers below.',
          actions: vendors.filter(v => v.risk === 'High').map(v => ({
            label: v.name,
            vendorId: v.id,
            detail: `Risk Score: ${v.riskScore}`
          }))
        };
      }
    }

    // 2. Which vendors need attention today
    if (q.includes('attention') || q.includes('need') || q.includes('today')) {
      const attentionList = vendors.filter(v => v.hasSubmittedApplication && !v.finalStatus);
      if (attentionList.length === 0) {
        return {
          text: 'All queues are clean! No vendors currently require human compliance attention.',
          actions: []
        };
      }
      return {
        text: `Here are the ${attentionList.length} vendor(s) needing attention in the queue:`,
        actions: attentionList.map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `SLA: ${v.sla} · Status: ${v.stage}`
        }))
      };
    }

    // 3. China vendors waiting approval
    if (q.includes('china') || q.includes('chinese')) {
      const chinaQueue = vendors.filter(
        v => v.hasSubmittedApplication && 
        !v.finalStatus && 
        ((v.country || '').toLowerCase().includes('china') || (v.profile?.country || '').toLowerCase().includes('china'))
      );
      if (chinaQueue.length === 0) {
        return {
          text: 'There are no suppliers from China currently awaiting approval in the queue.',
          actions: []
        };
      }
      return {
        text: `I found ${chinaQueue.length} China supplier(s) awaiting approval:`,
        actions: chinaQueue.map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: `Risk: ${v.risk} (${v.riskScore}/100)`
        }))
      };
    }

    // 4. Expired Insurance
    if (q.includes('insurance') || q.includes('expired') || q.includes('coi')) {
      const insuranceList = vendors.filter(
        v => v.documents?.some((d: any) => d.code === 'COI' && (d.status === 'Missing' || d.status === 'Flagged' || d.status === 'Rejected'))
      );
      if (insuranceList.length === 0) {
        return {
          text: 'All active vendors have valid Liability Insurance certificates on file.',
          actions: []
        };
      }
      return {
        text: 'The following suppliers have missing, flagged, or expired liability insurance certificates:',
        actions: insuranceList.map(v => ({
          label: v.name,
          vendorId: v.id,
          detail: 'COI Certificate: Missing / Expired'
        }))
      };
    }

    // Fallback info
    return {
      text: "I didn't quite catch that. Try using one of these compliance prompts:\n• 'Which vendors need attention today?'\n• 'Why is this vendor risk flagged?' (navigates active profile)\n• 'Show all vendors from China waiting approval'\n• 'Which suppliers have expired insurance?'",
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
            <h3 className="text-sm font-bold leading-tight">AI Compliance Assistant</h3>
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
              {msg.text.split('\n').map((line: string, idx: number) => <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>)}
              
              {/* Context Action Links */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-200/50 pt-2.5">
                  {msg.actions.map((act: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onOpenVendor(act.vendorId, 'vendor-details');
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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Compliance Shortcuts</p>
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
          placeholder="Ask AI Compliance copilot..."
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
