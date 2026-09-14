export interface RedmineUser {
    id: number;
    login: string;
    firstname: string;
    lastname: string;
    mail?: string;
    api_key?: string;
    admin?: boolean;
}
export interface UserSession {
    userId: number;
    username: string;
    fullName: string;
    apiKey: string;
    baseUrl: string;
    lastActive: number;
}
export interface RedmineIssue {
    id: number;
    project: {
        id: number;
        name: string;
    };
    tracker: {
        id: number;
        name: string;
    };
    status: {
        id: number;
        name: string;
        is_closed?: boolean;
    };
    priority: {
        id: number;
        name: string;
    };
    author: {
        id: number;
        name: string;
    };
    assigned_to?: {
        id: number;
        name: string;
    };
    fixed_version?: {
        id: number;
        name: string;
    };
    category?: {
        id: number;
        name: string;
    };
    subject: string;
    description?: string;
    start_date?: string;
    due_date?: string;
    done_ratio: number;
    estimated_hours?: number;
    spent_hours?: number;
    created_on: string;
    updated_on: string;
    closed_on?: string;
    custom_fields?: Array<{
        id: number;
        name: string;
        value: any;
    }>;
}
export interface RedmineTimeEntry {
    id: number;
    project: {
        id: number;
        name: string;
    };
    issue?: {
        id: number;
    };
    user: {
        id: number;
        name: string;
    };
    activity: {
        id: number;
        name: string;
    };
    hours: number;
    comments: string;
    spent_on: string;
    created_on: string;
    updated_on: string;
}
export interface RedmineVersion {
    id: number;
    project: {
        id: number;
        name: string;
    };
    name: string;
    description?: string;
    status: string;
    due_date?: string;
}
export interface RedmineCategory {
    id: number;
    project: {
        id: number;
        name: string;
    };
    name: string;
}
export interface RedmineTracker {
    id: number;
    name: string;
    default_status: {
        id: number;
        name: string;
    };
}
export interface RedmineIssueStatus {
    id: number;
    name: string;
    is_closed: boolean;
}
