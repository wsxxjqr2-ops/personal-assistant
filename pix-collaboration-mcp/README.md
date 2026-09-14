# PIX 协作平台 MCP 服务 (pix-collaboration-mcp)

基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 构建的 **PIX / RUBYLOFT 协作平台 (`rd.pixmoving.city`)** 智能助手服务。

专门面向**部门同事公用**设计：
- 🌟 **免输复杂 API Key**：直接用上班日常用的协作平台用户名和密码登录，自动换取个人 Token。
- 👥 **多用户与会话隔离**：每个人各登各的号、各查各的任务、各登各的工时，互不干扰。
- 🚀 **双模式支持**：支持本地单机运行（STDIO 模式）与 AI 服务器集中部署（SSE 远程长连接模式）。

---

## 一、提供的 MCP Tools 工具集

| 分类 | 工具名称 | 功能描述 |
| :--- | :--- | :--- |
| **账号认证** | `login` | 登录协作平台（支持账号密码，或直接输入 API Key） |
| | `whoami` | 查询当前登录人身份（姓名、用户名、ID、连通性状态） |
| | `logout` | 退出登录并清除凭据缓存 |
| **工时管理** | `log_work_time` | **登记/填报工时**（指定任务 ID、工时数值、日期、备注） |
| | `query_time_entries` | **查询工时记录**（支持按周/月/特定日期查询本人明细并自动汇总总工时） |
| **任务管理** | `query_my_issues` | **查询指派给我的任务**（按进行中/全部/已关闭、版本、分类筛选） |
| | `search_issues` | 全局搜索任务（关键字模糊匹配、按责任人、按版本过滤） |
| | `get_issue_detail` | 获取单个任务详情（完整描述、预估与已耗工时、变更历史） |
| | `create_issue` | 创建新任务（自动校验必填项：到期日、预估工时） |
| | `update_issue` | 更新任务进度百分比、状态（解决/关闭/取消）、追加进展备注 |
| **元数据查询**| `list_versions` | 查询项目的目标版本列表（迭代排期、里程碑） |
| | `list_categories` | 查询项目的模块分类（云控、前端、设计、支持等） |
| | `list_trackers_and_statuses`| 查询支持的任务类型（功能/Bug/支持）与任务状态字典 |

---

## 二、部署到 AI 服务器（集中托管供全员使用）

推荐将本服务部署在部门公用的 AI 服务器或内网服务器上，通过 **SSE (Server-Sent Events)** 提供集中服务。

### 方式 1：Docker Compose 部署（推荐）

1. 将本目录上传到 AI 服务器（如 `/opt/pix-collaboration-mcp`）；
2. 运行一键构建与启动：
   ```bash
   docker compose up -d --build
   ```
3. 检查服务健康状态：
   ```bash
   curl http://localhost:3333/health
   # 返回: {"status":"ok","service":"pix-collaboration-mcp","activeSessions":0,...}
   ```

### 方式 2：Node.js 直接运行 / PM2

```bash
# 安装依赖并编译
npm install
npm run build

# 使用 PM2 常驻后台运行
npm install -g pm2
pm2 start dist/index.js --name pix-collaboration-mcp -- --transport sse --port 3333
pm2 save
pm2 startup
```

---

## 三、部门同事客户端接入指南

服务在 AI 服务器上启动后，端口为 `3333`（端点地址：`http://<ai-server-ip>:3333/sse`）。
同事们在各自常用的 AI 工具中配置即可：

### 1. Cursor 配置
打开 Cursor 设置 -> **Features** -> **MCP Servers** -> **+ Add New MCP Server**：
- **Name**: `pix-collaboration`
- **Type**: `sse`
- **URL**: `http://<ai-server-ip>:3333/sse`

### 2. Claude Desktop 配置
编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）或 `%APPDATA%\Claude\claude_desktop_config.json`（Windows）：

```json
{
  "mcpServers": {
    "pix-collaboration": {
      "url": "http://<ai-server-ip>:3333/sse"
    }
  }
}
```

### 3. 本地单机运行（不依赖 AI 服务器）
如果不想通过服务器，也可以在个人电脑本地通过 Node.js 运行（STDIO 模式）：
```json
{
  "mcpServers": {
    "pix-collaboration": {
      "command": "node",
      "args": ["/Users/xxx/code/personal-assistant/pix-collaboration-mcp/dist/index.js"]
    }
  }
}
```

---

## 四、日常使用对话示例

配置好后，在 AI 聊天对话框中直接自然交流即可：

### 1. 首次登录
> **你**：登录协作平台，账号 dingcj 密码 xxxxxx
>
> **AI**：✅ 登录成功！已识别为【丁昌江】(ID: 51)，后续操作将自动以您的身份执行。

### 2. 查询我的任务
> **你**：查一下我当前有哪些进行中的任务？
>
> **AI**：为你查询到指派给你的 3 个任务：
> 1. [#26318: 项目协同推进](https://rd.pixmoving.city/issues/26318) - 进度 30% - 到期日 2026-09-24
> 2. [#26287: 架构底座开发](https://rd.pixmoving.city/issues/26287) - 进度 30% - 到期日 2026-09-30

### 3. 填报工时
> **你**：帮我在 #26318 任务上填报今天的工时 3 小时，备注是：完成 MCP Server 架构搭建与多租户认证模块调试。
>
> **AI**：✅ 工时登记成功！
> - 任务：#26318 项目协同推进
> - 日期：2026-09-14
> - 工时：3 小时
> - 备注：完成 MCP Server 架构搭建与多租户认证模块调试。

### 4. 统计工时
> **你**：统计一下我本周填报的所有工时明细和总和。
>
> **AI**：输出工时明细表格并自动汇总总工时。
