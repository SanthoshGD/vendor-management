'use client';

import React from 'react';
import VendorChat from '../../VendorChat';
import ChaserPanel from '../../ChaserPanel';

interface VendorCommunicationProps {
  vendor: any;
}

export default function VendorCommunication({ vendor }: VendorCommunicationProps) {
  return (
    <div className="vendor-tab-communication">
      <div className="communication-grid">
        {/* Chat Interface Column */}
        <div className="panel chat-column flex-1">
          <header className="panel-heading compact">
            <div>
              <span className="section-kicker">Vendor Portal Message Exchange</span>
              <h2>Supplier Chat correspondence</h2>
            </div>
          </header>
          <div className="chat-container">
            <VendorChat vendorId={vendor.id} selectedDocId={null} selectedFieldKey={null} />
          </div>
        </div>

        {/* Reminders / Chaser Column */}
        <div className="panel chaser-column">
          <header className="panel-heading compact">
            <div>
              <span className="section-kicker">Automated Reminders</span>
              <h2>Chaser Policy Settings</h2>
            </div>
          </header>
          <div className="chaser-container">
            <p className="description-text mb-4" style={{ marginBottom: '16px', color: 'var(--muted)', fontSize: '13px' }}>
              Define when compliance agents automatically request outstanding files from this vendor in their local language.
            </p>
            <ChaserPanel vendorId={vendor.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
