'use client';

import React, { useState, useMemo } from 'react';
import { UserCog, KeyRound, Activity, TrendingUp, Users, Search, Mail, Phone, MapPin, Building2, Shield, Plus, X as CloseIcon, Landmark, Save, Send } from 'lucide-react';
import { useNexus } from '../../../context/NexusContext';

const INITIAL_TEAM = [
  { id: 't1', name: 'Sarah Chen', role: 'Super Admin', region: 'HQ - Shanghai', limit: 'Unlimited', approved: 18, rejected: 3, rate: 86, email: 'sarah.chen@stylesphere.com' },
  { id: 't2', name: 'James Okafor', role: 'Admin', region: 'West Africa', limit: '$250,000', approved: 11, rejected: 4, rate: 73, email: 'j.okafor@stylesphere.com' },
  { id: 't3', name: 'Aisha Patel', role: 'Admin', region: 'South Asia', limit: '$100,000', approved: 9, rejected: 2, rate: 81, email: 'a.patel@stylesphere.com' },
  { id: 't4', name: 'Thomas Müller', role: 'Admin', region: 'Europe', limit: '$250,000', approved: 14, rejected: 5, rate: 73, email: 't.mueller@stylesphere.com' },
];

const INITIAL_VENDOR_EXECS = [
  { id: 'e1', name: 'Wei Mingzhi', title: 'Export Director', company: 'Jinpeng Leather Goods Co.', region: 'East Asia', email: 'wei.mingzhi@jinpengleather.com', phone: '+86 21 5555 0142' },
  { id: 'e2', name: 'Chen Lihua', title: 'Operations Manager', company: 'Dongfang Footwear Export', region: 'East Asia', email: 'l.chen@dongfangfootwear.com', phone: '+86 10 5555 0198' },
  { id: 'e3', name: 'Mehmet Yilmaz', title: 'Founder & CEO', company: 'Anatolian Leather Works', region: 'West Africa', email: 'mehmet@anatolianleather.com', phone: '+90 212 555 0110' },
  { id: 'e4', name: 'Priya Sharma', title: 'Founder', company: 'Delhi Craft Circle', region: 'South Asia', email: 'priya@delhicraftcircle.in', phone: '+91 98 5555 0173' },
  { id: 'e5', name: 'Fatima Zahra', title: 'Managing Director', company: 'Casa Textile SARL', region: 'West Africa', email: 'f.zahra@casatextile.ma', phone: '+212 522 55 0141' },
  { id: 'e6', name: 'Carlos Reyes', title: 'General Manager', company: 'Bogotá Shoes Factory', region: 'Americas', email: 'carlos.reyes@bogotashoes.co', phone: '+57 1 555 0187' },
];

