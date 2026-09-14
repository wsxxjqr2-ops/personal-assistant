import { UserSession } from './types.js';
export declare class AuthManager {
    private defaultBaseUrl;
    private isServerMode;
    private memorySessions;
    constructor(defaultBaseUrl?: string, isServerMode?: boolean);
    /**
     * Resolve active session for a given sessionId.
     * In server mode (SSE), sessions are strictly isolated in memory per connection.
     * In local mode (STDIO), it can fall back to the local auth.json file.
     */
    getSession(sessionId?: string): UserSession | null;
    /**
     * Set pre-authenticated session for a connection (e.g. from apiKey query param or header)
     */
    setSession(sessionId: string, session: UserSession): void;
    /**
     * Authenticate using username and password via Basic Auth to Redmine
     */
    loginWithPassword(username: string, pass: string, sessionId?: string, baseUrl?: string): Promise<UserSession>;
    /**
     * Authenticate directly using an existing API key
     */
    loginWithApiKey(apiKey: string, sessionId?: string, baseUrl?: string): Promise<UserSession>;
    /**
     * Logout session
     */
    logout(sessionId?: string): void;
    private loadFromFile;
    private saveToFile;
}
