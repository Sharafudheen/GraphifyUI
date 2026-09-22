import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  Database, 
  Wrench, 
  Brain, 
  Play, 
  Copy, 
  Check, 
  Download, 
  Loader2, 
  ExternalLink,
  ChevronRight,
  Cpu
} from 'lucide-react';

export default function AiFlowReviewDrawer({
  isOpen,
  onClose,
  flow,
  aiStatus,
  onOpenSetup,
}) {
  const [activeTab, setActiveTab] = useState('explain'); // 'explain' | 'security' | 'performance' | 'refactor'
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !flow) return null;

  const handleRunReview = async (type = activeTab) => {
    setActiveTab(type);
    try {
      setLoading(true);
      setReviewResult(null);

      const res = await fetch('/api/ai/explain-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow,
          promptType: type,
          customPrompt,
        }),
      });

      const data = await res.json();
      setReviewResult(data);
    } catch (err) {
      setReviewResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReview = () => {
    if (!reviewResult?.analysis) return;
    navigator.clipboard.writeText(reviewResult.analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReview = () => {
    if (!reviewResult?.analysis) return;
    const blob = new Blob([reviewResult.analysis], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_review_${flow.id || 'flow'}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeEngineObj = aiStatus?.engines?.[aiStatus?.activeEngine] || { name: 'Active Engine' };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-2xl h-full bg-dark-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-dark-850 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  AI Architecture Review
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-cyan-300 border border-cyan-500/30">
                  {activeEngineObj.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Active Flow: <span className="font-semibold text-slate-300">{flow.title}</span> ({flow.steps?.length} steps)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Mode Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-dark-950/80 border-b border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => handleRunReview('explain')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'explain'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Architecture & Flow</span>
          </button>

          <button
            onClick={() => handleRunReview('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security & Validation</span>
          </button>

          <button
            onClick={() => handleRunReview('performance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>DB & Performance</span>
          </button>

          <button
            onClick={() => handleRunReview('refactor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'refactor'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Refactor Suggestions</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-dark-850 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Engine: <b className="text-slate-200">{activeEngineObj.name}</b></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenSetup}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Change Engine
              </button>

              <button
                onClick={() => handleRunReview(activeTab)}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{loading ? 'Analyzing Architecture...' : 'Generate Review'}</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm font-semibold text-slate-200">
                Synthesizing architectural review...
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Parsing pipeline layers, database side-effects, and branching subnodes via {activeEngineObj.name}
              </p>
            </div>
          )}

          {/* Review Output Area */}
          {!loading && reviewResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Analysis Findings
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReview}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownloadReview}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              {/* Formatted Content */}
              <div className="p-5 rounded-2xl bg-dark-950 border border-slate-800/90 text-slate-200 text-xs leading-relaxed space-y-3 font-sans whitespace-pre-wrap select-text">
                {reviewResult.analysis || reviewResult.error}
              </div>
            </div>
          )}

          {/* Initial Empty State before running */}
          {!loading && !reviewResult && (
            <div className="p-8 rounded-2xl bg-dark-850/40 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">
                Ready for AI Architectural Review
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Select a review preset above or click <b>"Generate Review"</b> to evaluate this pipeline's design, security, and performance.
              </p>
              <button
                onClick={() => handleRunReview('explain')}
                className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-semibold text-xs transition-all inline-flex items-center gap-1.5"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Run Architecture Review</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
