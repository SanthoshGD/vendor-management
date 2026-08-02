'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import AdminDashboardNew from '../../../components/admin/Dashboard/AdminDashboardNew';

export default function AdminDashboardV2Page() {
  return (
    <PortalLayout persona="admin">
      <AdminDashboardNew />
    </PortalLayout>
  );
}
