'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const TrafficChartsInner = dynamic(
  () => import('./TrafficChartsInner'),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted rounded-lg h-[400px] w-full" /> }
);

export default function TrafficCharts() {
  return <TrafficChartsInner />;
}
