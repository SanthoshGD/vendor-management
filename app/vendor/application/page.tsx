'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import { VendorOnboarding } from '../../../components/RedesignedApp';

export default function VendorApplicationPage() {
  return (
    <PortalLayout persona="vendor">
      <VendorOnboarding />
    </PortalLayout>
  );
}
