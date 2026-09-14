import { z } from 'zod';
import { RedmineClient } from '../redmine-client.js';
export function registerTimeEntryTools(server, authManager, getSessionId) {
    function getClient() {
        const sessionId = getSessionId ? getSessionId() : undefined;
        const session = authManager.getSession(sessionId);
        if (!session) {
            throw new Error('未检测到登录凭据。请先使用 login 工具登录（输入您的协作平台账号密码），或配置 REDMINE_API_KEY。');
        }
        return {
            client: new RedmineClient(session.baseUrl, session.apiKey),
            baseUrl: session.baseUrl,
            fullName: session.fullName,
        };
    }
    function getTodayString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    server.tool('log_work_time', '在协作平台登记/填报工时。自动关联到当前登录用户的工时记录。', {
        issue_id: z.number().describe('登记工时的任务 ID (例如 23067)'),
        hours: z.number().positive().describe('本次工时数值（小时，如 1.5, 2, 4）'),
        comments: z.string().describe('工时填报备注 / 具体工作内容说明'),
        spent_on: z
            .string()
            .optional()
            .describe('工时发生日期 (YYYY-MM-DD)，不填默认为今天'),
        activity_id: z
            .number()
            .optional()
            .describe('活动类型 ID (可选，如 9 设计/开发，平台通常有默认值)'),
    }, async ({ issue_id, hours, comments, spent_on, activity_id }) => {
        try {
            const { client, baseUrl, fullName } = getClient();
            const actualDate = spent_on || getTodayString();
            const { time_entry } = await client.logTime({
                issue_id,
                hours,
                comments,
                spent_on: actualDate,
                activity_id,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ 工时登记成功！\n• 用户：${fullName}\n• 关联任务：[#${issue_id}](${baseUrl}/issues/${issue_id})\n• 日期：${time_entry.spent_on}\n• 工时：${time_entry.hours} 小时\n• 工作备注：${time_entry.comments || '无'}\n• 记录 ID：${time_entry.id}`,
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: 'text', text: `❌ 登记工时失败：${err.message || String(err)}` }] };
        }
    });
    server.tool('query_time_entries', '查询历史工时记录。默认查询当前登录人在指定时间段或指定日期的工时填报明细，并自动汇总总工时。', {
        from: z.string().optional().describe('起始日期 (YYYY-MM-DD)，例如 "2026-05-01"'),
        to: z.string().optional().describe('截止日期 (YYYY-MM-DD)，例如 "2026-05-31"'),
        spent_on: z.string().optional().describe('特定单日 (YYYY-MM-DD)，若填写则只查这一天'),
        issue_id: z.number().optional().describe('按特定任务 ID 过滤工时记录'),
        user_id: z
            .union([z.number(), z.string()])
            .optional()
            .default('me')
            .describe('用户 ID，默认为 "me" (当前登录人)'),
        limit: z.number().optional().default(50).describe('返回最大记录数'),
    }, async ({ from, to, spent_on, issue_id, user_id, limit }) => {
        try {
            const { client, baseUrl, fullName } = getClient();
            const res = await client.queryTimeEntries({
                user_id,
                issue_id,
                spent_on,
                from,
                to,
                limit,
            });
            if (!res.time_entries || res.time_entries.length === 0) {
                const rangeDesc = spent_on || (from && to ? `${from} ~ ${to}` : from ? `>= ${from}` : '近期');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `未查找到【${fullName}】在 ${rangeDesc} 内的工时填报记录。`,
                        },
                    ],
                };
            }
            let totalHours = 0;
            const lines = [
                `### ⏱️ 工时填报明细列表 (共 ${res.time_entries.length} 条记录)：\n`,
                '| 日期 | 任务 ID | 项目 | 工时(h) | 工作备注 | 活动 |',
                '| :--- | :--- | :--- | :--- | :--- | :--- |',
            ];
            for (const item of res.time_entries) {
                totalHours += Number(item.hours) || 0;
                const issueLink = item.issue?.id ? `[#${item.issue.id}](${baseUrl}/issues/${item.issue.id})` : '-';
                const proj = item.project?.name || '-';
                const h = item.hours;
                const comm = (item.comments || '').replace(/\|/g, '\\|');
                const act = item.activity?.name || '-';
                lines.push(`| ${item.spent_on} | ${issueLink} | ${proj} | **${h}** | ${comm} | ${act} |`);
            }
            lines.push(`\n**📊 总计工时**：\`${totalHours.toFixed(1)}\` 小时`);
            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }
        catch (err) {
            return { content: [{ type: 'text', text: `❌ 查询工时记录失败：${err.message || String(err)}` }] };
        }
    });
}
//# sourceMappingURL=time_entries.js.map