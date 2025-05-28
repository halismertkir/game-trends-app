import { MCPClient } from "@mastra/mcp";
import { createSmitheryUrl } from "@smithery/sdk/shared/config.js";


const config = {};

// Create MCP client that integrates with Smithery
export const mcps = await new MCPClient({
  servers: {
    gameTrend: {
      url: createSmitheryUrl("https://server.smithery.ai/@halismertkir/game-trends-mcp/mcp", { config, apiKey: process.env.SMITHERY_API_KEY ,profile:"skinny-clam-p5YUwk"}) ,
      
    }
  }
});

// export const mcps = new MCPClient({
//   servers: {
//     'gameTrend': {
//       command: 'npx',
//       args: [
//         '-y',
//         '@smithery/cli@latest',
//         'run',
//         '@halismertkir/game-trends-mcp',
//         '--key',
//         '8ea97057-fc14-42ee-8010-f872be633a02',
//         '--profile',
//         'skinny-clam-p5YUwk'
//       ],
//       timeout: 30000, // 30 seconds timeout
//     }
//   },
//   timeout: 60000, // Global 60 seconds timeout
// });