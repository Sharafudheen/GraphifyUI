import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileJson, 
  FolderOpen, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';

export default function UploadModal({
  isOpen,
  onClose,
  onCustomGraphLoaded,
  onLoadLocalPath,
  onLoadDemo,
}) {
  const [activeTab, setActiveTab] = useState('upload');
  const [graphFile, setGraphFile] = useState(null);
  const [analysisFile, setAnalysisFile] = useState(null);
  const [repoName, setRepoName] = useState('CustomCodebase');
  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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

      onCustomGraphLoaded({
        repoName: repoName.trim() || 'Uploaded Codebase',
        graph: parsedGraph,
        analysis: parsedAnalysis,
      });

      onClose();
    } catch (err) {
      console.error('Error parsing uploaded files:', err);
      setError(`Invalid JSON structure: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalPathSubmit = async (e) => {
    e.preventDefault();
    if (!localPath.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await onLoadLocalPath(localPath.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to load repository from specified path.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Load or Switch Repository Graph
              </h3>
              <p className="text-xs text-slate-400">
                Visualize architecture and flow for any codebase
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center rounded-lg bg-dark-850 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            File Upload (In-Browser)
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
              activeTab === 'local'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Local Folder Path
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: File Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Project / Repository Label
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                placeholder="e.g. MyCoolProject"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                1. graph.json (Required)
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-4 text-center cursor-pointer bg-dark-850/50">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleGraphDrop}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileJson className="w-6 h-6 mx-auto mb-1 text-cyan-400" />
                {graphFile ? (
                  <div className="text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{graphFile.name} ({(graphFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ) : (
                  <span className="text-slate-400">Click or Drag & Drop graph.json here</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                2. .graphify_analysis.json (Optional)
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-xl p-3 text-center cursor-pointer bg-dark-850/50">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleAnalysisDrop}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {analysisFile ? (
                  <div className="text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{analysisFile.name}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">Click or Drag & Drop .graphify_analysis.json here</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessUploadedFiles}
                disabled={!graphFile || loading}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-glow-cyan"
              >
                Load & Parse Graph
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Local Folder Path */}
        {activeTab === 'local' && (
          <form onSubmit={handleLocalPathSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Local Folder Path
              </label>
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="e.g. D:/Projects/MyProject or /path/to/graphify-out"
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Server reads graph.json and connects live source files for IDE deep linking.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {onLoadDemo && (
                <button
                  type="button"
                  onClick={() => { onLoadDemo(); onClose(); }}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Sample Demo</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!localPath.trim() || loading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-glow-indigo"
                >
                  Load Path
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
