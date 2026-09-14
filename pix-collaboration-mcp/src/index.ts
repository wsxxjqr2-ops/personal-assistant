#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { AuthManager } from './auth.js';
import { registerAuthTools } from './tools/auth.js';
import { registerIssueTools } from './tools/issues.js';
import { registerTimeEntryTools } from './tools/time_entries.js';
import { registerMetadataTools } from './tools/metadata.js';

function createServer(authManager: AuthManager, getSessionId: () => string | undefined): McpServer {
  const server = new McpServer({
    name: 'pix-collaboration-mcp',
    version: '1.0.0',
  });

  registerAuthTools(server, authManager, getSessionId);
  registerIssueTools(server, authManager, getSessionId);
  registerTimeEntryTools(server, authManager, getSessionId);
  registerMetadataTools(server, authManager, getSessionId);

  return server;
}

async function startStdio() {
  const authManager = new AuthManager();
  const server = createServer(authManager, () => undefined);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PIX Collaboration MCP Server running via stdio');
}

async function startSse(port = 3333, host = '0.0.0.0') {
  const authManager = new AuthManager();
  const app = express();

  app.use(cors());
  app.use(express.json());

  const sessions = new Map<string, { transport: SSEServerTransport; server: McpServer }>();

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'pix-collaboration-mcp',
      activeSessions: sessions.size,
      time: new Date().toISOString(),
    });
  });

  // Optional Web Login / Setup Page for colleagues
  app.get('/', (_req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>PIX 协作平台 MCP 服务</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6; }
    h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    .badge { display: inline-block; background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 13px; font-weight: bold; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
    .card { background: #f1f5f9; padding: 18px; border-radius: 8px; margin: 20px 0; }
    code { color: #0f172a; font-weight: 600; }
  </style>
</head>
<body>
  <h1>PIX 协作平台 MCP 服务 <span class="badge">运行中</span></h1>
  <p>这是面向部门共享的 <strong>PIX/RUBYLOFT 协作平台 (rd.pixmoving.city)</strong> MCP 集中接入端点。</p>
  
  <div class="card">
    <h3>🔗 远程 SSE 连接端点</h3>
    <p><code>http://&lt;服务器IP&gt;:${port}/sse</code></p>
  </div>

  <h3>💡 Cursor / Claude Desktop / Antigravity 配置指南</h3>
  <p>将以下配置添加到你的客户端 MCP 配置文件中：</p>
  <pre>{
  "mcpServers": {
    "pix-collaboration": {
      "url": "http://&lt;服务器IP&gt;:${port}/sse"
    }
  }
}</pre>

  <h3>✨ 首次使用说明</h3>
  <ol>
    <li>连接成功后，在聊天窗口直接对 AI 说：<strong>“登录协作平台”</strong>；</li>
    <li>AI 会引导你调用 <code>login</code> 工具输入账号密码（或 API Key）；</li>
    <li>验证成功后，即可直接使用：<strong>“查我的任务”</strong>、<strong>“帮我填今天2小时工时”</strong>、<strong>“查看本周工时汇总”</strong>等。</li>
  </ol>
</body>
</html>
    `);
  });

  // SSE endpoint for client connection
  app.get('/sse', async (req, res) => {
    console.log(`[SSE] New incoming connection from ${req.ip}`);
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;
    const server = createServer(authManager, () => sessionId);

    sessions.set(sessionId, { transport, server });

    transport.onclose = () => {
      console.log(`[SSE] Session closed: ${sessionId}`);
      sessions.delete(sessionId);
    };

    try {
      await server.connect(transport);
    } catch (err) {
      console.error(`[SSE] Connection error for session ${sessionId}:`, err);
      sessions.delete(sessionId);
    }
  });

  // Client message handling endpoint
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).send('Missing sessionId query parameter');
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).send('Session not found or expired');
      return;
    }

    await session.transport.handlePostMessage(req, res);
  });

  app.listen(port, host, () => {
    console.log(`PIX Collaboration MCP Server running on SSE: http://${host}:${port}`);
    console.log(`SSE endpoint: http://${host}:${port}/sse`);
    console.log(`Health endpoint: http://${host}:${port}/health`);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const transportIdx = args.indexOf('--transport');
const transport = transportIdx !== -1 ? args[transportIdx + 1] : 'stdio';

const portIdx = args.indexOf('--port');
const port = portIdx !== -1 ? Number(args[portIdx + 1]) : 3333;

const hostIdx = args.indexOf('--host');
const host = hostIdx !== -1 ? args[hostIdx + 1] : '0.0.0.0';

if (transport === 'sse') {
  startSse(port, host).catch((err) => {
    console.error('Fatal error running SSE server:', err);
    process.exit(1);
  });
} else {
  startStdio().catch((err) => {
    console.error('Fatal error running stdio server:', err);
    process.exit(1);
  });
}