export default function TeamView() {
  const { notify } = useNexus();

  const [teamList, setTeamList] = useState(INITIAL_TEAM);
  const [execList, setExecList] = useState(INITIAL_VENDOR_EXECS);

  // Search/Filter states
  const [execSearch, setExecSearch] = useState('');
  const [execRegion, setExecRegion] = useState('All');

  // Modal toggle states
  const [activeModal, setActiveModal] = useState<'edit-admin' | 'add-exec' | 'invite-admin' | null>(null);

  // Active form data
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [adminRole, setAdminRole] = useState('');
  const [adminRegion, setAdminRegion] = useState('');
  const [adminLimit, setAdminLimit] = useState('');

  // Executive form state
  const [newExecName, setNewExecName] = useState('');
  const [newExecTitle, setNewExecTitle] = useState('');
  const [newExecCompany, setNewExecCompany] = useState('');
  const [newExecRegion, setNewExecRegion] = useState('East Asia');
  const [newExecEmail, setNewExecEmail] = useState('');
  const [newExecPhone, setNewExecPhone] = useState('');

  const filteredExecs = execList.filter((e) => {
    if (execRegion !== 'All' && e.region !== execRegion) return false;
    if (execSearch) {
      const q = execSearch.toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !e.company.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleOpenEditAdmin = (admin: any) => {
    setSelectedAdmin(admin);
    setAdminRole(admin.role);
    setAdminRegion(admin.region);
    setAdminLimit(admin.limit);
    setActiveModal('edit-admin');
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    setTeamList(current => current.map(member => {
      if (member.id === selectedAdmin.id) {
        return {
          ...member,
          role: adminRole,
          region: adminRegion,
          limit: adminLimit
        };
      }
      return member;
    }));

    notify(`✅ Roles & approval limits updated for ${selectedAdmin.name}.`, 'green');
    setActiveModal(null);
    setSelectedAdmin(null);
  };

  const handleAddExec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExecName || !newExecCompany || !newExecEmail) {
      notify('Please fill out all required fields.', 'critical');
      return;
    }

    const created: any = {
      id: `e-${Date.now()}`,
      name: newExecName,
      title: newExecTitle || 'Executive Representative',
      company: newExecCompany,
      region: newExecRegion,
      email: newExecEmail,
      phone: newExecPhone || 'Not provided'
    };

    setExecList(current => [created, ...current]);
    notify(`✅ Portal invitation email sent to ${newExecName} at ${newExecCompany}.`, 'green');

    // Reset fields
    setNewExecName('');
    setNewExecTitle('');
    setNewExecCompany('');
    setNewExecRegion('East Asia');
    setNewExecEmail('');
    setNewExecPhone('');
    setActiveModal(null);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#F8FAFC', minHeight: '100%', boxSizing: 'border-box' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Team & Roles</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>Manage admin privileges, delegating limits, and vendor executive invitations</p>
        </div>
        <button
          type="button"
          onClick={() => {
            notify('✅ Super-admin invite portal link copied to clipboard.', 'green');
          }}
          style={{
            height: '36px',
            padding: '0 16px',
            borderRadius: '8px',
            backgroundColor: '#059669',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 650,
            border: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s'
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
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>{teamList.length}</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '12px', marginBottom: '8px' }}>
            <KeyRound size={16} /> Super Admins
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
            {teamList.filter(t => t.role === 'Super Admin').length}
          </div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', fontSize: '12px', marginBottom: '8px' }}>
            <Landmark size={16} /> Active Limits
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>4 Regions</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontSize: '12px', marginBottom: '8px' }}>
            <TrendingUp size={16} /> Total Executives
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>{execList.length}</div>
        </div>
      </div>

      {/* Admin Members Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
          ADMIN MEMBERS & PERFORMANCE LIMITS (Click row to edit)
        </div>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Admin Name</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Region Scope</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Approval Limit</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Approved / Rejected</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teamList.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => handleOpenEditAdmin(t)}
                  style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background-color 0.15s' }}
                  className="hover:bg-slate-50"
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {t.name.split(' ').map((p) => p[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {t.name}
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: t.role === 'Super Admin' ? '#0F172A' : '#E2E8F0', color: t.role === 'Super Admin' ? '#FFFFFF' : '#475569' }}>
                            {t.role}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{t.region}</td>
                  <td style={{ padding: '12px 16px', color: '#0369A1', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F0F9FF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BAE6FD' }}>
                      <Landmark size={12} /> {t.limit}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{t.approved}</span> / <span style={{ color: '#E11D48', fontWeight: 600 }}>{t.rejected}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      type="button"
                      style={{ fontSize: '12px', fontWeight: 600, color: '#059669', border: 0, backgroundColor: 'transparent', cursor: 'pointer' }}
                    >
                      Edit Limit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Executives Directory */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Vendor Executives Directory</h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Key contacts and assigned representatives for vendor operations</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search executive or vendor..."
                value={execSearch}
                onChange={(e) => setExecSearch(e.target.value)}
                style={{ height: '34px', paddingLeft: '32px', paddingRight: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', width: '200px' }}
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
            <button
              type="button"
              onClick={() => setActiveModal('add-exec')}
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '6px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                border: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Plus size={14} /> Add Vendor Executive
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {filteredExecs.map((e) => (
            <div key={e.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{e.name}</div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 500, margin: '2px 0 8px 0' }}>{e.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#64748B' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building2 size={12} /> {e.company}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {e.region}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {e.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {e.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: EDIT ADMIN MEMBERS & LIMITS */}
      {activeModal === 'edit-admin' && selectedAdmin && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <header style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Edit Admin Privileges</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Configure roles, scoping regions, and authority caps</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <CloseIcon size={18} />
              </button>
            </header>

            <form onSubmit={handleSaveAdmin} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', fontSize: '13px', fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedAdmin.name.split(' ').map((p: any) => p[0]).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{selectedAdmin.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{selectedAdmin.email}</div>
                </div>
              </div>

              {/* Edit Role */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Admin Role</label>
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value)}
                  style={{ height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Auditor">Auditor</option>
                </select>
              </div>

              {/* Edit Region */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Region Scope</label>
                <select
                  value={adminRegion}
                  onChange={(e) => setAdminRegion(e.target.value)}
                  style={{ height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="HQ - Shanghai">HQ - Shanghai (All Regions)</option>
                  <option value="East Asia">East Asia</option>
                  <option value="South Asia">South Asia</option>
                  <option value="West Africa">West Africa</option>
                  <option value="Europe">Europe</option>
                  <option value="Americas">Americas</option>
                </select>
              </div>

              {/* Sets Approval Limits */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Set Approval Limit Cap</label>
                <select
                  value={adminLimit}
                  onChange={(e) => setAdminLimit(e.target.value)}
                  style={{ height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="Unlimited">Unlimited (Super-admin authority limit)</option>
                  <option value="$500,000">$500,000 ceiling</option>
                  <option value="$250,000">$250,000 ceiling</option>
                  <option value="$100,000">$100,000 ceiling</option>
                  <option value="$50,000">$50,000 ceiling</option>
                </select>
              </div>

              <footer style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: 0,
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Save size={14} /> Saves Changes
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD VENDOR EXECUTIVE */}
      {activeModal === 'add-exec' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <header style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Add Vendor Executive</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Fills Executive Profile & sends portal invitation link</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <CloseIcon size={18} />
              </button>
            </header>

            <form onSubmit={handleAddExec} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Executive Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={newExecName}
                  onChange={(e) => setNewExecName(e.target.value)}
                  style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Title / Job Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Managing Partner, Director of Export"
                  value={newExecTitle}
                  onChange={(e) => setNewExecTitle(e.target.value)}
                  style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              {/* Company */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Company *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hualong Garment Factory"
                  value={newExecCompany}
                  onChange={(e) => setNewExecCompany(e.target.value)}
                  style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              {/* Assign Region */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Assign Region *</label>
                <select
                  value={newExecRegion}
                  onChange={(e) => setNewExecRegion(e.target.value)}
                  style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="East Asia">East Asia</option>
                  <option value="South Asia">South Asia</option>
                  <option value="West Africa">West Africa</option>
                  <option value="Europe">Europe</option>
                  <option value="Americas">Americas</option>
                </select>
              </div>

              {/* Contact Profile (Email & Phone) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={newExecEmail}
                    onChange={(e) => setNewExecEmail(e.target.value)}
                    style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Phone</label>
                  <input
                    type="text"
                    placeholder="+86..."
                    value={newExecPhone}
                    onChange={(e) => setNewExecPhone(e.target.value)}
                    style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <footer style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: 0,
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Send size={14} /> Sends Invite
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
