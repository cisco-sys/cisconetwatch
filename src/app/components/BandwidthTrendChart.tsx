'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const BandwidthTrendChartInner = dynamic(
  () => import('./BandwidthTrendChartInner'),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted rounded-lg h-[280px] w-full" /> }
);

export default function BandwidthTrendChart() {
  return <BandwidthTrendChartInner />;
}
