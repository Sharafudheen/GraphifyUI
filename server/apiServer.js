import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { 
  getAllAiStatus, 
  setActiveAiEngine, 
  startOllamaServer, 
  analyzeFlowWithAi,
  refineQueryWithAi,
  enrichFlowWithAi
} from './aiService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Active repository state (can be changed dynamically via API)
let activeRepoRoot = null;
let activeGraphifyDir = null;
let cachedGraph = null;
let cachedAnalysis = null;
let activeRepoName = 'No Graph Loaded';

// Try to auto-detect any nearby graphify-out directory as initial fallback
function tryAutoDetectInitialGraph() {
  const possiblePaths = [
    'D:/FreeLanceProjects/MedicalStoreAI/MedStoreAI',
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../graphify-out'),
  ];

  for (const p of possiblePaths) {
    const candidateGraphify = path.join(p, 'graphify-out');
    const graphJson = path.join(candidateGraphify, 'graph.json');
    if (fs.existsSync(graphJson)) {
      console.log(`[API] Auto-detected initial graph at ${candidateGraphify}`);
      loadRepoFromDirectory(p);
      return;
    }
  }
}

function loadRepoFromDirectory(repoDir) {
  try {
    const resolvedRepo = path.resolve(repoDir);
    let resolvedGraphify = path.join(resolvedRepo, 'graphify-out');

    // In case user provided graphify-out directly
    if (path.basename(resolvedRepo) === 'graphify-out') {
      resolvedGraphify = resolvedRepo;
      activeRepoRoot = path.dirname(resolvedRepo);
    } else {
      activeRepoRoot = resolvedRepo;
    }

    activeGraphifyDir = resolvedGraphify;
    activeRepoName = path.basename(activeRepoRoot);

    const graphPath = path.join(resolvedGraphify, 'graph.json');
    const analysisPath = path.join(resolvedGraphify, '.graphify_analysis.json');

    if (fs.existsSync(graphPath)) {
      const rawGraph = fs.readFileSync(graphPath, 'utf-8');
      cachedGraph = JSON.parse(rawGraph);
      console.log(`[API] Loaded graph: ${cachedGraph.nodes?.length} nodes from ${graphPath}`);
    } else {
      cachedGraph = null;
    }

    if (fs.existsSync(analysisPath)) {
      const rawAnalysis = fs.readFileSync(analysisPath, 'utf-8');
      cachedAnalysis = JSON.parse(rawAnalysis);
      console.log(`[API] Loaded analysis from ${analysisPath}`);
    } else {
      cachedAnalysis = null;
    }

    return true;
  } catch (err) {
    console.error('[API] Error loading repo directory:', err);
    return false;
  }
}

tryAutoDetectInitialGraph();

// Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    repoName: activeRepoName,
    repoRoot: activeRepoRoot,
    graphLoaded: !!cachedGraph,
    nodesCount: cachedGraph?.nodes?.length || 0,
    linksCount: cachedGraph?.links?.length || 0,
    analysisLoaded: !!cachedAnalysis,
  });
});

// Configure or Change Active Repo Directory
app.post('/api/set-repo-path', (req, res) => {
  const { path: requestedPath } = req.body;
  if (!requestedPath) {
    return res.status(400).json({ error: 'Parameter "path" is required.' });
  }

  if (!fs.existsSync(requestedPath)) {
    return res.status(404).json({ error: `Directory not found: ${requestedPath}` });
  }

  const success = loadRepoFromDirectory(requestedPath);
  if (!success || !cachedGraph) {
    return res.status(400).json({ 
      error: `Could not find graph.json in ${requestedPath} or its graphify-out subdirectory.` 
    });
  }

  res.json({
    status: 'ok',
    repoName: activeRepoName,
    repoRoot: activeRepoRoot,
    nodesCount: cachedGraph?.nodes?.length || 0,
    linksCount: cachedGraph?.links?.length || 0,
  });
});

