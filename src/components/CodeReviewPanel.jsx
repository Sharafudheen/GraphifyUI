import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Flame, 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight,
  Filter,
  CheckCircle2
} from 'lucide-react';

export default function CodeReviewPanel({
  insights,
  isOpen,
  onClose,
  onSelectNodeById,
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('gods');

  const {
    totalIssues = 0,
    gods = [],
    surprises = [],
    circularDependencies = [],
    deepCallStacks = [],
    errorBoundaryRisks = [],
  } = insights || {};

  const tabs = [
    { id: 'gods', label: 'God Functions', count: gods.length, icon: Flame, color: 'text-amber-400' },
    { id: 'surprises', label: 'Boundary Surprises', count: surprises.length, icon: Zap, color: 'text-cyan-400' },
    { id: 'cycles', label: 'Circular Deps', count: circularDependencies.length, icon: RefreshCw, color: 'text-rose-400' },
    { id: 'deepStacks', label: 'Deep Stacks', count: deepCallStacks.length, icon: TrendingUp, color: 'text-indigo-400' },
    { id: 'errors', label: 'Error Boundaries', count: errorBoundaryRisks.length, icon: AlertTriangle, color: 'text-orange-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-xl h-full bg-dark-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-dark-850 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Code Review Insights & Bottlenecks
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[11px] font-bold border border-rose-500/30">
                  {totalIssues} Detected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Architectural hotspots extracted from call graph & AST analysis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-dark-950/80 border-b border-slate-800 overflow-x-auto text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-dark-900 text-[10px] font-mono text-slate-400">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: God Functions */}
          {activeTab === 'gods' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Functions with abnormally high degree connectivity. Changes to these nodes trigger severe ripple effects across modules.
              </p>

              {gods.map((g, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectNodeById?.(g.id)}
                  className="p-4 rounded-xl bg-dark-850/80 hover:bg-dark-800 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-slate-200 group-hover:text-amber-300 font-mono">
                        {g.label}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-semibold">
                      {g.degree} Connections
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {g.reason}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Architectural Boundary Surprises */}
          {activeTab === 'surprises' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Surprise cross-community links where peripheral nodes skip domain boundaries and jump directly into distant hubs.
              </p>

              {surprises.map((s, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-dark-850/80 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-slate-200 font-mono">
                        {s.source} ➔ {s.target}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      Surprise
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {s.reason}
                  </p>
                  <div className="text-[11px] font-mono text-slate-500 divide-y divide-slate-800/60 pt-1">
                    {s.sourceFiles.map((f, i) => (
                      <div key={i} className="truncate py-0.5">• {f}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Circular Dependencies */}
          {activeTab === 'cycles' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Detected cyclic dependency loops in the call graph. Potential risks for infinite recursion, deadlocks, or bundler memory bloat.
              </p>

              {circularDependencies.map((c, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-dark-850/80 border border-rose-500/30 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-rose-400 animate-spin-slow" />
                      <span className="font-bold text-rose-300">
                        Recursion / Cycle ({c.length} Hops)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      {c.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {c.reason}
                  </p>

                  <div className="p-2.5 rounded-lg bg-dark-950 font-mono text-[11px] text-slate-400 space-y-1">
                    {c.cycle.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-rose-400 font-bold">{i + 1}.</span>
                        <span className="text-slate-300">{step}</span>
                        {i < c.cycle.length - 1 && <span className="text-slate-600">➔</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Deep Call Stacks */}
          {activeTab === 'deepStacks' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Chains of function calls exceeding 4 hops. Deep stacks complicate debugging and stack trace tracing.
              </p>

              {deepCallStacks.map((d, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-dark-850/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-slate-200">
                        {d.starter}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
                      Depth {d.depth}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {d.reason}
                  </p>

                  <div className="p-2.5 rounded-lg bg-dark-950 font-mono text-[11px] text-slate-400 space-y-1">
                    {d.path.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-indigo-400 font-bold">{i + 1}.</span>
                        <span className="text-slate-300 truncate">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: Error Boundary Risks */}
          {activeTab === 'errors' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Frontend UI components invoking network API clients directly without dedicated error boundary wrappers or try/catch blocks.
              </p>

              {errorBoundaryRisks.map((err, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-dark-850/80 border border-orange-500/30 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      <span className="font-bold text-slate-200">
                        {err.component}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold">
                      Unhandled Risk
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {err.reason}
                  </p>

                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    {err.file}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
