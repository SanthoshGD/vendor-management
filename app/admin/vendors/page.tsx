'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PortalLayout from '../../../components/layout/PortalLayout';
import VendorList from '../../../components/admin/Vendor/VendorList';

export default function AdminVendorsPage() {
  const router = useRouter();

  const handleOpenVendor = (id: string) => {
    router.push(`/admin/vendor/${id}`);
  };

  return (
    <PortalLayout persona="admin">
      <VendorList onOpenVendor={handleOpenVendor} />
    </PortalLayout>
  );
}
