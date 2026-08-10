// tools.js — the six read-only MCP tools over a token source.
//
// A source is `{ kind, tokens, components?, errors }` (see src/sources/*).
// Component tools require Sorb capture artifacts or a bridge; in bare-DTCG
// mode they answer with an honest capability message instead of silent
// emptiness, so the calling agent knows what would unlock them.

const CAPABILITY_MSG =
  'This source has no component captures (bare DTCG mode). Component tools ' +
  'need a Sorb project (.sorb/ artifacts from `sorb-seed capture`) or a ' +
  'running Sorb bridge (--bridge). Token tools remain fully available.'

/** JSON Schema definitions for the MCP tool list. */
export const TOOL_DEFS = [
  {
    name: 'list_tokens',
    description:
      'List design tokens (id, CSS variable, resolved value, tier, type). ' +
      'Optional filters: tier (primitive|semantic|component), type (color, dimension, …), q (substring).',
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'string', description: 'Filter by tier' },
        type: { type: 'string', description: 'Filter by $type' },
        q: { type: 'string', description: 'Substring match on id/cssVar' },
      },
    },
  },
  {
    name: 'get_token',
    description: 'Get one token by id or CSS variable, including its raw authored value and alias chain.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Token id (dot path) or CSS variable (--…)' } },
      required: ['id'],
    },
  },
  {
    name: 'resolve_token',
    description: 'Resolve a token to its final value, showing the alias chain that produced it.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Token id (dot path) or CSS variable (--…)' } },
      required: ['id'],
    },
  },
  {
    name: 'list_components',
    description: 'List captured components/stories (requires Sorb capture artifacts or a bridge).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_component_bindings',
    description:
      'Show which tokens a captured component binds, by role (fill/stroke/cornerRadius/…). ' +
      'Requires Sorb capture artifacts or a bridge.',
    inputSchema: {
      type: 'object',
      properties: { component: { type: 'string', description: 'Component/story name or id' } },
      required: ['component'],
    },
  },
  {
    name: 'find_token_usage',
    description:
      'Reverse index: which captured components use a token. Requires Sorb capture artifacts or a bridge.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Token id (dot path) or CSS variable (--…)' } },
      required: ['id'],
    },
  },
]

const norm = (id) => (id.startsWith('--') ? id.slice(2).split('-').join('.') : id)

const findToken = (source, id) => {
  const want = norm(String(id))
  return (
    source.tokens.find((t) => t.id === want) ??
    source.tokens.find((t) => t.cssVar === id) ??
    null
  )
}

const summary = (t) => ({ id: t.id, cssVar: t.cssVar, value: t.value, tier: t.tier, type: t.type })

/**
 * Execute a tool by name. Returns a JSON-serializable result object.
 * @param {object} source
 * @param {string} name
 * @param {object} args
 */
export const runTool = (source, name, args = {}) => {
  switch (name) {
    case 'list_tokens': {
      let out = source.tokens
      if (args.tier) out = out.filter((t) => t.tier === args.tier)
      if (args.type) out = out.filter((t) => t.type === args.type)
      if (args.q) {
        const q = String(args.q).toLowerCase()
        out = out.filter((t) => t.id.toLowerCase().includes(q) || t.cssVar.toLowerCase().includes(q))
      }
      return { count: out.length, tokens: out.map(summary) }
    }
    case 'get_token': {
      const t = findToken(source, args.id)
      return t ? { token: t } : { error: `token not found: ${args.id}` }
    }
    case 'resolve_token': {
      const t = findToken(source, args.id)
      if (!t) return { error: `token not found: ${args.id}` }
      return { id: t.id, cssVar: t.cssVar, value: t.value, chain: t.chain, ...(t.error ? { error: t.error } : {}) }
    }
    case 'list_components': {
      if (!source.components) return { capability: CAPABILITY_MSG, components: [] }
      return { count: source.components.length, components: source.components.map((c) => c.name) }
    }
    case 'get_component_bindings': {
      if (!source.components) return { capability: CAPABILITY_MSG }
      const c = source.components.find((x) => x.name === args.component || x.id === args.component)
      return c ? { component: c.name, bindings: c.bindings } : { error: `component not found: ${args.component}` }
    }
    case 'find_token_usage': {
      if (!source.components) return { capability: CAPABILITY_MSG }
      const want = norm(String(args.id))
      const used = source.components
        .map((c) => ({
          component: c.name,
          roles: Object.entries(c.bindings)
            .filter(([, tok]) => tok === want || tok === args.id)
            .map(([role]) => role),
        }))
        .filter((u) => u.roles.length)
      return { id: want, count: used.length, usage: used }
    }
    default:
      return { error: `unknown tool: ${name}` }
  }
}
