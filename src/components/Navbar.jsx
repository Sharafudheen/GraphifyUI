import React from 'react';
import { 
  GitFork, 
  Upload, 
  ShieldAlert, 
  FolderGit2,
  FolderOpen,
  Sparkles
} from 'lucide-react';

export default function Navbar({
  repoName = 'Codebase',
  reviewInsightsCount = 0,
  onOpenReviewPanel,
  onOpenUploadModal,
  discoveredFlows = [],
  activeFlowId,
  onSelectFlow,
  aiEngineName = 'Ollama',
  onOpenAiSetup,
  onOpenAiReview,
  hasActiveFlow = false,
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-dark-900/90 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 p-0.5 shadow-glow-cyan">
            <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
              <GitFork className="w-5 h-5 text-cyan-400 rotate-90" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                GraphFlow-Universal
              </h1>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Universal
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Generic Graphify Architecture & Flow Explorer
            </p>
          </div>
        </div>

        {/* Center: Active Repo & Dynamic Flow Selector */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/80 border border-slate-700/60 text-xs text-slate-300">
            <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Target:</span>
            <span className="font-semibold text-slate-200 truncate max-w-[160px]">
              {repoName}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>

          {discoveredFlows.length > 0 && (
            <div className="relative">
              <select
                value={activeFlowId || ''}
                onChange={(e) => onSelectFlow(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-dark-800/80 border border-slate-700/60 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[240px]"
              >
                <option value="" disabled>-- Discovered Architectural Flows --</option>
                {discoveredFlows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* AI / CLI Assistant Setup */}
          <button
            onClick={onOpenAiSetup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:to-indigo-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all shadow-sm group"
            title="Configure AI Engine (Ollama, Copilot, Cursor, Antigravity)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">AI: {aiEngineName || 'Setup'}</span>
          </button>

          {/* AI Flow Review Action */}
          {hasActiveFlow && (
            <button
              onClick={onOpenAiReview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
              title="Run AI Architectural Review on current flow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">AI Review</span>
            </button>
          )}

          {/* Review Insights */}
          <button
            onClick={onOpenReviewPanel}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all shadow-sm group"
            title="Open Code Review Insights"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Review Insights</span>
            {reviewInsightsCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {reviewInsightsCount}
              </span>
            )}
          </button>

          {/* Load/Switch Graph */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 border border-slate-700/80 text-xs font-medium transition-all"
            title="Switch or upload a different repository graph"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Switch Graph</span>
          </button>
        </div>
      </div>
    </header>
  );
}
