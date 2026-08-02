'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import { VendorDashboard } from '../../../components/RedesignedApp';

export default function VendorDashboardPage() {
  return (
    <PortalLayout persona="vendor">
      <VendorDashboard />
    </PortalLayout>
  );
}
