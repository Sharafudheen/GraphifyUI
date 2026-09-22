import { exec, execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Active AI Engine selection state
let activeEngine = 'ollama';
let selectedModel = '';
let hasUserChosenEngine = false;

const HOME_DIR = os.homedir();

/**
 * Checks for GitHub Copilot CLI (gh copilot).
 */
export async function checkCopilotCli() {
  try {
    const ghPath = execSync('where gh', { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] }).trim().split('\n')[0];
    if (ghPath) {
      try {
        const extList = execSync('gh extension list', { encoding: 'utf-8', timeout: 4000, stdio: ['pipe', 'pipe', 'ignore'] });
        const hasCopilot = extList.toLowerCase().includes('copilot');
        return {
          id: 'copilot',
          name: 'GitHub Copilot CLI',
          binary: ghPath,
          available: hasCopilot,
          status: hasCopilot ? 'Ready' : 'CLI Found (Extension Missing)',
          details: hasCopilot ? 'gh copilot extension is installed and ready.' : 'GitHub CLI is installed, but `gh-copilot` extension is missing.',
          installCmd: 'gh extension install github/gh-copilot',
        };
      } catch {
        return {
          id: 'copilot',
          name: 'GitHub Copilot CLI',
          binary: ghPath,
          available: false,
          status: 'CLI Found (Extension Missing)',
          details: 'Run `gh extension install github/gh-copilot` to enable.',
          installCmd: 'gh extension install github/gh-copilot',
        };
      }
    }
  } catch {
    // not in path
  }

  return {
    id: 'copilot',
    name: 'GitHub Copilot CLI',
    binary: null,
    available: false,
    status: 'Not Installed',
    details: 'GitHub CLI not found in PATH.',
    installCmd: 'winget install GitHub.cli && gh extension install github/gh-copilot',
  };
}

/**
 * Checks for Cursor CLI / IDE.
 */
export async function checkCursorCli() {
  const possiblePaths = [
    path.join(HOME_DIR, 'AppData/Local/Programs/cursor/Cursor.exe'),
    path.join(HOME_DIR, 'AppData/Local/Programs/cursor/resources/app/bin/cursor.cmd'),
    'C:/Program Files/Cursor/Cursor.exe',
  ];

  try {
    const whereCursor = execSync('where cursor', { encoding: 'utf-8', timeout: 2500, stdio: ['pipe', 'pipe', 'ignore'] }).trim().split('\n')[0];
    if (whereCursor) {
      return {
        id: 'cursor',
        name: 'Cursor CLI',
        binary: whereCursor,
        available: true,
        status: 'Ready',
        details: 'Cursor command-line launcher found in system PATH.',
        installCmd: 'Install Cursor from https://cursor.com',
      };
    }
  } catch {
    // check filesystem
  }

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return {
        id: 'cursor',
        name: 'Cursor IDE',
        binary: p,
        available: true,
        status: 'Installed',
        details: `Found Cursor at ${p}`,
        installCmd: 'Install Cursor from https://cursor.com',
      };
    }
  }

  return {
    id: 'cursor',
    name: 'Cursor CLI',
    binary: null,
    available: false,
    status: 'Not Installed',
    details: 'Cursor IDE / CLI not found in standard paths.',
    installCmd: 'Download from https://cursor.com',
  };
}

/**
 * Checks for Local Offline AI (Ollama).
 */
