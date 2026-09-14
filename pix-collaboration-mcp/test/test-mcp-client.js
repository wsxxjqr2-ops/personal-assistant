import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runClientTest() {
  console.log('=== Step 5: Testing MCP Client connection over Stdio ===');

  const serverPath = path.resolve(__dirname, '../dist/index.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
  });

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('MCP Client connected successfully!');

  // List tools
  const toolsRes = await client.listTools();
  console.log(`Discovered ${toolsRes.tools.length} MCP tools:`);
  for (const t of toolsRes.tools) {
    console.log(` • ${t.name}: ${t.description.slice(0, 50)}...`);
  }

  // Call whoami tool
  console.log('\nTesting tool call: whoami');
  const whoamiRes = await client.callTool({ name: 'whoami', arguments: {} });
  console.log('whoami output:');
  console.log(whoamiRes.content[0].text);

  // Call query_my_issues tool
  console.log('\nTesting tool call: query_my_issues (limit: 3)');
  const issuesRes = await client.callTool({
    name: 'query_my_issues',
    arguments: { limit: 3, status: 'open' },
  });
  console.log('query_my_issues output preview:');
  console.log(issuesRes.content[0].text.split('\n').slice(0, 6).join('\n'));

  await client.close();
  console.log('\n🎉 MCP PROTOCOL CLIENT TEST COMPLETED SUCCESSFULLY!');
}

runClientTest().catch((err) => {
  console.error('MCP Client test failed:', err);
  process.exit(1);
});
