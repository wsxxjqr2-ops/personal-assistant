import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuthManager } from '../auth.js';
export declare function registerIssueTools(server: McpServer, authManager: AuthManager, getSessionId?: () => string | undefined): void;
