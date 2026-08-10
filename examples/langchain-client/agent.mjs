// LangChain + @sorb/tap — load the token tools into an agent.
//
//   cd examples/langchain-client && npm install
//   ANTHROPIC_API_KEY=… npm start
//
// The MultiServerMCPClient spawns sorb-tap over stdio against the bundled
// Acme token set; the agent then answers design-token questions with real
// resolved values (try: "what is the button background, and which primitive
// does it come from?").
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const client = new MultiServerMCPClient({
  "sorb-tap": {
    transport: "stdio",
    command: "npx",
    args: ["-y", "@sorb/tap", "--tokens", "../acme-tokens.json"],
  },
});

const tools = await client.getTools();
const agent = createReactAgent({
  llm: new ChatAnthropic({ model: "claude-sonnet-5" }),
  tools,
});

const question =
  process.argv[2] ??
  "What is the button background token's final value, and which primitive does it alias?";
const result = await agent.invoke({ messages: [{ role: "user", content: question }] });
console.log(result.messages.at(-1).content);
await client.close();
