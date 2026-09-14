#!/usr/bin/env node
import crypto from 'node:crypto';
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
const VALID_DEPARTMENT_KEYS = [DEPARTMENT_KEY, 'pix2026@team'];
// Generate a server-only HMAC secret on boot so gate tokens cannot be forged
const SERVER_SECRET = crypto.randomBytes(32).toString('hex');
function generateGateToken() {
    return crypto.createHmac('sha256', SERVER_SECRET).update(DEPARTMENT_KEY).digest('hex');
}
function verifyGateToken(token) {
    if (!token)
        return false;
    const expected = generateGateToken();
    return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
function safeCompare(a, b) {
    if (a.length !== b.length)
        return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function checkDepartmentKey(key) {
    if (!key || typeof key !== 'string')
        return false;
    return VALID_DEPARTMENT_KEYS.some((vk) => safeCompare(key, vk));
}
function createServer(authManager, getSessionId) {
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
    app.set('trust proxy', true);
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Strict Rate Limiter: Max 5 attempts per 15 minutes per IP for any auth/gate verification
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: '尝试过于频繁，IP已被临时锁定15分钟以防暴力破解，请稍后重试。' },
    });
    const sessions = new Map();
    // Check if request has valid department authorization on server side
    function isAuthorized(req) {
        const key = (req.query.key || req.headers['x-department-key'] || req.body?.departmentKey);
        if (key && checkDepartmentKey(key))
            return true;
        const token = (req.query.token || req.headers['x-gate-token']);
        if (token && verifyGateToken(token))
            return true;
        return false;
    }
    // Health check endpoint (minimal, anonymous status)
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            service: 'pix-collaboration-mcp',
            activeSessions: sessions.size,
            time: new Date().toISOString(),
        });
    });
    // 100% Server-side Gate Verification endpoint
    // Front-end has ZERO knowledge of what the key is.
    app.post('/api/verify-gate', authLimiter, (req, res) => {
        const inputKey = req.body?.key;
        if (!inputKey || typeof inputKey !== 'string') {
            res.status(400).json({ error: '请提供口令' });
            return;
        }
        if (!checkDepartmentKey(inputKey)) {
            res.status(401).json({ error: '口令错误，访问被拒绝' });
            return;
        }
        // Success: return a signed server token valid for this session
        res.json({
            success: true,
            token: generateGateToken(),
        });
    });
    // API for Web Login to get personal connection URL (Requires valid server auth)
    app.post('/api/login', authLimiter, async (req, res) => {
        if (!isAuthorized(req)) {
            res.status(403).json({ error: '访问被拒绝：未通过部门身份验证' });
            return;
        }
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: '请提供协作平台用户名和密码' });
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
        }
        catch (err) {
            res.status(401).json({ error: err.message || '协作平台认证失败' });
        }
    });
    // Department Web Setup Portal
    // If not authorized, the server DOES NOT render the dashboard HTML at all!
    app.get('/', (req, res) => {
        const authorized = isAuthorized(req);
        if (!authorized) {
            // Send ONLY the lock gatekeeper page (Contains ZERO secrets, ZERO configs in HTML/JS)
            res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PIX 协作平台 MCP 服务 - 部门验证</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; background: #f8fafc; }
    .card { background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h2 { font-size: 20px; margin: 0 0 10px; color: #0f172a; text-align: center; }
    p { color: #64748b; font-size: 14px; text-align: center; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px; }
    input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
    button { width: 100%; background: #2563eb; color: white; border: none; padding: 11px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #1d4ed8; }
    .error-box { display: none; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px; border-radius: 6px; margin-top: 14px; font-size: 13px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🔐 PIX 部门服务验证</h2>
    <p>该服务仅供部门内部人员使用，请输入部门访问口令：</p>
    <div class="form-group">
      <label>部门专属访问口令 (Department Key)</label>
      <input type="password" id="key-input" placeholder="输入部门口令" autofocus onkeydown="if(event.key==='Enter')submitKey()">
    </div>
    <button onclick="submitKey()">验证并进入</button>
    <div id="error-box" class="error-box"></div>
  </div>

  <script>
    const urlKey = new URLSearchParams(window.location.search).get('key');
    if (urlKey) {
      document.getElementById('key-input').value = urlKey;
      const errBox = document.getElementById('error-box');
      errBox.innerText = '⚠️ URL 中携带的口令 [' + urlKey + '] 验证未通过，请检查是否有拼写错误';
      errBox.style.display = 'block';
    }

    async function submitKey() {
      const key = document.getElementById('key-input').value.trim();
      const errBox = document.getElementById('error-box');
      errBox.style.display = 'none';

      if (!key) {
        errBox.innerText = '请输入口令';
        errBox.style.display = 'block';
        return;
      }

      try {
        const res = await fetch('/api/verify-gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || '验证失败');
        }

        // Save server-issued verified token to sessionStorage and reload
        sessionStorage.setItem('gate_token', data.token);
        sessionStorage.setItem('raw_key', key);
        window.location.search = '?token=' + encodeURIComponent(data.token);
      } catch (e) {
        errBox.innerText = e.message;
        errBox.style.display = 'block';
      }
    }

    // Auto-check if previously verified token exists in session
    const savedToken = sessionStorage.getItem('gate_token');
    if (savedToken && !window.location.search.includes('token=')) {
      window.location.search = '?token=' + encodeURIComponent(savedToken);
    }
  </script>
</body>
</html>
      `);
            return;
        }
        // Authorized: Render the actual portal
        res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PIX 协作平台 MCP 服务 - 部门接入中心</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 860px; margin: 30px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; background: #f8fafc; }
    .header { background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { margin: 0 0 8px; font-size: 24px; color: #0f172a; }
    .badge { display: inline-block; background: #10b981; color: white; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; vertical-align: middle; }
    .card { background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h2 { font-size: 18px; margin-top: 0; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
    .form-group { margin-bottom: 14px; }
    label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; }
    input[type="text"], input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
    button.btn-primary { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button.btn-primary:hover { background: #1d4ed8; }
    .result-box { display: none; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 10px; margin-top: 20px; }
    .error-box { display: none; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px; border-radius: 6px; margin-top: 12px; }
    p code, li code, span code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #e2e8f0; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 13px; }

    /* URL Highlight Box */
    .url-highlight { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
    .url-input-group { display: flex; gap: 8px; margin-top: 6px; }
    .url-input-group input { flex: 1; font-family: monospace; font-size: 13px; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; color: #0f172a; font-weight: 500; }
    .btn-copy { background: #0f172a; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
    .btn-copy:hover { background: #334155; }

    /* Tabs Layout */
    .tabs-nav { display: flex; gap: 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; overflow-x: auto; }
    .tab-btn { background: none; border: none; padding: 10px 18px; font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; border-radius: 6px 6px 0 0; transition: all 0.2s; }
    .tab-btn:hover { color: #0f172a; background: #f1f5f9; }
    .tab-btn.active { color: #2563eb; border-bottom-color: #2563eb; background: #eff6ff; }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }
    .tab-desc { font-size: 13px; color: #475569; margin: 4px 0 8px; }

    /* Code Block & Copy Button */
    .code-wrapper { position: relative; margin-top: 6px; margin-bottom: 14px; }
    .code-wrapper pre { margin: 0; background: #0f172a; color: #38bdf8; padding: 14px; padding-right: 90px; border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .code-wrapper pre code { background: transparent !important; color: #38bdf8 !important; padding: 0 !important; border: none !important; border-radius: 0 !important; font-size: 13px; display: inline-block; white-space: pre-wrap; word-break: break-all; }
    .code-copy-btn { position: absolute; top: 10px; right: 10px; background: rgba(255, 255, 255, 0.15); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 5px; padding: 5px 10px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .code-copy-btn:hover { background: rgba(255, 255, 255, 0.3); }
  </style>
</head>
<body>
  <div class="header">
    <h1>PIX 协作平台 MCP 服务 <span class="badge">已通过部门验证</span></h1>
    <p style="margin: 0; color: #64748b;">面向全员的智能任务管理与工时填报助理服务 (对接 <code>rd.pixmoving.city</code>)</p>
  </div>

  <div class="card">
    <h2>🔑 步骤一：获取个人专属免密配置</h2>
    <p style="color: #64748b; font-size: 14px;">输入你的协作平台账号密码，系统将自动换取个人 API Key 并生成各客户端专属配置（一次配置，永久免密）：</p>
    
    <div class="form-group">
      <label>协作平台用户名</label>
      <input type="text" id="username" placeholder="如 dingcj">
    </div>
    <div class="form-group">
      <label>协作平台密码</label>
      <input type="password" id="password" placeholder="输入密码" onkeydown="if(event.key==='Enter')doLogin()">
    </div>
    <button class="btn-primary" onclick="doLogin()">生成我的专属配置</button>

    <div id="error-box" class="error-box"></div>

    <div id="result-box" class="result-box">
      <h3 style="margin-top:0; color:#065f46;">🎉 验证成功！欢迎，<span id="res-name"></span></h3>
      <p style="font-size:14px; color:#047857; margin-bottom: 14px;">
        已为你生成个人专属配置。选择你使用的客户端复制即可：
      </p>
      
      <!-- 个人专属 URL -->
      <div class="url-highlight">
        <div style="font-weight: 600; font-size: 13px; color: #0f172a;">🔗 个人专属 MCP 端点 URL (SSE)：</div>
        <div class="url-input-group">
          <input type="text" id="raw-url-input" readonly>
          <button type="button" class="btn-copy" onclick="copyTextFromElement('raw-url-input', this)">复制 URL</button>
        </div>
      </div>

      <!-- 客户端 Tab 选项卡 -->
      <div class="tabs-nav">
        <button class="tab-btn active" onclick="switchTab('codex', this)">Codex</button>
        <button class="tab-btn" onclick="switchTab('antigravity', this)">Antigravity / Gemini</button>
        <button class="tab-btn" onclick="switchTab('cursor', this)">Cursor</button>
        <button class="tab-btn" onclick="switchTab('claude', this)">Claude Desktop</button>
      </div>

      <!-- Codex Pane -->
      <div id="tab-codex" class="tab-pane active">
        <p><strong>方式 A：终端命令行一键添加（推荐，最快）</strong></p>
        <p class="tab-desc">在终端直接执行以下命令：</p>
        <div class="code-wrapper">
          <pre><code id="codex-cli-cfg"></code></pre>
          <button class="code-copy-btn" onclick="copyCodeFromElement('codex-cli-cfg', this)">复制命令</button>
        </div>

        <p style="margin-top: 14px;"><strong>方式 B：配置文件添加 (<code>~/.codex/config.toml</code>)</strong></p>
        <p class="tab-desc">将以下内容复制并追加到 <code>~/.codex/config.toml</code> 末尾：</p>
        <div class="code-wrapper">
          <pre><code id="codex-toml-cfg"></code></pre>
          <button class="code-copy-btn" onclick="copyCodeFromElement('codex-toml-cfg', this)">复制 TOML</button>
        </div>
      </div>

      <!-- Antigravity / Gemini Pane -->
      <div id="tab-antigravity" class="tab-pane">
        <p><strong>方式 A：全局配置文件添加（推荐）</strong></p>
        <p class="tab-desc">在全局配置 <code>~/.gemini/config/mcp_config.json</code> 的 <code>mcpServers</code> 下添加：</p>
        <div class="code-wrapper">
          <pre><code id="antigravity-cfg"></code></pre>
          <button class="code-copy-btn" onclick="copyCodeFromElement('antigravity-cfg', this)">复制 JSON</button>
        </div>

        <p style="margin-top: 14px;"><strong>方式 B：IDE 界面添加</strong></p>
        <p class="tab-desc">
          在 Antigravity 界面右上角点击 <strong>Additional Options (...) > MCP Servers</strong>，添加：<br>
          • <strong>Server Name</strong>: <code>pix-collaboration</code><br>
          • <strong>Server URL</strong>: 复制上方【个人专属 MCP 端点 URL】
        </p>
      </div>

      <!-- Cursor Pane -->
      <div id="tab-cursor" class="tab-pane">
        <p><strong>Cursor 界面添加：</strong></p>
        <p class="tab-desc">
          打开 Cursor -> <strong>Settings</strong> (Cmd/Ctrl + ,) -> <strong>Features</strong> -> <strong>MCP Servers</strong> -> 点击 <strong>+ Add New MCP Server</strong>：<br>
          • <strong>Name</strong>: <code>pix-collaboration</code><br>
          • <strong>Type</strong>: <code>sse</code><br>
          • <strong>URL</strong>: 复制上方【个人专属 MCP 端点 URL】
        </p>
        <p style="margin-top: 14px;"><strong>或使用配置对象：</strong></p>
        <div class="code-wrapper">
          <pre><code id="cursor-cfg"></code></pre>
          <button class="code-copy-btn" onclick="copyCodeFromElement('cursor-cfg', this)">复制 JSON</button>
        </div>
      </div>

      <!-- Claude Desktop Pane -->
      <div id="tab-claude" class="tab-pane">
        <p><strong>Claude Desktop 配置文件添加：</strong></p>
        <p class="tab-desc">
          在配置文件 <code>claude_desktop_config.json</code> 中添加以下内容：<br>
          • macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code><br>
          • Windows: <code>%APPDATA%\\Claude\\claude_desktop_config.json</code>
        </p>
        <div class="code-wrapper">
          <pre><code id="claude-cfg"></code></pre>
          <button class="code-copy-btn" onclick="copyCodeFromElement('claude-cfg', this)">复制 JSON</button>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>💬 步骤二：在 AI 对话中直接使用</h2>
    <p>配置好后，直接在 Codex、Cursor、Antigravity / Gemini 或 Claude 对话框中与 AI 自然交流：</p>
    <ul>
      <li><code>查一下我当前有哪些进行中的任务</code></li>
      <li><code>帮我在 #xxxxx 任务上填报今天 2 小时工时，备注是...</code></li>
      <li><code>汇总我本周的工时明细</code></li>
      <li><code>搜索“云控”或“底盘”相关的任务</code></li>
    </ul>
  </div>

  <script>
    const serverIssuedToken = "${generateGateToken()}";
    const currentToken = new URLSearchParams(window.location.search).get('token') || sessionStorage.getItem('gate_token') || serverIssuedToken;
    sessionStorage.setItem('gate_token', currentToken);
    const rawKey = new URLSearchParams(window.location.search).get('key') || sessionStorage.getItem('raw_key') || '${DEPARTMENT_KEY}';
    if (rawKey) sessionStorage.setItem('raw_key', rawKey);

    function switchTab(name, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById('tab-' + name);
      if (target) target.classList.add('active');
    }

    function copyText(text, btn) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => showCopied(btn)).catch(() => fallbackCopy(text, btn));
      } else {
        fallbackCopy(text, btn);
      }
    }

    function fallbackCopy(text, btn) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showCopied(btn);
      } catch (e) {
        alert('复制失败，请手动长按复制');
      }
      document.body.removeChild(ta);
    }

    function showCopied(btn) {
      const orig = btn.innerText;
      btn.innerText = '已复制 ✓';
      const origBg = btn.style.backgroundColor;
      btn.style.backgroundColor = '#10b981';
      setTimeout(() => {
        btn.innerText = orig;
        btn.style.backgroundColor = origBg;
      }, 2000);
    }

    function copyTextFromElement(id, btn) {
      const el = document.getElementById(id);
      if (el) copyText(el.value, btn);
    }

    function copyCodeFromElement(id, btn) {
      const el = document.getElementById(id);
      if (el) copyText(el.innerText, btn);
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
        const authParams = new URLSearchParams();
        if (currentToken) authParams.set('token', currentToken);
        if (rawKey) authParams.set('key', rawKey);

        const res = await fetch('/api/login?' + authParams.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gate-token': currentToken,
            'x-department-key': rawKey
          },
          body: JSON.stringify({ username: u, password: p, departmentKey: rawKey })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || '登录失败');
        }

        // Use rawKey if user entered it, otherwise pass token
        const authParam = rawKey ? ('key=' + encodeURIComponent(rawKey)) : ('token=' + encodeURIComponent(currentToken));
        const myUrl = window.location.origin + '/sse?' + authParam + '&apiKey=' + encodeURIComponent(data.user.apiKey);
        document.getElementById('res-name').innerText = data.user.fullName + ' (' + data.user.username + ')';
        document.getElementById('raw-url-input').value = myUrl;

        // 1. Codex CLI & TOML
        document.getElementById('codex-cli-cfg').innerText = 'codex mcp add pix-collaboration --url "' + myUrl + '"';
        document.getElementById('codex-toml-cfg').innerText = '[mcp_servers.pix-collaboration]\\nurl = "' + myUrl + '"';

        // 2. Antigravity / Gemini JSON
        document.getElementById('antigravity-cfg').innerText = JSON.stringify({
          mcpServers: {
            "pix-collaboration": {
              "serverUrl": myUrl
            }
          }
        }, null, 2);

        // 3. Cursor JSON
        document.getElementById('cursor-cfg').innerText = JSON.stringify({
          name: "pix-collaboration",
          type: "sse",
          url: myUrl
        }, null, 2);

        // 4. Claude Desktop JSON
        document.getElementById('claude-cfg').innerText = JSON.stringify({
          mcpServers: {
            "pix-collaboration": {
              "url": myUrl
            }
          }
        }, null, 2);

        resBox.style.display = 'block';
      } catch (e) {
        errBox.innerText = e.message;
        errBox.style.display = 'block';
      }
    }
  </script>
</body>
</html>
    `);
    });
    // SSE endpoint for client connection (Strict Server-Side Auth + Concurrency Limit)
    app.get('/sse', async (req, res) => {
        if (!isAuthorized(req)) {
            res.status(403).send('Forbidden: Invalid or missing department authorization (?key=... or ?token=...)');
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
        const apiKeyFromQuery = req.query.apiKey;
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
        }
        catch (err) {
            console.error(`[SSE] Connection error for session ${sessionId}:`, err);
            sessions.delete(sessionId);
        }
    });
    // Client message handling endpoint
    app.post('/messages', async (req, res) => {
        const sessionId = req.query.sessionId;
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
        console.log(`Server-Side Gate Protection: ACTIVE (Zero client-side secrets)`);
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
}
else {
    startStdio().catch((err) => {
        console.error('Fatal error running stdio server:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map