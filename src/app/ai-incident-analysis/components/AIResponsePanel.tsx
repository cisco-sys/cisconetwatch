'use client';
import React from 'react';
import Badge from '@/components/ui/Badge';
import { BrainCircuit, CheckCircle2, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { IncidentContext } from './AIIncidentContent';

interface Props {
  isAnalyzing: boolean;
  analysisReady: boolean;
  context: IncidentContext | null;
}

const diagnosticSteps = [
  {
    id: 'step-diag-1',
    priority: 1,
    severity: 'critical' as const,
    title: 'Verify GigabitEthernet0/1 physical layer',
    detail: 'The interface shows 94% utilization with a linkDown trap received at 20:08 UTC. Run `show interface GigabitEthernet0/1` to check for input errors, CRC errors, and duplex mismatches.',
    command: 'show interface GigabitEthernet0/1',
    protocol: 'SSH',
  },
  {
    id: 'step-diag-2',
    priority: 2,
    severity: 'critical' as const,
    title: 'Investigate SNMP trap storm origin on SW-CORE-01',
    detail: 'Trap count is 1,847 in the last hour — 340% above baseline. Check `show log | include %LINK` and `show spanning-tree detail` to identify the source port.',
    command: 'show log | include %LINK',
    protocol: 'SSH',
  },
  {
    id: 'step-diag-3',
    priority: 3,
    severity: 'major' as const,
    title: 'Check upstream RTR-EDGE-03 reachability path',
    detail: 'RTR-EDGE-03 is unreachable and is the upstream router for SW-CORE-01 Gi0/1. Use traceroute to determine where the path breaks.',
    command: 'traceroute 10.0.0.3 source 10.0.0.1',
    protocol: 'SSH',
  },
  {
    id: 'step-diag-4',
    priority: 4,
    severity: 'major' as const,
    title: 'Validate spanning tree root and topology',
    detail: 'Confirm the root bridge and check for ports in TCN state that could cause flooding.',
    command: 'show spanning-tree vlan 10,20 detail',
    protocol: 'SSH',
  },
  {
    id: 'step-diag-5',
    priority: 5,
    severity: 'minor' as const,
    title: 'Review QoS policy on congested interfaces',
    detail: 'With 94% utilization on Gi0/1 and packet loss, QoS drops may be contributing. Check drop counters per class.',
    command: 'show policy-map interface GigabitEthernet0/1',
    protocol: 'SSH',
  },
];

const severityBadge: Record<string, 'danger' | 'accent' | 'warning'> = {
  critical: 'danger',
  major: 'accent',
  minor: 'warning',
};

export default function AIResponsePanel({ isAnalyzing, analysisReady, context }: Props) {
  if (!isAnalyzing && !analysisReady) {
    return (
      <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <BrainCircuit size={22} className="text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">AI Diagnosis Ready</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Describe an incident on the left and click Analyze. The AI will correlate your description with live device metrics and generate prioritized diagnostic steps.
        </p>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 px-8 text-center">
        <Loader2 size={32} className="text-primary animate-spin mb-4" />
        <h3 className="text-base font-semibold text-foreground mb-2">Correlating Metrics...</h3>
        <div className="space-y-2 text-sm text-muted-foreground max-w-sm">
          <p>Fetching interface metrics for {context?.device}</p>
          <p>Querying SNMP trap history (last {context?.timeWindow})</p>
          <p>Sending context to AI Gateway</p>
          <p>Generating diagnostic steps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">AI Diagnostic Report</h2>
          <Badge variant="primary">GPT-4o via AI Gateway</Badge>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-success" />
          <span className="text-xs text-success font-mono">Analysis complete</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-danger mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Root Cause Assessment</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                High confidence (87%) that the incident is caused by a physical layer issue on GigabitEthernet0/1 of SW-CORE-01, combined with a spanning tree topology change triggered by the upstream RTR-EDGE-03 failure.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Prioritized Diagnostic Steps
          </p>
          <div className="space-y-3">
            {diagnosticSteps.map((step) => (
              <div
                key={step.id}
                className="border border-border rounded-xl p-4 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono ${
                    step.priority === 1 ? 'bg-danger/20 text-danger border border-danger/30' :
                    step.priority === 2 ? 'bg-accent/20 text-accent border border-accent/30' :
                    step.priority <= 4 ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {step.priority}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-foreground">{step.title}</span>
                      <Badge variant={severityBadge[step.severity]}>{step.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{step.detail}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted border border-border rounded px-2 py-1 text-primary">
                        {step.command}
                      </code>
                      <span className="text-xs text-muted-foreground">via {step.protocol}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            Generated · Model: gpt-4o
          </span>
          <button className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            Export report <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
