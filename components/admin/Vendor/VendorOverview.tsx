'use client';

import React from 'react';
import { Building2, Globe, Phone, FileText, User } from 'lucide-react';
import VendorRiskCard from './VendorRiskCard';

interface VendorOverviewProps {
  vendor: any;
}

export default function VendorOverview({ vendor }: VendorOverviewProps) {
  const profile = vendor.profile || {};

  return (
    <div className="vendor-tab-overview">
      <div className="overview-left-col">
        {/* Company Profile Section */}
        <article className="panel company-profile-panel">
          <header className="panel-heading">
            <div>
              <span className="section-kicker">Supplier Identity</span>
              <h2>Company Profile</h2>
            </div>
          </header>
          
          <div className="profile-info-grid">
            <div className="info-item">
              <span className="info-icon"><Building2 size={16} /></span>
              <div>
                <small>Legal Entity Name</small>
                <strong>{profile.legalName || vendor.name}</strong>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon"><Globe size={16} /></span>
              <div>
                <small>Country of Incorporation</small>
                <strong>{profile.country || vendor.country || 'Not Specified'}</strong>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon"><FileText size={16} /></span>
              <div>
                <small>Tax ID / Registration</small>
                <strong>{profile.taxId || 'Not Provided'}</strong>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon"><Phone size={16} /></span>
              <div>
                <small>Primary Contact Phone</small>
                <strong>{profile.phone || vendor.email || 'Not Provided'}</strong>
              </div>
            </div>
          </div>

          <div className="profile-address-section">
            <small>Registered Business Address</small>
            <p>{profile.address || 'Address verification pending onboarding form submission.'}</p>
          </div>
        </article>

        {/* AI Summary Section */}
        <article className="panel ai-summary-panel">
          <header className="panel-heading">
            <div>
              <span className="section-kicker">Copilot Insights</span>
              <h2>AI Briefing Summary</h2>
            </div>
          </header>
          <div className="ai-briefing-content">
            <p>{vendor.aiSummary || 'No AI summary available for this supplier. Run compliance agent check first.'}</p>
          </div>
        </article>
      </div>

      <div className="overview-right-col">
        {/* Rule-Based Deterministic Risk Card */}
        <VendorRiskCard vendor={vendor} />

        {/* Assigned Executive Section */}
        <article className="panel executive-assignment-panel">
          <span className="section-kicker">Operational Assignment</span>
          <div className="exec-avatar-row">
            <span className="user-avatar text-emerald-700 bg-emerald-50">
              {vendor.owner ? vendor.owner.split(' ').map((n: string) => n[0]).join('') : 'VE'}
            </span>
            <div className="exec-meta">
              <strong>{vendor.owner || 'Elena Rostova'}</strong>
              <small>Assigned Vendor Executive</small>
            </div>
          </div>
          <p className="exec-desc">
            Responsible for checking document compliance, correspondence, and final validation.
          </p>
        </article>
      </div>
    </div>
  );
}
