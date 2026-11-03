'use client';
import React, { useState } from 'react';
import IncidentInputPanel from './IncidentInputPanel';
import AIResponsePanel from './AIResponsePanel';
import CorrelationChart from './CorrelationChart';
import MetricEvidenceCards from './MetricEvidenceCards';

export interface IncidentContext {
  description: string;
  device: string;
  timeWindow: string;
  severity: string;
}

export default function AIIncidentContent() {
  const [incidentContext, setIncidentContext] = useState<IncidentContext | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);

  const handleAnalyze = async (ctx: IncidentContext) => {
    setIncidentContext(ctx);
    setIsAnalyzing(true);
    setAnalysisReady(false);
    await new Promise((r) => setTimeout(r, 2800));
    setIsAnalyzing(false);
    setAnalysisReady(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">AI Incident Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Describe a network incident — AI correlates it with live metrics and generates prioritized diagnostic steps
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 self-start">
          <span className="w-2 h-2 rounded-full bg-primary live-pulse flex-shrink-0" />
          <span className="text-xs font-mono text-primary">AI Gateway Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <IncidentInputPanel onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
        <AIResponsePanel isAnalyzing={isAnalyzing} analysisReady={analysisReady} context={incidentContext} />
      </div>

      {analysisReady && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 fade-in">
          <div className="xl:col-span-2">
            <CorrelationChart />
          </div>
          <div className="xl:col-span-1">
            <MetricEvidenceCards />
          </div>
        </div>
      )}
    </div>
  );
}
