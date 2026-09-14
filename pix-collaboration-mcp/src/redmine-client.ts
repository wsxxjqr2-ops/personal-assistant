import {
  RedmineIssue,
  RedmineTimeEntry,
  RedmineVersion,
  RedmineCategory,
  RedmineTracker,
  RedmineIssueStatus,
  RedmineUser,
} from './types.js';

export interface RequestOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export class RedmineClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retryOpts: RequestOptions = {}
  ): Promise<T> {
    const maxRetries = retryOpts.maxRetries ?? 3;
    const retryDelayMs = retryOpts.retryDelayMs ?? 1000;
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const headers: Record<string, string> = {
      'X-Redmine-API-Key': this.apiKey,
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          headers,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Redmine API error (${res.status} ${res.statusText}): ${text}`);
        }

        // Handle empty body (e.g. 204 or empty PUT)
        if (res.status === 204 || res.headers.get('content-length') === '0') {
          return {} as T;
        }

        const data = await res.json();
        return data as T;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const isNetworkErr =
          msg.includes('ECONNRESET') ||
          msg.includes('UNEXPECTED_EOF') ||
          msg.includes('fetch failed') ||
          msg.includes('ETIMEDOUT') ||
          msg.includes('socket hang up');

        if (attempt < maxRetries && isNetworkErr) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
          continue;
        }
        break;
      }
    }

    throw lastError;
  }

  // --- Issues ---

  public async queryIssues(params: {
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
  }): Promise<{ issues: RedmineIssue[]; total_count: number }> {
    const query = new URLSearchParams();
    if (params.assigned_to_id !== undefined) query.set('assigned_to_id', String(params.assigned_to_id));
    if (params.status_id !== undefined) query.set('status_id', String(params.status_id));
    if (params.fixed_version_id !== undefined) query.set('fixed_version_id', String(params.fixed_version_id));
    if (params.category_id !== undefined) query.set('category_id', String(params.category_id));
    if (params.tracker_id !== undefined) query.set('tracker_id', String(params.tracker_id));
    if (params.subject) query.set('subject', `~${params.subject}`);
    if (params.due_date) query.set('due_date', params.due_date);
    if (params.created_on) query.set('created_on', params.created_on);
    if (params.updated_on) query.set('updated_on', params.updated_on);
    if (params.sort) query.set('sort', params.sort);
    query.set('limit', String(params.limit || 50));
    if (params.offset) query.set('offset', String(params.offset));

    return this.request<{ issues: RedmineIssue[]; total_count: number }>(`/issues.json?${query.toString()}`);
  }

  public async getIssue(id: number): Promise<{ issue: RedmineIssue }> {
    return this.request<{ issue: RedmineIssue }>(`/issues/${id}.json?include=children,relations,journals`);
  }

  public async createIssue(issue: {
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
  }): Promise<{ issue: RedmineIssue }> {
    return this.request<{ issue: RedmineIssue }>('/issues.json', {
      method: 'POST',
      body: JSON.stringify({ issue }),
    });
  }

  public async updateIssue(
    id: number,
    issue: {
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
    }
  ): Promise<void> {
    await this.request<void>(`/issues/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify({ issue }),
    });
  }

  // --- Time Entries ---

  public async logTime(entry: {
    issue_id?: number;
    project_id?: number | string;
    spent_on?: string;
    hours: number;
    activity_id?: number;
    comments?: string;
    user_id?: number;
  }): Promise<{ time_entry: RedmineTimeEntry }> {
    return this.request<{ time_entry: RedmineTimeEntry }>('/time_entries.json', {
      method: 'POST',
      body: JSON.stringify({ time_entry: entry }),
    });
  }

  public async queryTimeEntries(params: {
    user_id?: string | number;
    issue_id?: number;
    project_id?: number | string;
    spent_on?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ time_entries: RedmineTimeEntry[]; total_count: number }> {
    const query = new URLSearchParams();
    if (params.user_id !== undefined) query.set('user_id', String(params.user_id));
    if (params.issue_id !== undefined) query.set('issue_id', String(params.issue_id));
    if (params.project_id !== undefined) query.set('project_id', String(params.project_id));
    if (params.spent_on) query.set('spent_on', params.spent_on);
    if (params.from && params.to) {
      query.set('spent_on', `><${params.from}|${params.to}`);
    } else if (params.from) {
      query.set('spent_on', `>=${params.from}`);
    } else if (params.to) {
      query.set('spent_on', `<=${params.to}`);
    }
    query.set('limit', String(params.limit || 50));
    if (params.offset) query.set('offset', String(params.offset));

    return this.request<{ time_entries: RedmineTimeEntry[]; total_count: number }>(
      `/time_entries.json?${query.toString()}`
    );
  }

  // --- Metadata ---

  public async getVersions(projectId: string | number): Promise<{ versions: RedmineVersion[] }> {
    return this.request<{ versions: RedmineVersion[] }>(`/projects/${projectId}/versions.json`);
  }

  public async getCategories(projectId: string | number): Promise<{ issue_categories: RedmineCategory[] }> {
    return this.request<{ issue_categories: RedmineCategory[] }>(`/projects/${projectId}/issue_categories.json`);
  }

  public async getTrackers(): Promise<{ trackers: RedmineTracker[] }> {
    return this.request<{ trackers: RedmineTracker[] }>('/trackers.json');
  }

  public async getStatuses(): Promise<{ issue_statuses: RedmineIssueStatus[] }> {
    return this.request<{ issue_statuses: RedmineIssueStatus[] }>('/issue_statuses.json');
  }

  public async getCurrentUser(): Promise<{ user: RedmineUser }> {
    return this.request<{ user: RedmineUser }>('/users/current.json');
  }
}
