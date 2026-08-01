'use client';

import React, { useState } from 'react';
import { MessageSquareText, Send, Clock, ShieldCheck, UserCheck, StickyNote } from 'lucide-react';
import VendorChat from '../../VendorChat';
import ChaserPanel from '../../ChaserPanel';

interface VendorCommunicationProps {
  vendor: any;
}

export default function VendorCommunication({ vendor }: VendorCommunicationProps) {
  const [internalNotes, setInternalNotes] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
    {
      id: 'n1',
      author: 'Priya Sharma (Vendor Executive)',
      text: 'Verified tax registration details against state database. Verified bank letter match.',
      time: 'Yesterday, 3:15 PM',
    },
  ]);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setInternalNotes(prev => [
      {
        id: `n-${Date.now()}`,
        author: 'You (Admin)',
        text: newNote.trim(),
        time: 'Just now',
      },
      ...prev,
    ]);
    setNewNote('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Split: Vendor Chat & Chaser Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Vendor Chat Column */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '12px' }}>
            DIRECT SUPPLIER MESSAGING
          </div>
          <VendorChat vendorId={vendor?.id || 'v1'} selectedDocId={null} selectedFieldKey={null} />
        </div>

        {/* Chaser Panel Column */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>
            AUTOMATED CHASER POLICY
          </div>
          <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '16px' }}>
            Automated compliance follow-up schedule and language preferences.
          </p>
          <ChaserPanel vendorId={vendor?.id || 'v1'} />
        </div>
      </div>

      {/* Internal Notes & Timeline Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Internal Notes */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '12px' }}>
            <StickyNote size={14} /> INTERNAL TEAM NOTES
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add an internal note for compliance team..."
              style={{
                flex: 1,
                fontSize: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                outline: 'none',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button
              type="button"
              onClick={handleAddNote}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                border: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Send size={13} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {internalNotes.map((note) => (
              <div key={note.id} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{note.author}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{note.time}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5 }}>{note.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Communication Timeline */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px' }}>
            <Clock size={14} /> COMMUNICATION TIMELINE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', marginTop: '6px', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#0F172A' }}>Portal Invitation Sent</strong>
                <p style={{ color: '#64748B', margin: '2px 0 0 0', fontSize: '11px' }}>Sent to {vendor?.email || 'vendor@example.com'} by Elena Rostova</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6', marginTop: '6px', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#0F172A' }}>Chaser Reminder Dispatched</strong>
                <p style={{ color: '#64748B', margin: '2px 0 0 0', fontSize: '11px' }}>Automated reminder sent for Tax Certificate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
