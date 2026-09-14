import { RedmineIssue, RedmineTimeEntry, RedmineVersion, RedmineCategory, RedmineTracker, RedmineIssueStatus, RedmineUser } from './types.js';
export interface RequestOptions {
    maxRetries?: number;
    retryDelayMs?: number;
}
export declare class RedmineClient {
    private baseUrl;
    private apiKey;
    constructor(baseUrl: string, apiKey: string);
    private request;
    queryIssues(params: {
        assigned_to_id?: string | number;
        status_id?: string | number;
        fixed_version_id?: string | number;
        category_id?: string | number;
        tracker_id?: string | number;
        subject?: string;
        due_date?: string;
        created_on?: string;
        updated_on?: string;
        sort?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        issues: RedmineIssue[];
        total_count: number;
    }>;
    getIssue(id: number): Promise<{
        issue: RedmineIssue;
    }>;
    createIssue(issue: {
        project_id: number | string;
        subject: string;
        description?: string;
        tracker_id?: number | string;
        status_id?: number | string;
        priority_id?: number | string;
        assigned_to_id?: number | string;
        fixed_version_id?: number | string;
        category_id?: number | string;
        due_date: string;
        estimated_hours: number;
        start_date?: string;
    }): Promise<{
        issue: RedmineIssue;
    }>;
    updateIssue(id: number, issue: {
        subject?: string;
        description?: string;
        status_id?: number | string;
        done_ratio?: number;
        notes?: string;
        assigned_to_id?: number | string;
        fixed_version_id?: number | string;
        category_id?: number | string;
        due_date?: string;
        estimated_hours?: number;
    }): Promise<void>;
    logTime(entry: {
        issue_id?: number;
        project_id?: number | string;
        spent_on?: string;
        hours: number;
        activity_id?: number;
        comments?: string;
        user_id?: number;
    }): Promise<{
        time_entry: RedmineTimeEntry;
    }>;
    queryTimeEntries(params: {
        user_id?: string | number;
        issue_id?: number;
        project_id?: number | string;
        spent_on?: string;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        time_entries: RedmineTimeEntry[];
        total_count: number;
    }>;
    getVersions(projectId: string | number): Promise<{
        versions: RedmineVersion[];
    }>;
    getCategories(projectId: string | number): Promise<{
        issue_categories: RedmineCategory[];
    }>;
    getTrackers(): Promise<{
        trackers: RedmineTracker[];
    }>;
    getStatuses(): Promise<{
        issue_statuses: RedmineIssueStatus[];
    }>;
    getCurrentUser(): Promise<{
        user: RedmineUser;
    }>;
}