// Get Current Graph & Analysis
app.get('/api/graph', (req, res) => {
  const { path: customPath } = req.query;

  if (customPath && fs.existsSync(customPath)) {
    loadRepoFromDirectory(customPath);
  }

  if (!cachedGraph) {
    return res.status(404).json({ 
      error: 'No graph loaded. Please upload graph.json or specify a repository path.',
      repoName: activeRepoName,
      graphLoaded: false
    });
  }

  res.json({
    repoName: activeRepoName,
    repoRoot: activeRepoRoot,
    graph: cachedGraph,
    analysis: cachedAnalysis || {},
  });
});

// Code Snippet Reader (reads source file at exact line with surrounding context)
app.get('/api/code-snippet', (req, res) => {
  try {
    const { file, line, repoPath } = req.query;
    if (!file) {
      return res.status(400).json({ error: 'Parameter "file" is required.' });
    }

    const baseDir = repoPath && fs.existsSync(repoPath) ? repoPath : activeRepoRoot;

    if (!baseDir) {
      return res.status(400).json({ error: 'No repository root configured on server to read source files.' });
    }

    const safeRelPath = file.replace(/^[/\\]+/, '');
    const absolutePath = path.resolve(baseDir, safeRelPath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        error: `File not found on disk: ${file}`,
        searchedPath: absolutePath,
      });
    }

    const fullContent = fs.readFileSync(absolutePath, 'utf-8');
    const lines = fullContent.split(/\r?\n/);
    const totalLines = lines.length;

    let targetLineNum = 1;
    if (line) {
      const match = String(line).match(/\d+/);
      if (match) targetLineNum = parseInt(match[0], 10);
    }
    targetLineNum = Math.max(1, Math.min(targetLineNum, totalLines));

    const contextRadius = 20;
    const startLine = Math.max(1, targetLineNum - contextRadius);
    const endLine = Math.min(totalLines, targetLineNum + contextRadius);

    const snippetLines = lines.slice(startLine - 1, endLine).map((text, idx) => ({
      lineNumber: startLine + idx,
      isTarget: startLine + idx === targetLineNum,
      text,
    }));

    res.json({
      file: safeRelPath,
      absolutePath,
      targetLine: targetLineNum,
      startLine,
      endLine,
      totalLines,
      snippet: snippetLines,
      fullContent,
    });
  } catch (err) {
    console.error('[API] Error reading code snippet:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI & CLI Integration Endpoints
app.get('/api/ai/status', async (req, res) => {
  try {
    const status = await getAllAiStatus();
    res.json(status);
  } catch (err) {
    console.error('[API] AI status check failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/set-engine', (req, res) => {
  try {
    const { engineId, model } = req.body;
    const updated = setActiveAiEngine(engineId, model);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/ai/start-ollama', async (req, res) => {
  try {
    const result = await startOllamaServer();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/explain-flow', async (req, res) => {
  try {
    const { flow, promptType, model, customPrompt } = req.body;
    const result = await analyzeFlowWithAi({ flow, promptType, model, customPrompt });
    res.json(result);
  } catch (err) {
    console.error('[API] AI flow analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Query Refinement Endpoint
app.post('/api/ai/refine-query', async (req, res) => {
  try {
    const { query, engine, context } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }
    const result = await refineQueryWithAi(query.trim(), engine || '', context || null);
    res.json(result);
  } catch (err) {
    console.error('[API] Query refinement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Flow Enrichment Endpoint — enriches each step's description using AI
app.post('/api/ai/enrich-flow', async (req, res) => {
  try {
    const { steps, engine } = req.body;
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'steps array is required.' });
    }
    const result = await enrichFlowWithAi(steps, engine || '');
    res.json(result);
  } catch (err) {
    console.error('[API] Flow enrichment error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[API Server] GraphFlow-Universal backend running on http://localhost:${PORT}`);
});
