'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const CorrelationChartInner = dynamic(
  () => import('./CorrelationChartInner'),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted rounded-lg h-[300px] w-full" /> }
);

export default function CorrelationChart() {
  return <CorrelationChartInner />;
}
