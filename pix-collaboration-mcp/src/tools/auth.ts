import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AuthManager } from '../auth.js';
import { RedmineClient } from '../redmine-client.js';

export function registerAuthTools(
  server: McpServer,
  authManager: AuthManager,
  getSessionId?: () => string | undefined
) {
  server.tool(
    'login',
    '登录 PIX/RUBYLOFT 协作平台 (rd.pixmoving.city)。支持通过协作平台日常账号密码登录（自动获取 API Key），或直接提供 API Key。登录成功后凭据将安全保存在本地，无需重复登录。',
    {
      username: z.string().optional().describe('协作平台登录用户名 (例如 dingcj)'),
      password: z.string().optional().describe('协作平台登录密码'),
      api_key: z.string().optional().describe('协作平台 API Key (如果已有可直接提供，否则输入用户名密码即可)'),
      base_url: z
        .string()
        .optional()
        .describe('协作平台地址，默认为 https://rd.pixmoving.city'),
    },
    async ({ username, password, api_key, base_url }) => {
      const sessionId = getSessionId ? getSessionId() : undefined;

      try {
        if (api_key) {
          const session = await authManager.loginWithApiKey(api_key, sessionId, base_url);
          return {
            content: [
              {
                type: 'text',
                text: `✅ API Key 验证成功！\n已登录用户：${session.fullName} (${session.username})\n用户 ID：${session.userId}\n平台地址：${session.baseUrl}\n凭据已保存到本地。`,
              },
            ],
          };
        }

        if (username && password) {
          const session = await authManager.loginWithPassword(
            username,
            password,
            sessionId,
            base_url
          );
          return {
            content: [
              {
                type: 'text',
                text: `✅ 登录成功！\n已登录用户：${session.fullName} (${session.username})\n用户 ID：${session.userId}\n平台地址：${session.baseUrl}\n凭据已自动保存在本地，后续操作将自动以您的身份执行。`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: '❌ 缺少登录参数：请提供 username 和 password，或者提供 api_key。',
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 登录失败：${err.message || String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'whoami',
    '检查当前协作平台的登录状态和个人信息（包括姓名、用户名、用户 ID、平台地址等）。',
    {},
    async () => {
      const sessionId = getSessionId ? getSessionId() : undefined;
      const session = authManager.getSession(sessionId);

      if (!session) {
        return {
          content: [
            {
              type: 'text',
              text: '⚠️ 当前尚未登录协作平台。\n请调用 login 工具，提供您的协作平台账号和密码进行登录。',
            },
          ],
        };
      }

      try {
        const client = new RedmineClient(session.baseUrl, session.apiKey);
        const { user } = await client.getCurrentUser();
        const fullName = `${user.lastname || ''}${user.firstname || ''}`.trim() || user.login;

        return {
          content: [
            {
              type: 'text',
              text: `👤 当前登录信息：\n• 姓名：${fullName}\n• 用户名：${user.login}\n• 用户 ID：${user.id}\n• 平台地址：${session.baseUrl}\n• 邮箱：${user.mail || '未公开'}\n• 认证状态：有效`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ 本地保存了用户 ${session.fullName} (${session.username}) 的凭据，但在连接协作平台验证时失败：${err.message || String(err)}。\n请尝试重新调用 login 登录。`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'logout',
    '退出当前登录状态，清除保存在本地的凭据缓存。',
    {},
    async () => {
      const sessionId = getSessionId ? getSessionId() : undefined;
      authManager.logout(sessionId);
      return {
        content: [
          {
            type: 'text',
            text: '👋 已注销登录并清除了本地凭据缓存。',
          },
        ],
      };
    }
  );
}
