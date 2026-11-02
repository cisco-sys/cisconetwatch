import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-muted rounded-md ${className}`} />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-6 w-6 bg-muted rounded" />
      </div>
      <div className="h-8 w-20 bg-muted rounded mb-2" />
      <div className="h-3 w-32 bg-muted rounded" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 8 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`skel-col-${i}`} className="px-4 py-3">
          <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-muted rounded-lg w-full"
      style={{ height }}
    />
  );
}
