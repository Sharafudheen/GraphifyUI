import React from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Database,
  Code2,
  Search
} from 'lucide-react';

export default function StepPagination({
  steps = [],
  visibleLimit = 5,
  selectedNodeId,
  onSelectStep,
  onOpenCodeModal,
  onDigNode,
  onExpandNext,
  onCollapse,
  onExpandAll,
}) {
  if (!steps || steps.length === 0) return null;

  const total = steps.length;
  const visibleSteps = steps.slice(0, visibleLimit);
  const hasMore = total > visibleLimit;

  return (
    <div className="w-full bg-dark-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
      {/* Header with Step Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">
            Pipeline Sequence Stepper
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px]">
            {Math.min(visibleLimit, total)} of {total} steps
          </span>
        </div>

        {/* Expansion / Collapse controls */}
        <div className="flex items-center gap-2">
          {hasMore && (
            <button
              onClick={onExpandNext}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>[ + Expand Next 5 Steps ]</span>
            </button>
          )}

          {hasMore && (
            <button
              onClick={onExpandAll}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Show All
            </button>
          )}

          {visibleLimit > 5 && (
            <button
              onClick={onCollapse}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-0.5"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Collapse</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Breadcrumb Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {steps.map((step, idx) => {
          const isVisible = idx < visibleLimit;
          const isSelected = selectedNodeId === step.id;

          let badgeBorder = 'border-slate-800';
          let badgeBg = 'bg-dark-850';
          let textColor = 'text-slate-300';

          if (step.dbOp?.type === 'WRITE') {
            badgeBg = 'bg-rose-500/10';
            badgeBorder = 'border-rose-500/30';
            textColor = 'text-rose-300';
          } else if (step.dbOp?.type === 'READ') {
            badgeBg = 'bg-cyan-500/10';
            badgeBorder = 'border-cyan-500/30';
            textColor = 'text-cyan-300';
          }

          if (isSelected) {
            badgeBorder = 'border-cyan-400 ring-2 ring-cyan-400/20';
            badgeBg = 'bg-cyan-950/40';
          }

          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${badgeBorder} ${badgeBg} ${textColor} transition-all ${
                  !isVisible ? 'opacity-40 hover:opacity-100' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectStep?.(step)}
                  className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity"
                  title={`Select Step ${step.stepNumber}: ${step.displayLabel} (${step.tier?.label})`}
                >
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-dark-950/80 text-slate-400">
                    {step.stepNumber}
                  </span>

                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200 truncate max-w-[120px]">
                        {step.displayLabel}
                      </span>
                      {step.dbOp && (
                        <Database className={`w-3 h-3 ${step.dbOp.type === 'WRITE' ? 'text-rose-400' : 'text-cyan-400'}`} />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                        {step.tier?.label}
                      </span>
                      {step.branches && step.branches.length > 0 && (
                        <span 
                          className="text-[9px] font-semibold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-1 py-0.2 rounded"
                          title={`${step.branches.length} parallel helper / validation branches`}
                        >
                          +{step.branches.length}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-700/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCodeModal?.(step);
                    }}
                    className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-300 transition-colors"
                    title="View Source Code & IDE Link"
                  >
                    <Code2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDigNode?.(step);
                    }}
                    className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-amber-300 transition-colors"
                    title="Dig Flow (Expand Inner Functions)"
                  >
                    <Search className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
