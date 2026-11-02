'use client';
import React from 'react';
import { VENDOR_META, VendorType } from '@/lib/vendorData';

interface VendorBadgeProps {
  vendor: VendorType;
  size?: 'sm' | 'md';
}

export default function VendorBadge({ vendor, size = 'sm' }: VendorBadgeProps) {
  const meta = VENDOR_META[vendor];
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded border ${sizeClass}`}
      style={{
        backgroundColor: meta.bgColor,
        borderColor: meta.borderColor,
        color: meta.textColor,
      }}
    >
      {meta.label}
    </span>
  );
}
