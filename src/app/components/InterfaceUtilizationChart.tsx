'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const InterfaceUtilizationChartInner = dynamic(
  () => import('./InterfaceUtilizationChartInner'),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted rounded-lg h-[280px] w-full" /> }
);

export default function InterfaceUtilizationChart() {
  return <InterfaceUtilizationChartInner />;
}
