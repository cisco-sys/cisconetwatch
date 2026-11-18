'use client';
import React from 'react';
import DeviceConfigForm from './DeviceConfigForm';
import CollectorHealthTable from './CollectorHealthTable';

export default function DeviceConfigContent() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Device & Collector Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Production inventory only: devices are stored unverified until a LAN collector reports status.
          Collectors below are loaded from Supabase — empty means none are registered.
        </p>
      </div>
      <DeviceConfigForm />
      <CollectorHealthTable />
    </div>
  );
}
