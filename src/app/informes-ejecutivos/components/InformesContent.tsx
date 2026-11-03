'use client';
import React from 'react';
import Badge from '@/components/ui/Badge';
import { FileText, Download } from 'lucide-react';

const reports = [
  { id: 'r1', title: 'Weekly Availability Report', period: 'Sep 23–29, 2026', status: 'ready', size: '2.4 MB' },
  { id: 'r2', title: 'Monthly Capacity & Utilization', period: 'September 2026', status: 'ready', size: '5.1 MB' },
  { id: 'r3', title: 'Incident Summary — SW-CORE-01', period: 'Last 7 days', status: 'ready', size: '890 KB' },
  { id: 'r4', title: 'SLA Compliance Dashboard Export', period: 'Q3 2026', status: 'generating', size: '—' },
  { id: 'r5', title: 'Protocol Collector Health', period: 'Last 30 days', status: 'ready', size: '1.2 MB' },
];

export default function InformesContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Executive Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Availability, capacity and incident summaries for management</p>
        </div>
      </div>

      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{r.title}</p>
                <Badge variant={r.status === 'ready' ? 'success' : 'warning'}>
                  {r.status === 'ready' ? 'Ready' : 'Generating'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{r.period} · {r.size}</p>
            </div>
            {r.status === 'ready' && (
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors self-start">
                <Download size={14} />
                Download
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
