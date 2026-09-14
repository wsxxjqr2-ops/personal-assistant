import { z } from 'zod';
import { RedmineClient } from '../redmine-client.js';
export function registerMetadataTools(server, authManager, getSessionId) {
    function getClient() {
        const sessionId = getSessionId ? getSessionId() : undefined;
        const session = authManager.getSession(sessionId);
        if (!session) {
            throw new Error('未检测到登录凭据。请先使用 login 工具登录（输入您的协作平台账号密码），或配置 REDMINE_API_KEY。');
        }
        return {
            client: new RedmineClient(session.baseUrl, session.apiKey),
        };
    }
    server.tool('list_versions', '查询项目的目标版本 (fixed_version / 迭代排期 / 里程碑列表)。创建或筛选任务时非常有用。', {
        project_id: z
            .union([z.number(), z.string()])
            .optional()
            .default(16)
            .describe('项目 ID 或标识符，默认为 16 (PIX 项目)'),
    }, async ({ project_id }) => {
        try {
            const { client } = getClient();
            const { versions } = await client.getVersions(project_id);
            if (!versions || versions.length === 0) {
                return { content: [{ type: 'text', text: `项目 ID ${project_id} 暂无目标版本。` }] };
            }
            const lines = [
                `### 🎯 目标版本列表 (项目 ${project_id}，共 ${versions.length} 个)：\n`,
                '| ID | 版本/里程碑名称 | 状态 | 到期日 |',
                '| :--- | :--- | :--- | :--- |',
            ];
            for (const v of versions) {
                lines.push(`| ${v.id} | ${v.name} | ${v.status} | ${v.due_date || '-'} |`);
            }
            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }
        catch (err) {
            return { content: [{ type: 'text', text: `❌ 获取版本列表失败：${err.message || String(err)}` }] };
        }
    });
    server.tool('list_categories', '查询项目的模块分类列表 (issue categories，如云控、前端、设计、支持等)。创建任务时选择合适类别。', {
        project_id: z
            .union([z.number(), z.string()])
            .optional()
            .default(16)
            .describe('项目 ID 或标识符，默认为 16 (PIX 项目)'),
    }, async ({ project_id }) => {
        try {
            const { client } = getClient();
            const { issue_categories } = await client.getCategories(project_id);
            if (!issue_categories || issue_categories.length === 0) {
                return { content: [{ type: 'text', text: `项目 ID ${project_id} 暂无模块分类。` }] };
            }
            const lines = [
                `### 📁 模块分类列表 (项目 ${project_id}，共 ${issue_categories.length} 个)：\n`,
                '| ID | 分类名称 |',
                '| :--- | :--- |',
            ];
            for (const c of issue_categories) {
                lines.push(`| ${c.id} | ${c.name} |`);
            }
            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }
        catch (err) {
            return { content: [{ type: 'text', text: `❌ 获取分类列表失败：${err.message || String(err)}` }] };
        }
    });
    server.tool('list_trackers_and_statuses', '查询协作平台支持的跟踪类型 (Trackers，如功能、支持、缺陷) 和任务状态列表 (Statuses，如进行中、已解决)。', {}, async () => {
        try {
            const { client } = getClient();
            const [{ trackers }, { issue_statuses }] = await Promise.all([
                client.getTrackers(),
                client.getStatuses(),
            ]);
            const trackerLines = [
                '### 🏷️ 跟踪类型 (Trackers)：\n',
                '| ID | 类型名称 | 默认状态 |',
                '| :--- | :--- | :--- |',
                ...trackers.map((t) => `| ${t.id} | ${t.name} | ${t.default_status?.name || '-'} |`),
            ];
            const statusLines = [
                '\n### 📊 任务状态 (Statuses)：\n',
                '| ID | 状态名称 | 是否属于关闭状态 |',
                '| :--- | :--- | :--- |',
                ...issue_statuses.map((s) => `| ${s.id} | ${s.name} | ${s.is_closed ? '是 (Closed)' : '否 (Open)'} |`),
            ];
            return {
                content: [
                    {
                        type: 'text',
                        text: `${trackerLines.join('\n')}\n${statusLines.join('\n')}`,
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: 'text', text: `❌ 获取元数据失败：${err.message || String(err)}` }] };
        }
    });
}
//# sourceMappingURL=metadata.js.map