export async function checkOllama() {
  const defaultEndpoint = 'http://localhost:11434';
  let daemonOnline = false;
  let models = [];

  // 1. Check HTTP server
  try {
    const res = await fetch(`${defaultEndpoint}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      daemonOnline = true;
      models = (data.models || []).map(m => m.name || m.model);
    }
  } catch {
    daemonOnline = false;
  }

  // 2. Check binary installation
  const possibleOllamaBin = [
    path.join(HOME_DIR, 'AppData/Local/Programs/Ollama/ollama.exe'),
    'C:/Program Files/Ollama/ollama.exe',
  ];

  let binaryPath = null;
  for (const p of possibleOllamaBin) {
    if (fs.existsSync(p)) {
      binaryPath = p;
      break;
    }
  }

  if (!binaryPath) {
    try {
      binaryPath = execSync('where ollama', { encoding: 'utf-8', timeout: 2000 }).trim().split('\n')[0];
    } catch {
      // not in path
    }
  }

  if (daemonOnline) {
    return {
      id: 'ollama',
      name: 'Local Offline AI (Ollama)',
      binary: binaryPath,
      endpoint: defaultEndpoint,
      available: true,
      daemonRunning: true,
      models,
      status: 'Connected (Online)',
      details: `Ollama daemon active with ${models.length} model(s) available for 100% offline inference.`,
      installCmd: 'ollama run deepseek-coder',
    };
  }

  if (binaryPath) {
    return {
      id: 'ollama',
      name: 'Local Offline AI (Ollama)',
      binary: binaryPath,
      endpoint: defaultEndpoint,
      available: true,
      daemonRunning: false,
      models: [],
      status: 'Installed (Daemon Offline)',
      details: 'Ollama binary detected, but daemon server is stopped. Click "Start Server" to run.',
      installCmd: 'ollama serve',
    };
  }

  return {
    id: 'ollama',
    name: 'Local Offline AI (Ollama)',
    binary: null,
    endpoint: defaultEndpoint,
    available: false,
    daemonRunning: false,
    models: [],
    status: 'Not Installed',
    details: 'Ollama not detected. Install for 100% free, offline, privacy-first local code analysis.',
    installCmd: 'Download from https://ollama.com',
  };
}

/**
 * Checks for Antigravity CLI (agy).
 */
export async function checkAntigravityCli() {
  const possiblePaths = [
    path.join(HOME_DIR, 'AppData/Local/Programs/antigravity/Antigravity.exe'),
    path.join(HOME_DIR, 'AppData/Local/Programs/Antigravity IDE/Antigravity.exe'),
    path.join(HOME_DIR, '.gemini/antigravity/bin/agentapi.bat'),
  ];

  let binaryPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      binaryPath = p;
      break;
    }
  }

  try {
    const whereAgy = execSync('where agy', { encoding: 'utf-8', timeout: 2000, stdio: ['pipe', 'pipe', 'ignore'] }).trim().split('\n')[0];
    if (whereAgy) binaryPath = whereAgy;
  } catch {
    // not in path
  }

  if (binaryPath) {
    return {
      id: 'antigravity',
      name: 'Antigravity CLI (agy)',
      binary: binaryPath,
      available: true,
      status: 'Ready',
      details: `Google Antigravity platform detected at ${path.basename(path.dirname(binaryPath))}/${path.basename(binaryPath)}`,
      installCmd: 'Installed and configured.',
    };
  }

  return {
    id: 'antigravity',
    name: 'Antigravity CLI (agy)',
    binary: null,
    available: false,
    status: 'Not Installed',
    details: 'Antigravity CLI not found in PATH.',
    installCmd: 'agy --version',
  };
}

/**
 * Returns overall AI engines status.
 */
export async function getAllAiStatus() {
  const [copilot, cursor, ollama, antigravity] = await Promise.all([
    checkCopilotCli(),
    checkCursorCli(),
    checkOllama(),
    checkAntigravityCli(),
  ]);

  // Auto-set default active engine if user hasn't explicitly chosen one
  const engines = { copilot, cursor, ollama, antigravity };
  if (!hasUserChosenEngine) {
    if (ollama.available) activeEngine = 'ollama';
    else if (antigravity.available) activeEngine = 'antigravity';
    else if (cursor.available) activeEngine = 'cursor';
    else if (copilot.available) activeEngine = 'copilot';
  }

  return {
    activeEngine,
    selectedModel,
    engines,
  };
}

/**
 * Sets active engine.
 */
export function setActiveAiEngine(engineId, model = '') {
  if (['copilot', 'cursor', 'ollama', 'antigravity'].includes(engineId)) {
    activeEngine = engineId;
    hasUserChosenEngine = true;
  }
  if (model) {
    selectedModel = model;
  }
  return { activeEngine, selectedModel };
}

/**
 * Starts Ollama background server if installed.
 */
export async function startOllamaServer() {
  const ollama = await checkOllama();
  if (ollama.daemonRunning) {
    return { success: true, message: 'Ollama daemon is already online.' };
  }

  if (!ollama.binary) {
    throw new Error('Ollama binary not found on system.');
  }

  try {
    const child = spawn(ollama.binary, ['serve'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    // Poll for 8 seconds
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          return { success: true, message: 'Ollama daemon successfully started on port 11434.' };
        }
      } catch {
        // continue polling
      }
    }

    return { success: true, message: 'Ollama service process spawned. Check in a few moments.' };
  } catch (err) {
    throw new Error(`Failed to start Ollama server: ${err.message}`);
  }
}

/**
 * Generates an Architectural Flow Review using the chosen AI engine.
 */
export async function analyzeFlowWithAi({ flow, promptType = 'explain', model = '', customPrompt = '', engine = '' }) {
  if (!flow || !flow.steps || flow.steps.length === 0) {
    throw new Error('No valid flow sequence provided for AI review.');
  }

  // 1. Build structured architecture context
  const stepsList = flow.steps.map((s, i) => {
    let line = `${i + 1}. [${s.tier?.label || s.tier?.id || 'Tier'}] ${s.displayLabel || s.label} (${s.source_file || 'unknown'})`;
    if (s.branches && s.branches.length > 0) {
      line += `\n   Branches: ${s.branches.map(b => `${b.label} [${b.role}]`).join(', ')}`;
    }
    return line;
  }).join('\n');

  const reads = flow.dbSideEffects?.reads?.length || 0;
  const writes = flow.dbSideEffects?.writes?.length || 0;

  let promptGoal = '';
  switch (promptType) {
    case 'security':
      promptGoal = 'Perform a rigorous SECURITY & VALIDATION AUDIT on this code execution flow. Highlight unvalidated inputs, authorization gaps, error boundary risks, or sensitive data leakage points.';
      break;
    case 'performance':
      promptGoal = `Analyze DATABASE & PERFORMANCE characteristics of this flow (${reads} reads, ${writes} writes). Detect potential N+1 query patterns, caching opportunities, or unoptimized data fetching.`;
      break;
    case 'refactor':
      promptGoal = 'Provide concrete CODE REFACTORING & ARCHITECTURAL recommendations. Focus on decoupling, single responsibility, error handling, and cleaner dependency flow.';
      break;
    case 'explain':
    default:
      promptGoal = 'Explain the end-to-end architectural flow, how data moves across tiers, the responsibilities of each layer, and potential failure modes.';
      break;
  }

  if (customPrompt) {
    promptGoal = `${promptGoal}\nAdditional context: ${customPrompt}`;
  }

  const systemPrompt = `You are a Senior Software Architect reviewing a codebase flow graph generated by Graphify.\n` +
    `Flow Title: ${flow.title}\n` +
    `Total Steps: ${flow.steps.length}\n` +
    `Database Operations: ${reads} Reads, ${writes} Writes\n\n` +
    `Sequence Steps:\n${stepsList}\n\n` +
    `Task: ${promptGoal}\n\n` +
    `Format your response with concise GitHub-style markdown, highlighting key findings, layer responsibilities, and actionable recommendations.`;

  // 2. Dispatch to chosen active engine
  const targetEngine = engine || activeEngine;
  const currentStatus = await getAllAiStatus();
  const engineObj = currentStatus.engines[targetEngine] || currentStatus.engines.ollama;

  if (targetEngine === 'ollama') {
    if (!engineObj.daemonRunning) {
      return {
        success: false,
        engine: 'ollama',
        error: 'Ollama server is offline. Click "Start Ollama Server" in the AI Setup Wizard.',
        fallbackPrompt: systemPrompt,
      };
    }

    const targetModel = model || selectedModel || (engineObj.models && engineObj.models[0]) || 'llama3';

    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          prompt: systemPrompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!res.ok) {
        throw new Error(`Ollama returned status ${res.status}`);
      }

      const data = await res.json();
      return {
        success: true,
        engine: 'ollama',
        model: targetModel,
        analysis: data.response,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw new Error(`Ollama generation failed: ${err.message}`);
    }
  }

  // Fallback / CLI payloads for Copilot, Cursor, Antigravity
  return {
    success: true,
    engine: targetEngine,
    model: targetEngine,
    analysis: `### 🤖 ${engineObj.name} Architectural Review Prompt\n\n` +
      `**Active Flow:** ${flow.title} (${flow.steps.length} steps)\n\n` +
      `You can run this analysis directly via your terminal or IDE with the generated prompt below:\n\n` +
      '```bash\n' +
      (targetEngine === 'copilot' ? `gh copilot explain "${promptGoal.replace(/"/g, "'")}"` :
       targetEngine === 'cursor' ? `cursor --review "${flow.title}"` :
       `agy run --prompt "${promptGoal.replace(/"/g, "'")}"`) +
      '\n```\n\n' +
      `#### Full Architectural Prompt Context:\n\n${systemPrompt}`,
    timestamp: new Date().toISOString(),
  };
}
