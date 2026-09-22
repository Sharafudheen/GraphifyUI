/**
 * Universal Human-Readable Architectural Purpose Synthesizer
 * Deconstructs symbol names, verbs, and architectural tiers to generate
 * clean, meaningful explanations for any codebase with zero hardcoded project dictionaries.
 */

// Common development verbs and their descriptive meaning
const VERB_DESCRIPTIONS = {
  create: 'Creates and initializes new',
  add: 'Appends or registers new',
  build: 'Assembles and constructs',
  get: 'Retrieves and queries',
  fetch: 'Fetches asynchronous data for',
  find: 'Searches database records for',
  list: 'Lists and paginates collections of',
  search: 'Executes indexed search queries across',
  update: 'Modifies and updates state for',
  edit: 'Applies edits and mutation changeset to',
  delete: 'Safely removes and purges',
  remove: 'Detaches or removes',
  validate: 'Validates constraints, schemas, and assertions for',
  check: 'Checks preconditions and permissions for',
  verify: 'Verifies authentication tokens and integrity of',
  sanitize: 'Sanitizes and normalizes raw input payload for',
  normalize: 'Transforms into standardized format for',
  format: 'Formats output values and display strings for',
  parse: 'Parses and deserializes incoming data for',
  serialize: 'Serializes domain objects into response format for',
  calculate: 'Calculates formulas and financial/metric values for',
  compute: 'Computes aggregations and derived state for',
  dispatch: 'Dispatches actions or async events for',
  handle: 'Coordinates event lifecycle and error handling for',
  process: 'Processes incoming job or transaction queue for',
  send: 'Transmits messages, notifications, or network payloads for',
  upload: 'Uploads and validates binary assets or files for',
  download: 'Streams or downloads assets for',
  sync: 'Synchronizes external state and replicas for',
  render: 'Renders reactive user interface component for',
};

/**
 * Splits camelCase, snake_case, PascalCase, or kebab-case into tokens
 */
function tokenizeSymbol(str) {
  if (!str) return [];
  return str
    .replace(/\(\)$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-\.]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Synthesizes a human-readable explanation for any architectural node.
 */
export function getHumanReadableDescription(node) {
  if (!node) return 'Coordinates execution flow and coordinates data processing.';

  const rawLabel = (node.label || node.displayLabel || node.id || '').replace(/\(\)$/, '');
  const tokens = tokenizeSymbol(rawLabel);
  const tierId = node.tier?.id || 'SERVICE';
  const tierLabel = node.tier?.label || 'Component';
  const dbOp = node.dbOp;

  if (tokens.length === 0) {
    return `Coordinates ${tierLabel} execution.`;
  }

  // Find if first token is a known verb
  const firstWord = tokens[0];
  const knownVerbAction = VERB_DESCRIPTIONS[firstWord];
  const targetEntity = (knownVerbAction ? tokens.slice(1) : tokens).join(' ') || 'resource';

  // 1. Database Model / Repository Nodes
  if (tierId === 'DB_MODEL') {
    if (dbOp?.type === 'WRITE') {
      return `Performs database mutation (insert/update/delete) in collection/table for ${targetEntity}.`;
    }
    if (dbOp?.type === 'READ') {
      return `Queries database records and returns persistent schema documents for ${targetEntity}.`;
    }
    return `Defines persistent data schema and repository access layer for ${targetEntity}.`;
  }

  // 2. Frontend UI / Page Components
  if (tierId === 'UI_COMPONENT') {
    if (rawLabel.toLowerCase().endsWith('page') || tokens.includes('page')) {
      return `Primary application page: renders ${targetEntity} interface, binds events, and coordinates API queries.`;
    }
    if (rawLabel.toLowerCase().endsWith('modal') || tokens.includes('modal') || tokens.includes('dialog')) {
      return `Interactive overlay modal: captures user input and handles submissions for ${targetEntity}.`;
    }
    if (rawLabel.toLowerCase().endsWith('form') || tokens.includes('form')) {
      return `Interactive form: captures user input, validates field constraints, and submits ${targetEntity}.`;
    }
    if (rawLabel.toLowerCase().endsWith('table') || tokens.includes('table') || tokens.includes('list')) {
      return `Data view: displays tabular records, sorting, and row actions for ${targetEntity}.`;
    }
    return `UI Component: renders user interface elements and presentation state for ${targetEntity}.`;
  }

  // 3. API / Network Clients
  if (tierId === 'API_CLIENT') {
    return `Network client: serializes payload, injects authentication headers, and sends request for ${targetEntity}.`;
  }

  // 4. Backend Routes / Endpoints
  if (tierId === 'ROUTE') {
    return `HTTP Endpoint Router: maps incoming requests to authentication middlewares and controller use cases.`;
  }

  // 5. Controllers / Use Cases
  if (tierId === 'CONTROLLER') {
    if (knownVerbAction) {
      return `${knownVerbAction} ${targetEntity}, verifies permissions, and triggers domain policies.`;
    }
    return `Coordinates request validation, domain policies, and dispatches ${targetEntity} workflow.`;
  }

  // 6. Domain Services & Utilities
  if (knownVerbAction) {
    return `${knownVerbAction} ${targetEntity} and applies domain business rules.`;
  }

  return `Encapsulates core domain business logic and utility helpers for ${targetEntity}.`;
}
