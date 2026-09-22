import React from 'react';
import { 
  Database, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ShieldCheck, 
  Layers,
  FileCode
} from 'lucide-react';

export default function DbSideEffectsCard({
  dbSideEffects = { reads: [], writes: [], totalInteractions: 0 },
  onSelectStep,
}) {
  const { reads, writes, totalInteractions } = dbSideEffects;

  if (totalInteractions === 0) {
    return (
      <div className="w-full bg-dark-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Database Operations & Side Effects</span>
        </div>
        <div className="p-4 rounded-xl bg-dark-850/60 border border-slate-800 text-xs text-slate-400 text-center">
          No direct database persistence or query operations detected along this flow segment.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-dark-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {/* Card Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Database Data Flow & Side Effects
            </h3>
            <p className="text-xs text-slate-400">
              Tracking state mutations and read queries across persistent models
            </p>
          </div>
        </div>

        {/* Total stats */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
            <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{reads.length} Reads</span>
          </span>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-semibold">
            <ArrowUpCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>{writes.length} Writes</span>
          </span>
        </div>
      </div>

      {/* Two-Column Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data Reads Column */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Data Queries (Reads)
            </span>
            <span className="text-[11px] font-mono text-slate-500">Query & Filter</span>
          </div>

          {reads.length === 0 ? (
            <div className="p-3 rounded-lg bg-dark-850/50 border border-slate-800/80 text-xs text-slate-500 text-center">
              No database read queries in this sequence.
            </div>
          ) : (
            <div className="space-y-2">
              {reads.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectStep?.(r)}
                  className="p-3 rounded-xl bg-dark-850/90 hover:bg-dark-800 border border-cyan-500/20 hover:border-cyan-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        Step {r.step}
                      </span>
                      <span className="font-semibold text-slate-200 group-hover:text-cyan-300">
                        {r.nodeLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">READ</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {r.description}
                  </p>
                  <div className="mt-1 text-[10px] font-mono text-slate-500 truncate">
                    {r.file}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Writes Column */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Data Mutations (Writes & Side Effects)
            </span>
            <span className="text-[11px] font-mono text-slate-500">Insert / Update</span>
          </div>

          {writes.length === 0 ? (
            <div className="p-3 rounded-lg bg-dark-850/50 border border-slate-800/80 text-xs text-slate-500 text-center">
              No database mutation or state writes in this sequence.
            </div>
          ) : (
            <div className="space-y-2">
              {writes.map((w, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectStep?.(w)}
                  className="p-3 rounded-xl bg-dark-850/90 hover:bg-dark-800 border border-rose-500/20 hover:border-rose-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        Step {w.step}
                      </span>
                      <span className="font-semibold text-slate-200 group-hover:text-rose-300">
                        {w.nodeLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-rose-400 font-mono font-bold">MUTATION</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {w.description}
                  </p>
                  <div className="mt-1 text-[10px] font-mono text-slate-500 truncate">
                    {w.file}
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
