'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import ActivityView from '../../../components/admin/Activity/ActivityView';

export default function AdminActivityPage() {
  return (
    <PortalLayout persona="admin">
      <ActivityView />
    </PortalLayout>
  );
}
