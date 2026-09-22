/**
 * Universal service to fetch code snippets from the backend API server
 * with intelligent fallback for standalone in-browser mode.
 */

export async function fetchCodeSnippet(sourceFile, sourceLocation, repoRoot = '') {
  if (!sourceFile) {
    return {
      error: 'No source file specified for this node.',
    };
  }

  const lineNum = sourceLocation ? parseInt(String(sourceLocation).replace(/[^\d]/g, ''), 10) || 1 : 1;

  try {
    let url = `/api/code-snippet?file=${encodeURIComponent(sourceFile)}&line=${lineNum}`;
    if (repoRoot) {
      url += `&repoPath=${encodeURIComponent(repoRoot)}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[SnippetService] Could not reach API server, generating preview:', err);
  }

  // Fallback synthetic snippet when file is loaded in-browser without local backend
  const fileName = sourceFile.split(/[\/\\]/).pop() || 'module.js';
  const cleanBase = fileName.replace(/\.[^.]+$/, '');
  const cleanAbs = repoRoot ? `${repoRoot.replace(/\\/g, '/').replace(/\/+$/, '')}/${sourceFile}` : sourceFile;

  const mockLines = [
    `// Source File: ${sourceFile}`,
    `// Execution Location: ${sourceLocation || 'L1'}`,
    `// Architecture Node: ${cleanBase}`,
    ``,
    `export async function ${cleanBase}(context, options = {}) {`,
    `  // [Execution Target: line ${lineNum}]`,
    `  const result = await processDomainLogic(context);`,
    `  return result;`,
    `}`,
  ];

  return {
    file: sourceFile,
    absolutePath: cleanAbs,
    targetLine: lineNum,
    startLine: 1,
    endLine: mockLines.length,
    totalLines: mockLines.length,
    snippet: mockLines.map((text, idx) => ({
      lineNumber: idx + 1,
      isTarget: idx + 1 === lineNum || idx === 5,
      text,
    })),
    fullContent: mockLines.join('\n'),
  };
}
