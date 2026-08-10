// server.js — the MCP stdio server: TOOL_DEFS + runTool over one source.
//
// Low-level SDK Server (not the zod-based McpServer) keeps the dependency
// surface to @modelcontextprotocol/sdk alone; tool schemas are plain JSON
// Schema in tools.js. One resource (sorb-tap://tokens) exposes the full
// resolved map for clients that prefer resource reads over tool calls.

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { TOOL_DEFS, runTool } from './tools.js'

const TOKENS_URI = 'sorb-tap://tokens'

/**
 * Build (not yet connect) an MCP server over a token source.
 * @param {object} source  From src/sources/*.
 * @param {string} version Package version for the handshake.
 */
export const createServer = (source, version) => {
  const server = new Server(
    { name: 'sorb-tap', version },
    { capabilities: { tools: {}, resources: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    const result = runTool(source, name, args ?? {})
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: Boolean(result && result.error && !result.token),
    }
  })

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: TOKENS_URI,
        name: 'Resolved design tokens',
        description: 'The full resolved token map from the active source.',
        mimeType: 'application/json',
      },
    ],
  }))

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    if (req.params.uri !== TOKENS_URI) throw new Error(`unknown resource: ${req.params.uri}`)
    return {
      contents: [
        {
          uri: TOKENS_URI,
          mimeType: 'application/json',
          text: JSON.stringify({ source: source.kind, tokens: source.tokens }, null, 2),
        },
      ],
    }
  })

  return server
}

/** Connect a built server over stdio (the normal CLI path). */
export const serveStdio = async (source, version) => {
  const server = createServer(source, version)
  await server.connect(new StdioServerTransport())
  return server
}
