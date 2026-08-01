'use client';

import React, { useState } from 'react';
import { UserCog, KeyRound, Activity, TrendingUp, Users, Search, Mail, Phone, MapPin, Building2 } from 'lucide-react';

const TEAM = [
  { id: 't1', name: 'Sarah Chen', role: 'Super Admin', region: 'HQ — Shanghai', approved: 18, rejected: 3, rate: 86, email: 'sarah.chen@stylesphere.com' },
  { id: 't2', name: 'James Okafor', role: 'Admin', region: 'West Africa', approved: 11, rejected: 4, rate: 73, email: 'j.okafor@stylesphere.com' },
  { id: 't3', name: 'Aisha Patel', role: 'Admin', region: 'South Asia', approved: 9, rejected: 2, rate: 81, email: 'a.patel@stylesphere.com' },
  { id: 't4', name: 'Thomas Müller', role: 'Admin', region: 'Europe', approved: 14, rejected: 5, rate: 73, email: 't.mueller@stylesphere.com' },
];

const VENDOR_EXECS = [
  { id: 'e1', name: 'Wei Mingzhi', title: 'Export Director', company: 'Jinpeng Leather Goods Co.', region: 'East Asia', email: 'wei.mingzhi@jinpengleather.com', phone: '+86 21 5555 0142' },
  { id: 'e2', name: 'Chen Lihua', title: 'Operations Manager', company: 'Dongfang Footwear Export', region: 'East Asia', email: 'l.chen@dongfangfootwear.com', phone: '+86 10 5555 0198' },
  { id: 'e3', name: 'Mehmet Yilmaz', title: 'Founder & CEO', company: 'Anatolian Leather Works', region: 'West Africa', email: 'mehmet@anatolianleather.com', phone: '+90 212 555 0110' },
  { id: 'e4', name: 'Priya Sharma', title: 'Founder', company: 'Delhi Craft Circle', region: 'South Asia', email: 'priya@delhicraftcircle.in', phone: '+91 98 5555 0173' },
  { id: 'e5', name: 'Fatima Zahra', title: 'Managing Director', company: 'Casa Textile SARL', region: 'West Africa', email: 'f.zahra@casatextile.ma', phone: '+212 522 55 0141' },
  { id: 'e6', name: 'Carlos Reyes', title: 'General Manager', company: 'Bogotá Shoes Factory', region: 'Americas', email: 'carlos.reyes@bogotashoes.co', phone: '+57 1 555 0187' },
];

export default function TeamView() {
  const [execSearch, setExecSearch] = useState('');
  const [execRegion, setExecRegion] = useState('All');

  const filteredExecs = VENDOR_EXECS.filter((e) => {
    if (execRegion !== 'All' && e.region !== execRegion) return false;
    if (execSearch) {
      const q = execSearch.toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !e.company.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#F8FAFC', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Team & Roles</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>Manage admin privileges, permissions, and vendor executive contacts</p>
        </div>
        <button
          type="button"
          style={{
            height: '36px',
            padding: '0 16px',
            borderRadius: '8px',
            backgroundColor: '#059669',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            border: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Users size={15} /> Invite Admin
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px', marginBottom: '8px' }}>
            <UserCog size={16} /> Total Admins
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>4</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '12px', marginBottom: '8px' }}>
            <KeyRound size={16} /> Super Admins
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>1</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', fontSize: '12px', marginBottom: '8px' }}>
            <Activity size={16} /> Monthly Decisions
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>46</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontSize: '12px', marginBottom: '8px' }}>
            <TrendingUp size={16} /> Avg. Decisions / Day
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>3.4</div>
        </div>
      </div>

      {/* Admin Members Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
          ADMIN MEMBERS & PERFORMANCE
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', textAlign: 'left' }}>
              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Admin Name</th>
              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Region</th>
              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Approved</th>
              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Rejected</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Approval Rate</th>
            </tr>
          </thead>
          <tbody>
            {TEAM.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t.name.split(' ').map((p) => p[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.name}
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: t.role === 'Super Admin' ? '#0F172A' : '#F1F5F9', color: t.role === 'Super Admin' ? '#FFFFFF' : '#475569' }}>
                          {t.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{t.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{t.region}</td>
                <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 600 }}>{t.approved}</td>
                <td style={{ padding: '12px 16px', color: '#E11D48', fontWeight: 600 }}>{t.rejected}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>{t.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vendor Executives Directory */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Vendor Executives Directory</h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Key contacts and assigned representatives for vendor operations</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search executive or vendor..."
                value={execSearch}
                onChange={(e) => setExecSearch(e.target.value)}
                style={{ height: '34px', paddingLeft: '32px', paddingRight: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', width: '220px' }}
              />
            </div>
            <select
              value={execRegion}
              onChange={(e) => setExecRegion(e.target.value)}
              style={{ height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', backgroundColor: '#FFFFFF' }}
            >
              <option value="All">All Regions</option>
              <option value="East Asia">East Asia</option>
              <option value="South Asia">South Asia</option>
              <option value="West Africa">West Africa</option>
              <option value="Americas">Americas</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {filteredExecs.map((e) => (
            <div key={e.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{e.name}</div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 500, margin: '2px 0 8px 0' }}>{e.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#64748B' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building2 size={12} /> {e.company}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {e.region}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {e.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {e.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
