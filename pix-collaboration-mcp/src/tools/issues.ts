import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AuthManager } from '../auth.js';
import { RedmineClient } from '../redmine-client.js';

export function registerIssueTools(
  server: McpServer,
  authManager: AuthManager,
  getSessionId?: () => string | undefined
) {
  function getClient(): { client: RedmineClient; baseUrl: string; fullName: string } {
    const sessionId = getSessionId ? getSessionId() : undefined;
    const session = authManager.getSession(sessionId);
    if (!session) {
      throw new Error(
        '未检测到登录凭据。请先使用 login 工具登录（输入您的协作平台账号密码），或配置 REDMINE_API_KEY。'
      );
    }
    return {
      client: new RedmineClient(session.baseUrl, session.apiKey),
      baseUrl: session.baseUrl,
      fullName: session.fullName,
    };
  }

  server.tool(
    'query_my_issues',
    '查询指派给当前登录人的任务列表。支持按状态（open 开启中 / * 全部 / closed 已关闭）、目标版本、模块分类或关键字筛选。',
    {
      status: z
        .enum(['open', '*', 'closed'])
        .optional()
        .default('open')
        .describe("任务状态：'open' (进行中/未关闭, 默认), '*' (全部), 'closed' (已关闭)"),
      fixed_version_id: z
        .union([z.number(), z.string()])
        .optional()
        .describe('目标版本 (fixed_version) ID，例如 815'),
      category_id: z
        .union([z.number(), z.string()])
        .optional()
        .describe('模块类别 (category) ID'),
      tracker_id: z
        .union([z.number(), z.string()])
        .optional()
        .describe('跟踪类型 ID (如 1 缺陷, 2 功能, 3 支持)'),
      keyword: z.string().optional().describe('任务标题关键字匹配'),
      due_date: z
        .string()
        .optional()
        .describe('到期日过滤，如 ">=2026-05-01" 或 "><2026-05-01|2026-05-31"'),
      limit: z.number().optional().default(30).describe('返回最大条数 (默认 30)'),
    },
    async ({ status, fixed_version_id, category_id, tracker_id, keyword, due_date, limit }) => {
      try {
        const { client, baseUrl, fullName } = getClient();
        const res = await client.queryIssues({
          assigned_to_id: 'me',
          status_id: status,
          fixed_version_id,
          category_id,
          tracker_id,
          subject: keyword,
          due_date,
          limit,
        });

        if (!res.issues || res.issues.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `未查找到符合条件的指派给【${fullName}】的任务 (状态: ${status})。`,
              },
            ],
          };
        }

        const lines = [
          `### 📋 指派给【${fullName}】的任务列表 (共 ${res.total_count} 条，显示前 ${res.issues.length} 条)：\n`,
          '| ID | 跟踪 | 标题 | 状态 | 进度 | 到期日 | 目标版本 | 类别 |',
          '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
        ];

        for (const it of res.issues) {
          const idLink = `[#${it.id}](${baseUrl}/issues/${it.id})`;
          const tracker = it.tracker?.name || '-';
          const subject = (it.subject || '').replace(/\|/g, '\\|');
          const st = it.status?.name || '-';
          const progress = `${it.done_ratio ?? 0}%`;
          const due = it.due_date || '-';
          const ver = it.fixed_version?.name || '-';
          const cat = it.category?.name || '-';
          lines.push(
            `| ${idLink} | ${tracker} | ${subject} | ${st} | ${progress} | ${due} | ${ver} | ${cat} |`
          );
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `❌ 查询失败：${err.message || String(err)}` }] };
      }
    }
  );

  server.tool(
    'search_issues',
    '多条件搜索协作平台的任务（不仅限于指派给自己的任务）。',
    {
      keyword: z.string().optional().describe('任务标题关键字模糊匹配'),
      assigned_to_id: z
        .union([z.number(), z.string()])
        .optional()
        .describe('指派人用户 ID，或 "me" 表示当前登录人'),
      status: z
        .string()
        .optional()
        .default('open')
        .describe("状态，如 'open' (未关闭), '*' (全部), 或指定状态 ID"),
      project_id: z.union([z.number(), z.string()]).optional().describe('项目 ID 或标识符'),
      fixed_version_id: z.union([z.number(), z.string()]).optional().describe('目标版本 ID'),
      category_id: z.union([z.number(), z.string()]).optional().describe('分类 ID'),
      limit: z.number().optional().default(30).describe('返回最大条目数'),
    },
    async (params) => {
      try {
        const { client, baseUrl } = getClient();
        const res = await client.queryIssues({
          subject: params.keyword,
          assigned_to_id: params.assigned_to_id,
          status_id: params.status,
          fixed_version_id: params.fixed_version_id,
          category_id: params.category_id,
          limit: params.limit,
        });

        if (!res.issues || res.issues.length === 0) {
          return { content: [{ type: 'text', text: '未搜索到匹配的任务。' }] };
        }

        const lines = [
          `### 🔍 搜索结果 (共 ${res.total_count} 条，显示前 ${res.issues.length} 条)：\n`,
          '| ID | 指派给 | 跟踪 | 标题 | 状态 | 进度 | 到期日 |',
          '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
        ];

        for (const it of res.issues) {
          const idLink = `[#${it.id}](${baseUrl}/issues/${it.id})`;
          const assignee = it.assigned_to?.name || '未指派';
          const tracker = it.tracker?.name || '-';
          const subject = (it.subject || '').replace(/\|/g, '\\|');
          const st = it.status?.name || '-';
          const progress = `${it.done_ratio ?? 0}%`;
          const due = it.due_date || '-';
          lines.push(`| ${idLink} | ${assignee} | ${tracker} | ${subject} | ${st} | ${progress} | ${due} |`);
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `❌ 搜索任务失败：${err.message || String(err)}` }] };
      }
    }
  );

  server.tool(
    'get_issue_detail',
    '获取单个任务的详细信息，包含任务描述、工时预估、历史变更记录与备注。',
    {
      issue_id: z.number().describe('任务 ID (例如 23067)'),
    },
    async ({ issue_id }) => {
      try {
        const { client, baseUrl } = getClient();
        const { issue } = await client.getIssue(issue_id);

        const lines = [
          `# [#${issue.id}: ${issue.subject}](${baseUrl}/issues/${issue.id})\n`,
          `• **项目**：${issue.project?.name || '-'}`,
          `• **跟踪类型**：${issue.tracker?.name || '-'}`,
          `• **状态**：${issue.status?.name || '-'}`,
          `• **优先级**：${issue.priority?.name || '-'}`,
          `• **指派给**：${issue.assigned_to?.name || '未指派'}`,
          `• **作者**：${issue.author?.name || '-'}`,
          `• **目标版本**：${issue.fixed_version?.name || '无'}`,
          `• **类别**：${issue.category?.name || '无'}`,
          `• **进度**：${issue.done_ratio}%`,
          `• **开始日期**：${issue.start_date || '未设置'}`,
          `• **计划完成日期 (到期日)**：${issue.due_date || '未设置'}`,
          `• **预估工时**：${issue.estimated_hours ?? 0} 小时`,
          `• **已登记工时**：${issue.spent_hours ?? 0} 小时\n`,
          `### 📝 任务描述：\n${issue.description || '（无描述）'}\n`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `❌ 获取任务详情失败：${err.message || String(err)}` }] };
      }
    }
  );

  server.tool(
    'create_issue',
    '在协作平台创建新的任务。注意：平台强制要求提供“计划完成日期 (due_date)”和“预期时间 (estimated_hours)”。',
    {
      subject: z.string().describe('任务标题'),
      due_date: z.string().describe('计划完成日期，格式 YYYY-MM-DD (平台必填)'),
      estimated_hours: z.number().describe('预期工时 (小时数，平台必填)'),
      description: z.string().optional().describe('任务详细描述'),
      project_id: z
        .union([z.number(), z.string()])
        .optional()
        .default(16)
        .describe('项目 ID，默认为 16 (PIX 项目)'),
      tracker_id: z
        .union([z.number(), z.string()])
        .optional()
        .default(2)
        .describe('跟踪类型 ID (1 缺陷/Bug, 2 功能, 3 支持，默认为 2)'),
      assigned_to_id: z
        .union([z.number(), z.string()])
        .optional()
        .describe('指派人用户 ID，不填则默认指派给当前登录人'),
      fixed_version_id: z.union([z.number(), z.string()]).optional().describe('目标版本 ID'),
      category_id: z.union([z.number(), z.string()]).optional().describe('模块分类 ID'),
      start_date: z.string().optional().describe('开始日期 (YYYY-MM-DD)'),
    },
    async (params) => {
      try {
        const { client, baseUrl } = getClient();
        const sessionId = getSessionId ? getSessionId() : undefined;
        const currentSession = authManager.getSession(sessionId);

        const assignedTo = params.assigned_to_id || currentSession?.userId;

        const { issue } = await client.createIssue({
          project_id: params.project_id,
          subject: params.subject,
          description: params.description,
          tracker_id: params.tracker_id,
          due_date: params.due_date,
          estimated_hours: params.estimated_hours,
          assigned_to_id: assignedTo,
          fixed_version_id: params.fixed_version_id,
          category_id: params.category_id,
          start_date: params.start_date,
        });

        return {
          content: [
            {
              type: 'text',
              text: `✅ 任务创建成功！\n• 任务 ID：[#${issue.id}](${baseUrl}/issues/${issue.id})\n• 标题：${issue.subject}\n• 指派给：${issue.assigned_to?.name || '未指派'}\n• 计划完成日期：${issue.due_date}\n• 预估工时：${issue.estimated_hours}h`,
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `❌ 创建任务失败：${err.message || String(err)}` }] };
      }
    }
  );

  server.tool(
    'update_issue',
    '更新任务状态、完成进度、或追加进展备注。',
    {
      issue_id: z.number().describe('要更新的任务 ID'),
      done_ratio: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('完成进度百分比 (0 到 100)'),
      status_id: z
        .number()
        .optional()
        .describe('状态 ID (例如 2 进行中, 3 已解决, 5 已取消, 1 关闭等)'),
      notes: z.string().optional().describe('进展说明 / 备注留言'),
      due_date: z.string().optional().describe('修改后的到期日 (YYYY-MM-DD)'),
      assigned_to_id: z.union([z.number(), z.string()]).optional().describe('重新指派给用户 ID'),
      estimated_hours: z.number().optional().describe('调整预期工时'),
    },
    async ({ issue_id, done_ratio, status_id, notes, due_date, assigned_to_id, estimated_hours }) => {
      try {
        const { client, baseUrl } = getClient();
        await client.updateIssue(issue_id, {
          done_ratio,
          status_id,
          notes,
          due_date,
          assigned_to_id,
          estimated_hours,
        });

        const updates: string[] = [];
        if (done_ratio !== undefined) updates.push(`进度更新为 ${done_ratio}%`);
        if (status_id !== undefined) updates.push(`状态 ID 变更为 ${status_id}`);
        if (due_date !== undefined) updates.push(`到期日变更为 ${due_date}`);
        if (notes) updates.push(`追加备注: "${notes}"`);

        return {
          content: [
            {
              type: 'text',
              text: `✅ 任务 [#${issue_id}](${baseUrl}/issues/${issue_id}) 更新成功！\n${updates.map((u) => `• ${u}`).join('\n')}`,
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `❌ 更新任务失败：${err.message || String(err)}` }] };
      }
    }
  );
}
