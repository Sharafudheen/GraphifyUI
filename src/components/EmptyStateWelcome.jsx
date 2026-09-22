import React, { useState } from 'react';
import { 
  UploadCloud, 
  FolderOpen, 
  FileJson, 
  Sparkles, 
  ArrowRight, 
  GitFork, 
  Layers, 
  ShieldCheck, 
  Terminal,
  AlertCircle
} from 'lucide-react';

export default function EmptyStateWelcome({
  onLoadGraphFiles,
  onLoadLocalPath,
  onLoadDemo,
  isApiAvailable,
}) {
  const [localPathInput, setLocalPathInput] = useState('');
  const [graphFile, setGraphFile] = useState(null);
  const [analysisFile, setAnalysisFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGraphDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file && file.name.endsWith('.json')) {
      setGraphFile(file);
      setError(null);
    } else {
      setError('Please select a valid .json file (graph.json).');
    }
  };

  const handleAnalysisDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file && file.name.endsWith('.json')) {
      setAnalysisFile(file);
    }
  };

  const handleProcessUploadedFiles = async () => {
    if (!graphFile) {
      setError('graph.json is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const graphText = await graphFile.text();
      const parsedGraph = JSON.parse(graphText);

      let parsedAnalysis = {};
      if (analysisFile) {
        const analysisText = await analysisFile.text();
        parsedAnalysis = JSON.parse(analysisText);
      }

      onLoadGraphFiles({
        repoName: graphFile.name.replace('.json', '') || 'Uploaded Codebase',
        graph: parsedGraph,
        analysis: parsedAnalysis,
      });
    } catch (err) {
      setError(`Failed to parse graph JSON: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalPathSubmit = async (e) => {
    e.preventDefault();
    if (!localPathInput.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await onLoadLocalPath(localPathInput.trim());
    } catch (err) {
      setError(err.message || 'Failed to load repository from specified path.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-10 animate-in fade-in duration-300">
      {/* Hero Welcome */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <GitFork className="w-3.5 h-3.5" />
          <span>GraphFlow-Universal • Any Codebase, Any Framework</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          Explore Code Architecture & Flows
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Universal visual explorer for <b className="text-slate-200">Graphify</b> outputs. Upload any <code className="text-cyan-300 bg-dark-900 px-1.5 py-0.5 rounded border border-slate-800">graph.json</code> to trace multi-tier flows, track database side-effects, inspect AST sub-nodes, and detect architecture bottlenecks.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Ingestion Methods: File Upload & Local Path */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Method 1: Browser File Drag & Drop (100% Client-side) */}
        <div className="p-6 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Option 1: Upload Files
                </h3>
                <p className="text-xs text-slate-400">
                  Runs 100% in your browser without transmitting data
                </p>
              </div>
            </div>

            {/* Drag Zone for graph.json */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-4 text-center cursor-pointer bg-dark-850/50 transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleGraphDrop}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileJson className="w-6 h-6 mx-auto mb-1 text-cyan-400" />
              {graphFile ? (
                <div className="text-emerald-400 text-xs font-semibold">
                  ✓ {graphFile.name} ({(graphFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Select graph.json</span> (Required)
                </div>
              )}
            </div>

            {/* Drag Zone for .graphify_analysis.json */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-xl p-3 text-center cursor-pointer bg-dark-850/50 transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleAnalysisDrop}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {analysisFile ? (
                <div className="text-emerald-400 text-xs font-semibold">
                  ✓ {analysisFile.name}
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Optional: <span className="font-semibold text-slate-300">.graphify_analysis.json</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleProcessUploadedFiles}
            disabled={!graphFile || loading}
            className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-glow-cyan transition-all flex items-center justify-center gap-2"
          >
            <span>Parse & Launch Explorer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Method 2: Local Repo Path (Enables Live Source Snippets & IDE Deep Links) */}
        <div className="p-6 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Option 2: Local Repository Path
                </h3>
                <p className="text-xs text-slate-400">
                  Enables live code snippet previews & IDE line links
                </p>
              </div>
            </div>

            <form onSubmit={handleLocalPathSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Local Folder Path
                </label>
                <input
                  type="text"
                  value={localPathInput}
                  onChange={(e) => setLocalPathInput(e.target.value)}
                  placeholder="e.g. D:/Projects/MyRepo or /path/to/graphify-out"
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                App will locate <code className="text-cyan-400">graphify-out/graph.json</code> inside this directory and link source files directly.
              </p>
            </form>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleLocalPathSubmit}
              disabled={!localPathInput.trim() || loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-glow-indigo transition-all flex items-center justify-center gap-2"
            >
              <span>Load from Local Path</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onLoadDemo && (
              <button
                type="button"
                onClick={onLoadDemo}
                className="w-full py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-medium border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Sample / Demo Dataset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Highlights Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span><b>Multi-Tier Flows:</b> UI ➔ API ➔ Routes ➔ Controllers ➔ DB</span>
        </div>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span><b>Click to Code:</b> Instant VS Code / Cursor IDE redirection</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span><b>Architecture Reviews:</b> God functions, cycles & bottlenecks</span>
        </div>
      </div>
    </div>
  );
}
