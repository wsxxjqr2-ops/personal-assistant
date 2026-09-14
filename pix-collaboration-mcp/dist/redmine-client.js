export class RedmineClient {
    baseUrl;
    apiKey;
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.apiKey = apiKey;
    }
    async request(path, options = {}, retryOpts = {}) {
        const maxRetries = retryOpts.maxRetries ?? 3;
        const retryDelayMs = retryOpts.retryDelayMs ?? 1000;
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const headers = {
            'X-Redmine-API-Key': this.apiKey,
            Accept: 'application/json',
            ...options.headers,
        };
        if (options.body && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        let lastError;
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
                    return {};
                }
                const data = await res.json();
                return data;
            }
            catch (err) {
                lastError = err;
                const msg = String(err?.message || err);
                const isNetworkErr = msg.includes('ECONNRESET') ||
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
    async queryIssues(params) {
        const query = new URLSearchParams();
        if (params.assigned_to_id !== undefined)
            query.set('assigned_to_id', String(params.assigned_to_id));
        if (params.status_id !== undefined)
            query.set('status_id', String(params.status_id));
        if (params.fixed_version_id !== undefined)
            query.set('fixed_version_id', String(params.fixed_version_id));
        if (params.category_id !== undefined)
            query.set('category_id', String(params.category_id));
        if (params.tracker_id !== undefined)
            query.set('tracker_id', String(params.tracker_id));
        if (params.subject)
            query.set('subject', `~${params.subject}`);
        if (params.due_date)
            query.set('due_date', params.due_date);
        if (params.created_on)
            query.set('created_on', params.created_on);
        if (params.updated_on)
            query.set('updated_on', params.updated_on);
        if (params.sort)
            query.set('sort', params.sort);
        query.set('limit', String(params.limit || 50));
        if (params.offset)
            query.set('offset', String(params.offset));
        return this.request(`/issues.json?${query.toString()}`);
    }
    async getIssue(id) {
        return this.request(`/issues/${id}.json?include=children,relations,journals`);
    }
    async createIssue(issue) {
        return this.request('/issues.json', {
            method: 'POST',
            body: JSON.stringify({ issue }),
        });
    }
    async updateIssue(id, issue) {
        await this.request(`/issues/${id}.json`, {
            method: 'PUT',
            body: JSON.stringify({ issue }),
        });
    }
    // --- Time Entries ---
    async logTime(entry) {
        return this.request('/time_entries.json', {
            method: 'POST',
            body: JSON.stringify({ time_entry: entry }),
        });
    }
    async queryTimeEntries(params) {
        const query = new URLSearchParams();
        if (params.user_id !== undefined)
            query.set('user_id', String(params.user_id));
        if (params.issue_id !== undefined)
            query.set('issue_id', String(params.issue_id));
        if (params.project_id !== undefined)
            query.set('project_id', String(params.project_id));
        if (params.spent_on)
            query.set('spent_on', params.spent_on);
        if (params.from && params.to) {
            query.set('spent_on', `><${params.from}|${params.to}`);
        }
        else if (params.from) {
            query.set('spent_on', `>=${params.from}`);
        }
        else if (params.to) {
            query.set('spent_on', `<=${params.to}`);
        }
        query.set('limit', String(params.limit || 50));
        if (params.offset)
            query.set('offset', String(params.offset));
        return this.request(`/time_entries.json?${query.toString()}`);
    }
    // --- Metadata ---
    async getVersions(projectId) {
        return this.request(`/projects/${projectId}/versions.json`);
    }
    async getCategories(projectId) {
        return this.request(`/projects/${projectId}/issue_categories.json`);
    }
    async getTrackers() {
        return this.request('/trackers.json');
    }
    async getStatuses() {
        return this.request('/issue_statuses.json');
    }
    async getCurrentUser() {
        return this.request('/users/current.json');
    }
}
//# sourceMappingURL=redmine-client.js.map