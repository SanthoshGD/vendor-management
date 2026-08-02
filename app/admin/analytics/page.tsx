'use client';

import React from 'react';
import PortalLayout from '../../../components/layout/PortalLayout';
import AnalyticsView from '../../../components/admin/Analytics/AnalyticsView';

export default function AdminAnalyticsPage() {
  return (
    <PortalLayout persona="admin">
      <AnalyticsView />
    </PortalLayout>
  );
}
