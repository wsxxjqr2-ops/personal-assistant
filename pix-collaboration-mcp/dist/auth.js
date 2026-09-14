import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const DEFAULT_BASE_URL = process.env.REDMINE_BASE_URL || 'https://rd.pixmoving.city';
const CONFIG_DIR = path.join(os.homedir(), '.config', 'pix-collaboration');
const CONFIG_FILE = path.join(CONFIG_DIR, 'auth.json');
export class AuthManager {
    defaultBaseUrl;
    memorySessions = new Map();
    constructor(defaultBaseUrl = DEFAULT_BASE_URL) {
        this.defaultBaseUrl = defaultBaseUrl.replace(/\/+$/, '');
    }
    /**
     * Resolve active session for a given sessionId (or fallback to local file / env var)
     */
    getSession(sessionId) {
        if (sessionId && this.memorySessions.has(sessionId)) {
            const sess = this.memorySessions.get(sessionId);
            sess.lastActive = Date.now();
            return sess;
        }
        // If env var is set, use it as default
        if (process.env.REDMINE_API_KEY) {
            return {
                userId: Number(process.env.REDMINE_USER_ID || 0),
                username: process.env.REDMINE_USERNAME || 'env_user',
                fullName: process.env.REDMINE_FULL_NAME || 'Env User',
                apiKey: process.env.REDMINE_API_KEY,
                baseUrl: this.defaultBaseUrl,
                lastActive: Date.now(),
            };
        }
        // Try reading from local config file
        const fileSession = this.loadFromFile();
        if (fileSession) {
            if (sessionId) {
                this.memorySessions.set(sessionId, fileSession);
            }
            return fileSession;
        }
        return null;
    }
    /**
     * Authenticate using username and password via Basic Auth to Redmine
     */
    async loginWithPassword(username, pass, sessionId, baseUrl) {
        const targetUrl = (baseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
        const basicAuth = Buffer.from(`${username}:${pass}`).toString('base64');
        const res = await fetch(`${targetUrl}/users/current.json`, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${basicAuth}`,
                Accept: 'application/json',
            },
        });
        if (!res.ok) {
            if (res.status === 401) {
                throw new Error('登录失败：用户名或密码错误。');
            }
            throw new Error(`协作平台认证失败 (HTTP ${res.status}): ${await res.text()}`);
        }
        const data = (await res.json());
        const user = data.user;
        if (!user || !user.api_key) {
            throw new Error('登录成功，但未能在协作平台获取到该账号的 API Key，请确认在平台个人中心已开启 API 访问权限。');
        }
        const fullName = `${user.lastname || ''}${user.firstname || ''}`.trim() || user.login;
        const session = {
            userId: user.id,
            username: user.login,
            fullName,
            apiKey: user.api_key,
            baseUrl: targetUrl,
            lastActive: Date.now(),
        };
        if (sessionId) {
            this.memorySessions.set(sessionId, session);
        }
        // Also save locally for persistence
        this.saveToFile(session);
        return session;
    }
    /**
     * Authenticate directly using an existing API key
     */
    async loginWithApiKey(apiKey, sessionId, baseUrl) {
        const targetUrl = (baseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
        const res = await fetch(`${targetUrl}/users/current.json`, {
            method: 'GET',
            headers: {
                'X-Redmine-API-Key': apiKey,
                Accept: 'application/json',
            },
        });
        if (!res.ok) {
            throw new Error(`API Key 无效或过期 (HTTP ${res.status})`);
        }
        const data = (await res.json());
        const user = data.user;
        const fullName = `${user.lastname || ''}${user.firstname || ''}`.trim() || user.login;
        const session = {
            userId: user.id,
            username: user.login,
            fullName,
            apiKey,
            baseUrl: targetUrl,
            lastActive: Date.now(),
        };
        if (sessionId) {
            this.memorySessions.set(sessionId, session);
        }
        this.saveToFile(session);
        return session;
    }
    /**
     * Logout session
     */
    logout(sessionId) {
        if (sessionId) {
            this.memorySessions.delete(sessionId);
        }
        // Remove local file
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                fs.unlinkSync(CONFIG_FILE);
            }
        }
        catch {
            // ignore
        }
    }
    loadFromFile() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed.apiKey && parsed.username) {
                    return parsed;
                }
            }
        }
        catch {
            // ignore
        }
        return null;
    }
    saveToFile(session) {
        try {
            if (!fs.existsSync(CONFIG_DIR)) {
                fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
            }
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(session, null, 2), {
                encoding: 'utf8',
                mode: 0o600,
            });
        }
        catch (err) {
            console.error('Warning: could not save auth credentials to local config file:', err);
        }
    }
}
//# sourceMappingURL=auth.js.map