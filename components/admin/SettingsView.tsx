'use client';

import React from 'react';
import { useNexus } from '../../context/NexusContext';
import { Settings, Bell, Sliders, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SettingsView({ onModal }: { onModal?: (modal: any) => void }) {
  const { settings, updateSettings, resetDemo, notify } = useNexus();

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
          Manage your Admin Portal preferences and demo workspace options
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Workspace Preference */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sliders size={18} className="text-slate-600" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Portal Display Preferences
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#334155' }}>
              <div>
                <strong>Notifications</strong>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0 0' }}>Show toast notifications for vendor approvals and actions.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => updateSettings({ notifications: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#334155' }}>
              <div>
                <strong>Density Mode</strong>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0 0' }}>Adjust layout padding and list row heights.</p>
              </div>
              <select
                value={settings.density || 'comfortable'}
                onChange={(e) => updateSettings({ density: e.target.value })}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
          </div>
        </div>

        {/* Demo Management */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <RefreshCw size={18} className="text-slate-600" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Demo State Reset
            </h3>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
            Reset all local state back to initial demo data (vendors, documents, products, and activity logs).
          </p>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all demo data back to its original state?')) {
                resetDemo();
                notify('Demo workspace reset to default initial state.');
              }
            }}
            style={{
              marginTop: '16px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Reset Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}
