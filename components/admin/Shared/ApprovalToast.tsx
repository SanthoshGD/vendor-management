'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ApprovalToastProps {
  vendorId: string;
  vendorName: string;
  onClose: () => void;
  onViewVendor: (vendorId: string) => void;
}

export default function ApprovalToast({ vendorId, vendorName, onClose, onViewVendor }: ApprovalToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="approval-toast" role="status">
      <div className="toast-icon">
        <CheckCircle2 size={20} className="text-emerald-500 animate-bounce" />
      </div>
      <div className="toast-content">
        <strong className="toast-title">✅ Vendor Approved</strong>
        <p className="toast-body">
          Approval email and portal notification have been sent to the vendor.
        </p>
        <button
          type="button"
          className="toast-action-btn"
          onClick={() => {
            onViewVendor(vendorId);
            onClose();
          }}
        >
          View Vendor
        </button>
      </div>
      <button type="button" className="toast-close-btn" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}
