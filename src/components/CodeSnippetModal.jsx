import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  FileCode, 
  Loader2,
  Folder
} from 'lucide-react';
import { fetchCodeSnippet } from '../services/fileSnippetService';

export default function CodeSnippetModal({
  node,
  repoRoot = '',
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [snippetData, setSnippetData] = useState(null);
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    if (!node) return;

    let isMounted = true;
    setLoading(true);

    fetchCodeSnippet(node.source_file, node.source_location, repoRoot).then((data) => {
      if (isMounted) {
        setSnippetData(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [node, repoRoot]);

  if (!node) return null;

  const targetLine = snippetData?.targetLine || parseInt(String(node.source_location).replace(/[^\d]/g, ''), 10) || 1;
  const absPath = snippetData?.absolutePath || (repoRoot ? `${repoRoot.replace(/\\/g, '/').replace(/\/+$/, '')}/${node.source_file}` : node.source_file);
  const vsCodeUri = `vscode://file/${absPath}:${targetLine}`;
  const cursorUri = `cursor://file/${absPath}:${targetLine}`;

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(`${node.source_file}:${targetLine}`);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch (err) {
      console.error('Failed to copy file path:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[85vh] bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-dark-850 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  {node.displayLabel || node.label}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Line {targetLine}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate max-w-lg">
                {node.source_file}
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

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-dark-950/80 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Folder className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-sm hidden sm:inline font-mono text-[11px]">
              {absPath}
            </span>
          </div>

          {/* IDE Launch & Copy Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPath}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 border border-slate-700 font-medium transition-all"
              title="Copy relative path with line"
            >
              {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPath ? 'Copied' : 'Copy Path'}</span>
            </button>

            <a
              href={vsCodeUri}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-glow-indigo transition-all"
              title="Open in Visual Studio Code"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>VS Code</span>
            </a>

            <a
              href={cursorUri}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-glow-cyan transition-all"
              title="Open in Cursor IDE"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Cursor</span>
            </a>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="flex-1 overflow-y-auto p-4 bg-dark-950 font-mono text-xs sm:text-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p>Loading source snippet...</p>
            </div>
          ) : snippetData?.snippet ? (
            <div className="rounded-xl border border-slate-800 bg-dark-900/60 overflow-hidden">
              <div className="px-4 py-2 bg-dark-850 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Showing lines {snippetData.startLine} - {snippetData.endLine} of {snippetData.totalLines}</span>
                <span className="text-cyan-400">Target Line: {targetLine}</span>
              </div>
              <div className="divide-y divide-slate-800/40 py-1">
                {snippetData.snippet.map((line) => (
                  <div
                    key={line.lineNumber}
                    className={`flex items-start px-3 py-1 hover:bg-slate-800/30 transition-colors ${
                      line.isTarget ? 'highlight-line border-l-4 border-cyan-400 pl-2 text-cyan-200 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-12 select-none text-right pr-4 text-slate-600 text-xs">
                      {line.lineNumber}
                    </span>
                    <pre className="flex-1 overflow-x-auto whitespace-pre font-mono">
                      {line.text || ' '}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <p className="text-rose-400 font-semibold">Could not load source snippet.</p>
              <p className="text-xs text-slate-500 mt-1">{snippetData?.error || 'File not available on disk.'}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-dark-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Clicking 'VS Code' or 'Cursor' opens the source file at the exact line.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
