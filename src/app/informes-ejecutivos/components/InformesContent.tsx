'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import { FileText, Download, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ReportRow {
  id: string;
  title: string;
  period?: string | null;
  status?: string | null;
  size_label?: string | null;
  created_at?: string;
  file_url?: string | null;
}

export default function InformesContent() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setReports(data as ReportRow[]);
    else setReports([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Executive Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reports stored in Supabase. Generated files appear when the reporting job writes them.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-2">
          <FileText size={22} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No reports yet</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            When availability or capacity jobs write rows into the reports table, they will list here. Demo PDFs are not shown.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const ready = (r.status ?? 'ready') === 'ready';
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <Badge variant={ready ? 'success' : 'warning'}>{ready ? 'Ready' : r.status ?? 'Pending'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.period ?? (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—')}
                    {r.size_label ? ` · ${r.size_label}` : ''}
                  </p>
                </div>
                {ready && r.file_url && (
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors self-start"
                  >
                    <Download size={14} />
                    Download
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
