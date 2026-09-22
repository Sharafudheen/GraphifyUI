import React, { useState } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';

export default function SearchSection({
  searchQuery,
  onSearch,
  activeFlow,
}) {
  const [localQuery, setLocalQuery] = useState(searchQuery || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearch('');
  };

  return (
    <section className="w-full rounded-2xl bg-dark-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl">
      <div className="w-full space-y-3.5">
        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center w-full">
          <div className="absolute left-4 pointer-events-none text-slate-400">
            <Search className="w-5 h-5 text-cyan-400" />
          </div>

          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder='Ask any natural language query, e.g. "How does authentication flow work?" or "Trace file upload path"'
            className="w-full pl-12 pr-32 py-3.5 rounded-xl bg-dark-900/90 border border-slate-700/80 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-lg transition-all font-sans"
          />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-cyan transition-all"
            >
              <span>Trace Flow</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>


        {/* Active Flow Intent Banner */}
        {activeFlow && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-dark-850/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                ACTIVE FLOW
              </span>
              <span className="font-semibold text-slate-200 text-sm">
                {activeFlow.title}
              </span>
              <span className="text-slate-400 hidden md:inline">
                • {activeFlow.description}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="font-mono text-cyan-400 font-semibold">
                {activeFlow.totalSteps}
              </span>
              <span>Sequence Steps Computed</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
