#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { AuthManager } from './auth.js';
import { registerAuthTools } from './tools/auth.js';
import { registerIssueTools } from './tools/issues.js';
import { registerTimeEntryTools } from './tools/time_entries.js';
import { registerMetadataTools } from './tools/metadata.js';

const DEPARTMENT_KEY = process.env.DEPARTMENT_KEY || 'pix@team2026';

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
  const authManager = new AuthManager(process.env.REDMINE_BASE_URL, false);
  const server = createServer(authManager, () => undefined);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PIX Collaboration MCP Server running via stdio');
}

async function startSse(port = 3333, host = '0.0.0.0') {
  const authManager = new AuthManager(process.env.REDMINE_BASE_URL, true);
  const app = express();

  app.disable('x-powered-by');

  // Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate Limiter for Login Endpoint: max 5 requests per 15 minutes per IP
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '登录尝试过于频繁，IP已被临时锁定15分钟以防暴力破解，请稍后重试。' },
  });

  const sessions = new Map<string, { transport: SSEServerTransport; server: McpServer; clientIp: string }>();

  function isKeyValid(req: express.Request): boolean {
    const key = (req.query.key || req.headers['x-department-key'] || req.body?.departmentKey) as string | undefined;
    return key === DEPARTMENT_KEY;
  }

  // Health check endpoint (lightweight, anonymous status)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'pix-collaboration-mcp',
      activeSessions: sessions.size,
      time: new Date().toISOString(),
    });
  });

  // API for Web Login to get personal connection URL (Protected with Rate Limit + Department Key)
  app.post('/api/login', loginLimiter, async (req, res) => {
    if (!isKeyValid(req)) {
      res.status(403).json({ error: '访问被拒绝：缺少或无效的部门访问口令 (Department Key)' });
      return;
    }

    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: '请提供用户名和密码' });
      return;
    }

    try {
      const session = await authManager.loginWithPassword(username, password);
      res.json({
        success: true,
        user: {
          id: session.userId,
          username: session.username,
          fullName: session.fullName,
          apiKey: session.apiKey,
        },
      });
    } catch (err: any) {
      res.status(401).json({ error: err.message || '认证失败' });
    }
  });

  // Department Web Setup Portal
  app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PIX 协作平台 MCP 服务 - 部门接入中心</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 30px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; background: #f8fafc; }
    .header { background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { margin: 0 0 8px; font-size: 24px; color: #0f172a; }
    .badge { display: inline-block; background: #10b981; color: white; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; vertical-align: middle; }
    .badge-lock { background: #6366f1; }
    .card { background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h2 { font-size: 18px; margin-top: 0; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
    .form-group { margin-bottom: 14px; }
    label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; }
    input[type="text"], input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
    button { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #1d4ed8; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.5; }
    .result-box { display: none; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin-top: 16px; }
    .error-box { display: none; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px; border-radius: 6px; margin-top: 12px; }
    code { font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PIX 协作平台 MCP 服务 <span class="badge">已上线</span> <span class="badge badge-lock">🛡️ 部门安全加固</span></h1>
    <p style="margin: 0; color: #64748b;">面向全员的智能任务管理与工时填报助理服务 (对接 <code>rd.pixmoving.city</code>)</p>
  </div>

  <!-- Gatekeeper Card: Department Access Key -->
  <div id="gatekeeper-card" class="card" style="display: none;">
    <h2>🔐 部门访问验证</h2>
    <p style="color: #64748b; font-size: 14px;">本服务为部门内部服务，请先输入部门统一访问口令 (Department Key)：</p>
    <div class="form-group">
      <label>部门访问口令</label>
      <input type="password" id="dept-key-input" placeholder="输入部门口令">
    </div>
    <button onclick="unlockPortal()">进入接入中心</button>
    <div id="gate-error" class="error-box"></div>
  </div>

  <!-- Main Content Card (Shown when key is verified) -->
  <div id="main-content" style="display: none;">
    <div class="card">
      <h2>🔑 步骤一：获取个人专属连接配置（一次配置，永久免密）</h2>
      <p style="color: #64748b; font-size: 14px;">输入你的协作平台账号密码，系统将自动换取你的专属 API Key 并生成专属配置：</p>
      
      <div class="form-group">
        <label>协作平台用户名</label>
        <input type="text" id="username" placeholder="如 dingcj">
      </div>
      <div class="form-group">
        <label>协作平台密码</label>
        <input type="password" id="password" placeholder="输入密码">
      </div>
      <button onclick="doLogin()">生成我的专属配置</button>

      <div id="error-box" class="error-box"></div>

      <div id="result-box" class="result-box">
        <h3 style="margin-top:0; color:#065f46;">🎉 验证成功！欢迎，<span id="res-name"></span></h3>
        <p style="font-size:14px; color:#047857;">已为你生成专属配置。复制下方代码直接粘贴到客户端即可永久免密使用：</p>
        
        <p><strong>Cursor 配置（Settings -> Features -> MCP Servers）：</strong></p>
        <pre id="cursor-cfg"></pre>

        <p><strong>Claude Desktop 配置（claude_desktop_config.json）：</strong></p>
        <pre id="claude-cfg"></pre>
      </div>
    </div>

    <div class="card">
      <h2>💬 步骤二：在 AI 对话中直接使用</h2>
      <p>配置好后，直接在 Cursor 或 Claude 对话框中与 AI 自然交流：</p>
      <ul>
        <li><code>查一下我当前有哪些进行中的任务</code></li>
        <li><code>帮我在 #xxxxx 任务上填报今天 2 小时工时，备注是...</code></li>
        <li><code>汇总我本周的工时明细</code></li>
      </ul>
    </div>
  </div>

  <script>
    const EXPECTED_KEY = "${DEPARTMENT_KEY}";
    let currentKey = new URLSearchParams(window.location.search).get('key') || sessionStorage.getItem('dept_key') || '';

    function checkAuth() {
      if (currentKey === EXPECTED_KEY) {
        document.getElementById('gatekeeper-card').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
      } else {
        document.getElementById('gatekeeper-card').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
      }
    }

    function unlockPortal() {
      const val = document.getElementById('dept-key-input').value.trim();
      if (val === EXPECTED_KEY) {
        currentKey = val;
        sessionStorage.setItem('dept_key', val);
        checkAuth();
      } else {
        const err = document.getElementById('gate-error');
        err.innerText = '口令错误，请向部门管理员获取正确的部门口令。';
        err.style.display = 'block';
      }
    }

    async function doLogin() {
      const u = document.getElementById('username').value.trim();
      const p = document.getElementById('password').value.trim();
      const errBox = document.getElementById('error-box');
      const resBox = document.getElementById('result-box');
      errBox.style.display = 'none';
      resBox.style.display = 'none';

      if (!u || !p) {
        errBox.innerText = '请填写用户名和密码';
        errBox.style.display = 'block';
        return;
      }

      try {
        const res = await fetch('/api/login?key=' + encodeURIComponent(currentKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p, departmentKey: currentKey })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || '登录失败');
        }

        const myUrl = window.location.origin + '/sse?key=' + encodeURIComponent(currentKey) + '&apiKey=' + data.user.apiKey;
        document.getElementById('res-name').innerText = data.user.fullName + ' (' + data.user.username + ')';

        document.getElementById('cursor-cfg').innerText = JSON.stringify({
          name: "pix-collaboration",
          type: "sse",
          url: myUrl
        }, null, 2);

        document.getElementById('claude-cfg').innerText = JSON.stringify({
          mcpServers: {
            "pix-collaboration": {
              url: myUrl
            }
          }
        }, null, 2);

        resBox.style.display = 'block';
      } catch (e) {
        errBox.innerText = e.message;
        errBox.style.display = 'block';
      }
    }

    checkAuth();
  </script>
</body>
</html>
    `);
  });

  // SSE endpoint for client connection (Protected with Department Key + Concurrency Limit)
  app.get('/sse', async (req, res) => {
    if (!isKeyValid(req)) {
      res.status(403).send('Forbidden: Invalid or missing department key (?key=...)');
      return;
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const ipConnections = Array.from(sessions.values()).filter((s) => s.clientIp === clientIp).length;
    if (ipConnections >= 10) {
      res.status(429).send('Too Many Connections: Exceeded maximum concurrent connections per IP');
      return;
    }

    if (sessions.size >= 100) {
      res.status(503).send('Service Busy: Server reached maximum connection capacity');
      return;
    }

    console.log(`[SSE] Authorized incoming connection from ${clientIp}`);
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;
    const server = createServer(authManager, () => sessionId);

    sessions.set(sessionId, { transport, server, clientIp });

    // Check if user passed personal API Key in URL query or Authorization header
    const apiKeyFromQuery = req.query.apiKey as string | undefined;
    const authHeader = req.headers.authorization;
    let apiKey = apiKeyFromQuery;
    if (!apiKey && authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.slice(7).trim();
    }

    if (apiKey) {
      authManager
        .loginWithApiKey(apiKey, sessionId)
        .then((sess) => {
          console.log(`[SSE] Session ${sessionId} pre-authenticated as ${sess.fullName} (${sess.username})`);
        })
        .catch((err) => {
          console.warn(`[SSE] Pre-auth failed for session ${sessionId}:`, err.message);
        });
    }

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

    await session.transport.handlePostMessage(req, res, req.body);
  });

  app.listen(port, host, () => {
    console.log(`PIX Collaboration MCP Server running on SSE: http://${host}:${port}`);
    console.log(`SSE endpoint: http://${host}:${port}/sse`);
    console.log(`Health endpoint: http://${host}:${port}/health`);
    console.log(`Department Key Protection: ACTIVE (default: ${DEPARTMENT_KEY})`);
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
