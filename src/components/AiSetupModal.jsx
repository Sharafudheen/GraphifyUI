import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Terminal, 
  Cpu, 
  HardDrive, 
  Zap, 
  ExternalLink,
  ChevronRight,
  Play,
  Copy,
  Check
} from 'lucide-react';

export default function AiSetupModal({
  isOpen,
  onClose,
  onOpenAiReview,
  currentFlow,
}) {
  const [loading, setLoading] = useState(false);
  const [startingOllama, setStartingOllama] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [selectedEngine, setSelectedEngine] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingAi, setTestingAi] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState('');

  // Fetch status on open
  useEffect(() => {
    if (isOpen) {
      fetchAiStatus();
    }
  }, [isOpen]);

  const fetchAiStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/status');
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
        setSelectedEngine(data.activeEngine || 'ollama');
        if (data.engines?.ollama?.models?.length > 0) {
          setSelectedModel(data.selectedModel || data.engines.ollama.models[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEngine = async (engineId) => {
    setSelectedEngine(engineId);
    try {
      await fetch('/api/ai/set-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engineId, model: selectedModel }),
      });
      fetchAiStatus();
    } catch (err) {
      console.error('Failed to set active engine:', err);
    }
  };

  const handleStartOllama = async () => {
    try {
      setStartingOllama(true);
      const res = await fetch('/api/ai/start-ollama', { method: 'POST' });
      if (res.ok) {
        await new Promise(r => setTimeout(r, 2000));
        await fetchAiStatus();
      }
    } catch (err) {
      console.error('Failed to start Ollama:', err);
    } finally {
      setStartingOllama(false);
    }
  };

  const handleTestEngine = async () => {
    if (!currentFlow) return;
    try {
      setTestingAi(true);
      setTestResult(null);
      const res = await fetch('/api/ai/explain-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: currentFlow,
          promptType: 'explain',
          model: selectedModel,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingAi(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(''), 2000);
  };

  if (!isOpen) return null;

  const engines = aiStatus?.engines || {
    copilot: { name: 'GitHub Copilot CLI', status: 'Checking...' },
    cursor: { name: 'Cursor CLI', status: 'Checking...' },
    ollama: { name: 'Local Offline AI (Ollama)', status: 'Checking...' },
    antigravity: { name: 'Antigravity CLI (agy)', status: 'Checking...' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-dark-850 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Multi-Engine AI / CLI Integration Layer</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  One-Click Setup
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure your preferred local or CLI assistant engine for automated code architecture reviews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAiStatus}
              disabled={loading}
              className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-cyan-300 border border-slate-700/80 transition-all"
              title="Rescan System"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Engine Summary Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-dark-850 border border-cyan-500/30 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Current Active Engine:</span>
                <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>{engines[selectedEngine]?.name || selectedEngine}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    engines[selectedEngine]?.available
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {engines[selectedEngine]?.status || 'Checking'}
                  </span>
                </div>
              </div>
            </div>

            {currentFlow && (
              <button
                onClick={handleTestEngine}
                disabled={testingAi}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{testingAi ? 'Testing Connection...' : 'Test AI Verification'}</span>
              </button>
            )}
          </div>

          {/* Test Result Feedback */}
          {testResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in duration-200 ${
              testResult.success
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                  {testResult.success ? `Verification Succeeded (${testResult.engine})` : 'Verification Failed'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{testResult.timestamp || ''}</span>
              </div>
              <p className="text-[11px] leading-relaxed line-clamp-3 text-slate-300">
                {testResult.analysis || testResult.error}
              </p>
              {testResult.success && onOpenAiReview && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAiReview();
                    }}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>Open Full AI Architectural Review Drawer</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4 Engine Cards Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select & Configure Assistant Engine
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Local Offline AI (Ollama) */}
              <div 
                onClick={() => handleSelectEngine('ollama')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                  selectedEngine === 'ollama'
                    ? 'bg-dark-850 border-cyan-400 ring-2 ring-cyan-400/20 shadow-lg'
                    : 'bg-dark-850/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          <span>Local Offline AI</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">Ollama</span>
                        </div>
                        <span className="text-[11px] text-slate-400">100% Offline • Zero Cloud Dependencies</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      engines.ollama?.daemonRunning
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : engines.ollama?.available
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {engines.ollama?.status || 'Not Installed'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {engines.ollama?.details || 'Run local LLMs like DeepSeek-Coder, Llama 3, or Qwen directly on your machine.'}
                  </p>

                  {/* Ollama Model Selector if Online */}
                  {engines.ollama?.daemonRunning && engines.ollama?.models?.length > 0 && (
                    <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                        Active Local Model:
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => {
                          setSelectedModel(e.target.value);
                          handleSelectEngine('ollama');
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                      >
                        {engines.ollama.models.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Start Server Button if offline but installed */}
                  {engines.ollama?.available && !engines.ollama?.daemonRunning && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartOllama();
                      }}
                      disabled={startingOllama}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{startingOllama ? 'Starting Ollama Daemon...' : 'Start Ollama Server (Port 11434)'}</span>
                    </button>
                  )}
                </div>

                {/* Footer Command */}
                {engines.ollama?.installCmd && !engines.ollama?.daemonRunning && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate max-w-[200px]">{engines.ollama.installCmd}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(engines.ollama.installCmd);
                      }}
                      className="text-slate-400 hover:text-cyan-300 p-1"
                      title="Copy install command"
                    >
                      {copiedCmd === engines.ollama.installCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Antigravity CLI (agy) */}
              <div 
                onClick={() => handleSelectEngine('antigravity')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                  selectedEngine === 'antigravity'
                    ? 'bg-dark-850 border-cyan-400 ring-2 ring-cyan-400/20 shadow-lg'
                    : 'bg-dark-850/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          <span>Antigravity CLI</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">agy</span>
                        </div>
                        <span className="text-[11px] text-slate-400">Autonomous Agentic Architecture</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      engines.antigravity?.available
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {engines.antigravity?.status || 'Not Installed'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {engines.antigravity?.details || 'Antigravity IDE & Autonomous Agent execution environment.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Antigravity Platform Active</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* 3. GitHub Copilot CLI */}
              <div 
                onClick={() => handleSelectEngine('copilot')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                  selectedEngine === 'copilot'
                    ? 'bg-dark-850 border-cyan-400 ring-2 ring-cyan-400/20 shadow-lg'
                    : 'bg-dark-850/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          <span>GitHub Copilot CLI</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">gh copilot</span>
                        </div>
                        <span className="text-[11px] text-slate-400">Terminal Command Suggestions</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      engines.copilot?.available
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {engines.copilot?.status || 'Not Installed'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {engines.copilot?.details || 'Execute interactive shell queries and flow analysis via GitHub Copilot CLI.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="truncate max-w-[200px]">{engines.copilot?.installCmd}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(engines.copilot.installCmd);
                    }}
                    className="text-slate-400 hover:text-cyan-300 p-1"
                    title="Copy command"
                  >
                    {copiedCmd === engines.copilot?.installCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 4. Cursor CLI */}
              <div 
                onClick={() => handleSelectEngine('cursor')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                  selectedEngine === 'cursor'
                    ? 'bg-dark-850 border-cyan-400 ring-2 ring-cyan-400/20 shadow-lg'
                    : 'bg-dark-850/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          <span>Cursor CLI / IDE</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">cursor</span>
                        </div>
                        <span className="text-[11px] text-slate-400">AI Code Editor Integration</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      engines.cursor?.available
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {engines.cursor?.status || 'Not Installed'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {engines.cursor?.details || 'Connect with Cursor AI editor for multi-file codebase reasoning.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="truncate max-w-[200px]">{engines.cursor?.installCmd}</span>
                  <a
                    href="https://cursor.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-cyan-300 p-1 flex items-center gap-1"
                  >
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-dark-850 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Selected: <span className="font-semibold text-slate-200">{engines[selectedEngine]?.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleSelectEngine(selectedEngine);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-xs shadow-md transition-all"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
