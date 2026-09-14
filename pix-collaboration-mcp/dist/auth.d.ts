import { UserSession } from './types.js';
export declare class AuthManager {
    private defaultBaseUrl;
    private memorySessions;
    constructor(defaultBaseUrl?: string);
    /**
     * Resolve active session for a given sessionId (or fallback to local file / env var)
     */
    getSession(sessionId?: string): UserSession | null;
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
