import React from 'react';
import AppLayout from '@/components/AppLayout';
import AIIncidentContent from './components/AIIncidentContent';

export default function AIIncidentAnalysisPage() {
  return (
    <AppLayout currentPath="/ai-incident-analysis">
      <AIIncidentContent />
    </AppLayout>
  );
}