'use client';
import React, { useState } from 'react';
import DeviceConfigForm from './DeviceConfigForm';
import CollectorHealthTable from './CollectorHealthTable';

export default function DeviceConfigContent() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Device & Collector Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add Cisco devices and configure collection protocols — SNMP, NETCONF, SSH, RESTCONF
        </p>
      </div>
      <DeviceConfigForm />
      <CollectorHealthTable />
    </div>
  );
}
