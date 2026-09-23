import React, { useState, useEffect } from 'react';
import { Search, X, CornerDownLeft, Sparkles, Wand2, Loader2, ChevronRight, CheckCircle2, RefreshCw } from 'lucide-react';

const SUGGESTION_PLACEHOLDER = [
  'AddPO.jsx complete save-to-database flow',
  'User login authentication end-to-end',
  'Product listing fetch from database flow',
];

const ITERATION_OPTIONS = [2, 3, 5];

export default function SearchSection({
  searchQuery,
  onSearch,
  activeFlow,
  aiStatus,
  aiEnabled = false,
  onAiToggle,
  loopEnabled = false,
  onLoopToggle,
  maxIterations = 3,
  onMaxIterationsChange,
  iterationCount = 0,
}) {
  const [localQuery, setLocalQuery] = useState(searchQuery || '');
  const [refining, setRefining] = useState(false);
  const [refinedQuery, setRefinedQuery] = useState(null);

  const engineId    = aiStatus?.activeEngine || 'ai';
  const engineName  = aiStatus?.engines?.[engineId]?.name?.split(' ')[0] || 'AI';
  const engineReady = aiStatus?.engines?.[engineId]?.available ?? false;

  // Sync when parent changes searchQuery (e.g. dropdown selection)
  useEffect(() => {
    setLocalQuery(searchQuery || '');
    setRefinedQuery(null);
  }, [searchQuery]);

  // Whether the trace is actively running (refining or iterating)
  const isTracing = refining || (iterationCount > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const raw = localQuery.trim();
    if (!raw) return;

    if (aiEnabled && engineReady) {
      setRefining(true);
      setRefinedQuery(null);
      try {
        const res = await fetch('/api/ai/refine-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: raw, engine: engineId }),
        });
        if (res.ok) {
          const data = await res.json();
          setRefinedQuery(data);
          onSearch(data.refinedQuery || raw);
        } else {
          onSearch(raw);
        }
      } catch {
        onSearch(raw);
      } finally {
        setRefining(false);
      }
    } else {
      onSearch(raw);
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    setRefinedQuery(null);
    onSearch('');
  };

  const suggestions = refinedQuery?.suggestions || SUGGESTION_PLACEHOLDER;

  // Cycle maxIterations through options on click
  const cycleMaxIterations = (e) => {
    e.stopPropagation();
    const idx = ITERATION_OPTIONS.indexOf(maxIterations);
    const next = ITERATION_OPTIONS[(idx + 1) % ITERATION_OPTIONS.length];
    onMaxIterationsChange?.(next);
  };

  return (
    <section className="w-full rounded-2xl bg-dark-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl">
      <div className="w-full space-y-3">

        {/* ── Search Bar Row ───────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex items-center w-full gap-2">
          {/* Search Icon (inside input) */}
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-5 h-5 text-cyan-400" />
            </div>
            <input
              type="text"
              value={localQuery}
              onChange={(e) => { setLocalQuery(e.target.value); setRefinedQuery(null); }}
              placeholder='e.g. "AddPO.jsx flow of save into db" or "How does user auth work?"'
              className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-dark-900/90 border border-slate-700/80 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-lg transition-all font-sans"
            />
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ── AI Toggle ─────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={onAiToggle}
            title={aiEnabled ? `AI Refinement ON (${engineName})` : 'Enable AI query refinement'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 select-none ${
              aiEnabled
                ? 'bg-violet-600/25 border-violet-500/60 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                : 'bg-dark-800 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Wand2 className={`w-3.5 h-3.5 ${aiEnabled ? 'text-violet-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{engineName}</span>
            <span className={`relative inline-flex w-7 h-3.5 rounded-full transition-colors ${aiEnabled ? 'bg-violet-500' : 'bg-slate-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${aiEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </span>
          </button>

          {/* ── Loop Toggle (only visible when AI is ON) ───────────────── */}
          {aiEnabled && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={onLoopToggle}
                title={loopEnabled ? `AI Loop ON — reruns up to ${maxIterations}× to get deeper results` : 'Enable AI iterative re-query loop'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all select-none ${
                  loopEnabled
                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-dark-800 border-slate-700/80 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loopEnabled && iterationCount > 0 ? 'animate-spin' : ''} ${loopEnabled ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>Loop</span>
                {/* Active iteration counter */}
                {loopEnabled && iterationCount > 0 && (
                  <span className="text-[10px] font-bold text-emerald-200 bg-emerald-600/30 px-1.5 rounded animate-pulse">
                    {iterationCount}/{maxIterations}
                  </span>
                )}
              </button>

              {/* Max iterations picker (only when loop is ON) */}
              {loopEnabled && (
                <button
                  type="button"
                  onClick={cycleMaxIterations}
                  title={`Max ${maxIterations} iterations — click to cycle (2 → 3 → 5)`}
                  className="px-2 py-2 rounded-lg border border-slate-700/60 bg-dark-800 text-slate-400 hover:text-emerald-300 hover:border-emerald-600/40 text-xs font-mono font-bold transition-colors"
                >
                  {maxIterations}×
                </button>
              )}
            </div>
          )}

          {/* ── Trace Flow Button ─────────────────────────────────────── */}
          <button
            type="submit"
            disabled={isTracing}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow transition-all flex-shrink-0 ${
              isTracing
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 opacity-75 cursor-wait'
                : aiEnabled
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500'
            }`}
          >
            {isTracing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>{iterationCount > 0 ? `Iter ${iterationCount}…` : 'Refining…'}</span></>
              : <><span>Trace Flow</span><CornerDownLeft className="w-3.5 h-3.5" /></>
            }
          </button>
        </form>

        {/* ── AI Loop Status Row (when loop is active) ────────────────────── */}
        {aiEnabled && loopEnabled && iterationCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 animate-in fade-in">
            <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" />
            <span>
              AI loop running — iteration <b>{iterationCount}</b> of <b>{maxIterations}</b> max.
              If result is shallow, AI re-queries targeting deeper backend layers.
            </span>
          </div>
        )}

        {/* ── Refined Query Banner ─────────────────────────────────────────── */}
        {aiEnabled && refinedQuery && (
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs animate-in fade-in duration-300">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-violet-400 font-semibold uppercase tracking-wide text-[10px]">
                  {refinedQuery.engine === 'rule-based' ? 'Normalised Query' : `${engineName} Refined`}
                </span>
                <p className="text-slate-200 font-medium mt-0.5 break-words">{refinedQuery.refinedQuery}</p>
                <p className="text-slate-500 mt-0.5">Original: <span className="italic">{refinedQuery.originalQuery}</span></p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setLocalQuery(refinedQuery.refinedQuery); setRefinedQuery(null); }}
              className="text-[10px] px-2 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-violet-300 border border-violet-500/30 font-medium flex-shrink-0 transition-colors"
            >
              Edit
            </button>
          </div>
        )}

        {/* ── Prompt Suggestions (when AI is ON) ──────────────────────────── */}
        {aiEnabled && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium uppercase tracking-wide">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span>Suggested Queries</span>
              {loopEnabled && <span className="text-emerald-500">· Loop will iterate if result is shallow</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setLocalQuery(s); setRefinedQuery(null); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800/80 hover:bg-violet-950/50 border border-slate-700/60 hover:border-violet-500/40 text-slate-300 hover:text-violet-200 text-xs transition-all"
                >
                  <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Active Flow Banner ───────────────────────────────────────────── */}
        {activeFlow && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-dark-850/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                ACTIVE FLOW
              </span>
              <span className="font-semibold text-slate-200 text-sm">{activeFlow.title}</span>
              <span className="text-slate-400 hidden md:inline">• {activeFlow.description}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="font-mono text-cyan-400 font-semibold">{activeFlow.totalSteps}</span>
              <span>Sequence Steps Computed</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
