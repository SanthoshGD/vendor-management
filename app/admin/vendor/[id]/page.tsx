'use client';

import React, { use } from 'react';
import PortalLayout from '../../../../components/layout/PortalLayout';
import VendorDetailView from '../../../../components/admin/Vendor/VendorDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminVendorDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <PortalLayout persona="admin">
      <VendorDetailView vendorId={resolvedParams.id} onBack={() => window.history.back()} />
    </PortalLayout>
  );
}
