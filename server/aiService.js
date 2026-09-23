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

/**
 * Normalises and reformulates a raw natural-language trace query into a precise
 * architecture-search sentence. Tries:
 *  1. Ollama (if daemon running) — fastest, offline
 *  2. agy (Antigravity CLI) — spawns a subprocess and reads stdout
 *  3. Smart rule-based reformulation — always works as fallback
 *
 * Returns { refinedQuery, suggestions, engine, originalQuery }
 */
export async function refineQueryWithAi(rawQuery, preferredEngine = '', context = null) {
  const original = rawQuery.trim();
  const lower = original.toLowerCase();

  // ── Rule-based normalisation (always available as fallback) ──────────────────
  function ruleBasedRefine(q) {
    // Strip filler words
    let refined = q
      .replace(/\b(can you|please|show me|i want|tell me|explain|how does|what is|the flow of|flow of|trace|path of|from|to|into|via|through)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Detect intent verb and inject if missing
    const isWrite = /save|create|add|insert|post|submit|update|edit|delete|remove/.test(lower);
    const isRead  = /fetch|get|list|load|read|retrieve|display|show|query/.test(lower);
    const verb    = isWrite ? 'save to database' : isRead ? 'fetch from database' : 'flow to database';

    // Extract file name tokens (e.g. AddPO.jsx)
    const fileMatch = original.match(/([A-Za-z0-9_]+\.(?:jsx|tsx|js|ts|py|go|rb|php|java|cs))/i);
    const fileHint  = fileMatch ? fileMatch[1] : '';

    if (fileHint) {
      refined = `${fileHint} end-to-end architecture flow: ${verb} — trace UI → API Client → Route → Controller → Service → DB`;
    } else {
      refined = `${refined} — end-to-end flow: ${verb} trace UI → API → Route → Controller → Service → DB`;
    }

    return refined;
  }

  // Build context-aware prompt (used for re-iteration queries when previous result was shallow)
  let contextHint = '';
  if (context) {
    const missing = Array.isArray(context.missingTiers) ? context.missingTiers.join(', ') : '';
    contextHint =
      ` IMPORTANT: A previous search returned only ${context.previousStepCount || 0} steps` +
      ` and stopped at ${context.stoppedAt || 'API layer'}.` +
      (missing ? ` Missing layers: ${missing}.` : '') +
      ` The new query MUST specifically target the backend ${missing || 'service and database'} layers.` +
      ` Reformulate to trace deeper into the server-side code path.`;
  }

  const aiPrompt =
    `You are a software architecture search assistant. ` +
    `Convert this raw user query into a precise, concise architecture-trace search sentence (1 line, max 120 chars) ` +
    `suitable for a code-graph pathfinder. Remove filler words, infer intent (read/write/event), and include the ` +
    `relevant file name or domain if mentioned.${contextHint} ` +
    `Raw query: "${original}" ` +
    `Reply with ONLY the refined query sentence, no explanation.`;

  const engine = preferredEngine || activeEngine;

  // ── Try Ollama ────────────────────────────────────────────────────────────────
  if (engine === 'ollama' || !engine) {
    try {
      const ollama = await checkOllama();
      if (ollama.daemonRunning) {
        const model = selectedModel || (ollama.models && ollama.models[0]) || 'llama3';
        const res = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: aiPrompt, stream: false }),
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const data = await res.json();
          const refined = (data.response || '').trim().replace(/^["']|["']$/g, '');
          if (refined && refined.length > 5) {
            return { refinedQuery: refined, originalQuery: original, engine: 'ollama', suggestions: buildSuggestions(original) };
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── Try Antigravity (agy) ─────────────────────────────────────────────────────
  if (engine === 'antigravity') {
    try {
      const agyInfo = await checkAntigravityCli();
      if (agyInfo.available && agyInfo.binary) {
        const binaryPath = agyInfo.binary;
        // Determine the command: .bat files need cmd /c, .exe files spawn directly
        const isBat = binaryPath.endsWith('.bat') || binaryPath.endsWith('.cmd');
        const cmd   = isBat ? 'cmd' : binaryPath;
        const args  = isBat
          ? ['/c', binaryPath, 'run', '--prompt', aiPrompt, '--no-interactive', '--output-format', 'text']
          : ['run', '--prompt', aiPrompt, '--no-interactive', '--output-format', 'text'];

        const refined = await new Promise((resolve) => {
          let out = '';
          const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 });
          child.stdout.on('data', (chunk) => { out += chunk.toString(); });
          child.on('close', () => resolve(out.trim()));
          child.on('error', () => resolve(''));
          setTimeout(() => { try { child.kill(); } catch {} resolve(''); }, 14000);
        });

        if (refined && refined.length > 5) {
          // Take only the first line of agy output (skip any preamble)
          const firstLine = refined.split('\n').find(l => l.trim().length > 5) || refined;
          return { refinedQuery: firstLine.trim(), originalQuery: original, engine: 'antigravity', suggestions: buildSuggestions(original) };
        }
      }
    } catch { /* fall through */ }
  }

  // ── Rule-based fallback ───────────────────────────────────────────────────────
  const fallback = ruleBasedRefine(original);
  // If context says we need deeper layers, append targeting hint
  let finalFallback = fallback;
  if (context?.missingTiers?.length) {
    const targets = context.missingTiers
      .map(t => t.toLowerCase().replace('_', ' '))
      .join(' and ');
    finalFallback = `${fallback} — specifically trace through ${targets}`;
  }

  return {
    refinedQuery: finalFallback,
    originalQuery: original,
    engine: 'rule-based',
    suggestions: buildSuggestions(original),
  };
}

/**
 * Generates contextual prompt suggestions based on the raw query.
 */
function buildSuggestions(query) {
  const lower = query.toLowerCase();
  const fileMatch = query.match(/([A-Za-z0-9_]+\.(?:jsx|tsx|js|ts|py|go|rb|php|java|cs))/i);
  const file = fileMatch ? fileMatch[1] : null;
  const base = file ? file.replace(/\.\w+$/, '') : null;

  const suggestions = [];

  if (file) {
    suggestions.push(`${file} complete save-to-database flow`);
    suggestions.push(`${file} data fetching and render pipeline`);
    suggestions.push(`${file} API call chain end-to-end`);
    if (base) suggestions.push(`${base} error handling and validation flow`);
  } else if (/auth|login|user/.test(lower)) {
    suggestions.push('User login authentication flow end-to-end');
    suggestions.push('Session token validation and refresh flow');
    suggestions.push('User registration save-to-database flow');
  } else if (/product|inventory|medicine|item/.test(lower)) {
    suggestions.push('Product listing fetch from database flow');
    suggestions.push('Add product save-to-database end-to-end');
    suggestions.push('Inventory update flow from UI to DB');
  } else if (/order|purchase|po/.test(lower)) {
    suggestions.push('Purchase order create and save flow');
    suggestions.push('Order listing fetch from database flow');
    suggestions.push('Purchase order approval workflow end-to-end');
  } else {
    suggestions.push('How does the data reach the database from this page?');
    suggestions.push('Trace the complete API call chain from UI to DB');
    suggestions.push('What validation and error handling happens in this flow?');
  }

  return suggestions.slice(0, 3);
}

/**
 * Helper: safely parse a JSON array out of any text blob (AI output often has preamble).
 */
function safeParseJsonArray(text) {
  if (!text) return null;
  // Try direct parse first
  try { const r = JSON.parse(text.trim()); if (Array.isArray(r)) return r; } catch {}
  // Extract the first [...] block
  const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) {
    try { const r = JSON.parse(match[0]); if (Array.isArray(r)) return r; } catch {}
  }
  return null;
}

/**
 * Helper: apply enriched descriptions from AI response array to the original steps.
 * Each AI item should have { index (1-based) | id, description }.
 */
function applyEnrichmentToSteps(steps, aiItems) {
  return steps.map((step, i) => {
    const item = aiItems.find(a =>
      (a.index !== undefined && Number(a.index) === i + 1) ||
      (a.id && (a.id === step.id || a.id === String(i + 1)))
    );
    if (item?.description && item.description.trim().length > 5) {
      return { ...step, humanDescription: item.description.trim(), aiEnriched: true };
    }
    return step;
  });
}

/**
 * Spawns agy CLI and returns stdout as a string.
 */
async function spawnAgyForEnrichment(binaryPath, prompt, timeoutMs = 20000) {
  const isBat = binaryPath.endsWith('.bat') || binaryPath.endsWith('.cmd');
  const cmd   = isBat ? 'cmd' : binaryPath;
  const args  = isBat
    ? ['/c', binaryPath, 'run', '--prompt', prompt, '--no-interactive', '--output-format', 'text']
    : ['run', '--prompt', prompt, '--no-interactive', '--output-format', 'text'];

  return new Promise((resolve) => {
    let out = '';
    try {
      const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
      child.stdout.on('data', chunk => { out += chunk.toString(); });
      child.on('close', () => resolve(out));
      child.on('error', () => resolve(''));
      setTimeout(() => { try { child.kill(); } catch {} resolve(out); }, timeoutMs);
    } catch { resolve(''); }
  });
}

/**
 * Enriches each step in an execution flow with a plain-English AI-generated description
 * that explains what the layer does, what data flows through it, and why it matters.
 *
 * Falls back to improved rule-based descriptions if AI is unavailable.
 * Returns { enrichedSteps: Step[], engine: string }
 */
export async function enrichFlowWithAi(steps, preferredEngine = '') {
  if (!steps || steps.length === 0) return { enrichedSteps: [], engine: 'none' };

  const engine = preferredEngine || activeEngine;

  // Build a compact, human-readable step list for the prompt
  const stepList = steps.map((s, i) => {
    const tier  = s.tier?.label || s.tier?.id || 'Layer';
    const label = s.displayLabel || s.label || '';
    const file  = (s.source_file || '').split(/[\/\\]/).slice(-1)[0];
    const branches = s.branches?.length ? ` (calls: ${s.branches.slice(0,3).map(b => b.displayLabel || b.label).join(', ')})` : '';
    const dbOp = s.dbOp?.type ? ` [DB ${s.dbOp.type}]` : '';
    return `${i + 1}. [${tier}] ${label} — ${file}${branches}${dbOp}`;
  }).join('\n');

  const promptText =
    `You are a software architecture explainer. For each numbered step in this execution flow, write a single plain-English sentence (max 90 characters) that explains:\n` +
    `- What this component/layer DOES in this specific request\n` +
    `- What data it receives from the previous step and passes to the next\n` +
    `Use simple, developer-friendly language. Be specific, not generic.\n\n` +
    `Flow steps:\n${stepList}\n\n` +
    `Respond ONLY with a JSON array. Each element: { "index": <1-based number>, "description": "<sentence>" }\n` +
    `Example: [{"index":1,"description":"Renders the purchase order table and emits a row-click event with the selected order ID."},{"index":2,"description":"Sends GET /api/purchase-orders to the backend, attaching the store ID as a query param."}]`;

  // ── Try Ollama ──────────────────────────────────────────────────────────────
  if (engine === 'ollama') {
    try {
      const ollama = await checkOllama();
      if (ollama.daemonRunning) {
        const model = selectedModel || ollama.models?.[0] || 'llama3';
        const res = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: promptText, stream: false }),
          signal: AbortSignal.timeout(40000),
        });
        if (res.ok) {
          const data = await res.json();
          const items = safeParseJsonArray(data.response || '');
          if (items?.length) {
            return { enrichedSteps: applyEnrichmentToSteps(steps, items), engine: 'ollama' };
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── Try Antigravity (agy) ───────────────────────────────────────────────────
  if (engine === 'antigravity') {
    try {
      const agyInfo = await checkAntigravityCli();
      if (agyInfo.available && agyInfo.binary) {
        const output = await spawnAgyForEnrichment(agyInfo.binary, promptText, 25000);
        const items  = safeParseJsonArray(output);
        if (items?.length) {
          return { enrichedSteps: applyEnrichmentToSteps(steps, items), engine: 'antigravity' };
        }
      }
    } catch { /* fall through */ }
  }

  // ── Rule-based fallback ─────────────────────────────────────────────────────
  const ruleEnriched = steps.map((s, i) => {
    const tier  = s.tier?.id || '';
    const label = (s.displayLabel || s.label || '').replace(/\(\)$/, '');
    const next  = steps[i + 1];
    const nextLabel = next ? (next.displayLabel || next.label || '').replace(/\(\)$/, '') : null;
    const passTo = nextLabel ? ` and passes the result to ${nextLabel}` : '';

    let desc = s.humanDescription || '';
    switch (tier) {
      case 'UI_COMPONENT':
        desc = `${label} renders the UI, handles user interactions, and triggers an API call${passTo}.`; break;
      case 'API_CLIENT':
        desc = `Serializes the request payload, adds auth headers, and sends it to the backend route${passTo}.`; break;
      case 'ROUTE':
        desc = `${label} receives the HTTP request, validates params, and delegates to the controller${passTo}.`; break;
      case 'CONTROLLER':
        desc = `${label} orchestrates the business flow, calls the service layer, and returns the HTTP response${passTo}.`; break;
      case 'SERVICE':
        desc = `${label} applies business rules and validation logic, then calls the data layer${passTo}.`; break;
      case 'DB_REPOSITORY':
        desc = `${label} builds and executes the database query${s.dbOp?.type ? ` (${s.dbOp.type})` : ''}${passTo}.`; break;
      case 'DB_MODEL':
        desc = `${label} is the database schema/entity${s.dbOp?.type === 'WRITE' ? ' — data is persisted here' : ' — data is read from here'}.`; break;
      default:
        desc = desc || `${label} processes data${passTo}.`;
    }
    return { ...s, humanDescription: desc, aiEnriched: false };
  });

  return { enrichedSteps: ruleEnriched, engine: 'rule-based' };
}
