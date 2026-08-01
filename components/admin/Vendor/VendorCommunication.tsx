'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

const MESSAGE_SEEDS: Record<string, Array<{ from: 'admin' | 'vendor'; text: string; time: string }>> = {
  v1: [
    { from: 'admin', text: 'Hi Wei, welcome to StyleSphere! Please let us know if you need help uploading your export license.', time: '2 days ago' },
    { from: 'vendor', text: 'Thank you! We have uploaded 5 of the 6 requested documents.', time: 'Yesterday, 2:15 PM' },
    { from: 'admin', text: "No problem, thanks for the update. We'll keep an eye out.", time: 'Yesterday, 5:40 PM' },
  ],
  v2: [
    { from: 'admin', text: 'Hi Chen, welcome to StyleSphere! Let us know if you have any questions during onboarding.', time: '2 days ago' },
  ],
  v3: [
    { from: 'admin', text: 'Hi Zhang, welcome to StyleSphere! Let us know if you have any questions during onboarding.', time: '2 days ago' },
  ],
  v6: [
    { from: 'admin', text: "We noticed the business name on your GST certificate doesn't quite match your registered profile name. Could you clarify or share an updated certificate?", time: 'Today, 8:20 AM' },
    { from: 'vendor', text: "Thanks for flagging that — we're mid-way through a legal entity name change. I'll send the updated certificate this week.", time: 'Today, 9:05 AM' },
  ],
  v4: [
    { from: 'admin', text: 'Your product submission was rejected due to incomplete image sets — a few listings were missing required angles.', time: '2 hrs ago' },
    { from: 'vendor', text: "Understood, I'll resubmit with the complete photo set by Friday.", time: '1 hr ago' },
  ],
};

function quickReplyFor(vendor: any, kind: string) {
  const first = vendor?.name ? vendor.name.split(' ')[0] : 'Vendor';
  if (kind === 'docs') return `Hi ${first}, could you please upload the remaining documents at your earliest convenience so we can continue the review?`;
  if (kind === 'clarify') return `Hi ${first}, we need a bit of clarification on one of your submitted documents — could you confirm the details when you get a chance?`;
  return `Hi ${first}, great news — your profile has been approved! Welcome aboard.`;
}

interface VendorCommunicationProps {
  vendor: any;
}

export default function VendorCommunication({ vendor }: VendorCommunicationProps) {
  const vendorObj = vendor || { id: 'v1', name: 'Zhang Weilong', company: 'Hualong Garment Factory' };
  const [messages, setMessages] = useState<Array<{ from: 'admin' | 'vendor'; text: string; time: string }>>(
    () => MESSAGE_SEEDS[vendorObj.id] || [
      { from: 'admin', text: `Hi ${vendorObj.name ? vendorObj.name.split(' ')[0] : 'Vendor'}, welcome to StyleSphere! Let us know if you have any questions during onboarding.`, time: '2 days ago' },
    ]
  );
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, typing]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: 'admin', text, time: 'Just now' }]);
    setDraft('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: 'vendor', text: "Thanks, noted — I'll follow up shortly.", time: 'Just now' }]);
    }, 1600);
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', minHeight: '500px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      {/* Header Bar */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
            COMMUNICATION
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            {vendorObj.name} · {vendorObj.company}
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669', fontWeight: 500 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          Vendor active
        </span>
      </div>

      {/* Chat Messages List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '75%',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '13px',
                lineHeight: '1.5',
                backgroundColor: m.from === 'admin' ? '#059669' : '#F1F5F9',
                color: m.from === 'admin' ? '#FFFFFF' : '#334155',
                borderBottomRightRadius: m.from === 'admin' ? '2px' : '12px',
                borderBottomLeftRadius: m.from === 'vendor' ? '2px' : '12px',
              }}
            >
              <div>{m.text}</div>
              <div style={{ fontSize: '11px', marginTop: '4px', color: m.from === 'admin' ? '#D1FAE5' : '#94A3B8' }}>
                {m.time}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ backgroundColor: '#F1F5F9', color: '#94A3B8', borderRadius: '12px', borderBottomLeftRadius: '2px', padding: '10px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input & Action Bar */}
      <div style={{ padding: '16px', borderTop: '1px solid #F1F5F9', flexShrink: 0, backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${vendorObj.name ? vendorObj.name.split(' ')[0] : 'vendor'}...`}
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              padding: '10px 12px',
              outline: 'none',
              maxHeight: '96px',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim()}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 0,
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
              opacity: draft.trim() ? 1 : 0.4,
              flexShrink: 0,
            }}
          >
            <Send size={15} />
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => setDraft(quickReplyFor(vendorObj, 'docs'))}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '16px', backgroundColor: '#F1F5F9', color: '#475569', border: 0, cursor: 'pointer', fontWeight: 500 }}
          >
            Request missing documents
          </button>
          <button
            type="button"
            onClick={() => setDraft(quickReplyFor(vendorObj, 'clarify'))}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '16px', backgroundColor: '#F1F5F9', color: '#475569', border: 0, cursor: 'pointer', fontWeight: 500 }}
          >
            Ask for clarification
          </button>
          <button
            type="button"
            onClick={() => setDraft(quickReplyFor(vendorObj, 'approve'))}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '16px', backgroundColor: '#F1F5F9', color: '#475569', border: 0, cursor: 'pointer', fontWeight: 500 }}
          >
            Approve &amp; notify
          </button>
        </div>
      </div>
    </div>
  );
}
