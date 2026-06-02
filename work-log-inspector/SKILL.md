---
name: work-log-inspector
description: "Use when the user asks to inspect, summarize, or fill work logs from code activity. Covers checking Ding Changjiang's commits in ~/code projects such as pix-microservices, ai_voice_bot_server, and rt_server; fetching remote branches; reading commit diffs to produce detailed work-log text; matching work to collaboration-platform tasks; and preparing time-entry comments."
---

# Work Log Inspector

## Purpose

Turn real code activity into defensible work-log summaries and time-entry comments.

Use commit messages only as clues. Use remote commit history and code diffs as evidence.

## Default Scope

When the user says "today", "yesterday", "前天", or similar, convert to absolute dates using the current timezone.

Default repositories:

- `/Users/dream/code/pix-microservices`
- `/Users/dream/code/ai_voice_bot_server`
- `/Users/dream/code/rt_server`

If the user names other repos, include them.

Default person filters:

- `丁昌江`
- `丁 昌江`
- common git author variants found in the repo

## Required Workflow

1. Refresh remote state first:

```bash
rtk git -C <repo> fetch --all --prune
```

2. Inspect remote branches, not only the local checked-out branch:

```bash
rtk git -C <repo> log --remotes \
  --since='<YYYY-MM-DD 00:00:00 +0800>' \
  --until='<NEXT-DAY 00:00:00 +0800>' \
  --date=iso-local \
  --pretty=format:'%h%x09%ad%x09%an%x09%cn%x09%D%x09%s'
```

3. Filter or classify commits by author/committer. If exact author filtering may miss variants, first list all same-day remote commits, then manually identify Ding Changjiang entries.

4. For each relevant commit, inspect changed files:

```bash
rtk git -C <repo> show --stat --oneline --name-only <commit>
```

5. If the commit title is vague or the work log needs detail, inspect targeted diffs for core files:

```bash
rtk git -C <repo> show --stat <commit>
rtk git -C <repo> show <commit> -- <path/to/core/file>
```

Focus on controllers, services, mappers, migrations, jobs, tests, config, docs, scripts, and protocol files.

6. Group commits into work themes before writing logs. Examples:

- API/interface development
- backend business logic
- data model and migration
- scheduled jobs
- production operations
- tests and verification
- documentation/protocol design
- bug fix and compatibility

7. If matching to collaboration-platform tasks, use `collaboration-platform-assistant` rules:

- Prefer same target version, feature name, assignee, category, and date range.
- Search by concrete terms from commits, such as `发票`, `MQTT`, `语音`, `自动播报`, `权益`, `退款`.
- Do not create or update time entries without explicit user confirmation.

## Output Style

When only summarizing whether there is work:

- Say which repos had remote commits and which did not.
- Include commit hash, time, title, and a concise work theme.

When preparing work-log comments:

- Use concrete numbered Chinese entries: `1、...；2、...；3、...。`
- 2-3 hours: use 2-3 entries.
- 4-8 hours: use 3-4 entries.
- Avoid file-list-only comments. Translate code changes into business/engineering work.

Good example:

```text
1、完善小程序开电子发票申请接口，支持数电专票字段提交；
2、补充发票类型迁移脚本并兼容历史申请数据；
3、调整发票邮件发送规则，完善定时任务和单元测试验证。
```

## Safety Checks

- Watch for duplicate time entries before adding more work logs for the same date.
- If existing time entries already exceed a normal day, report that before adding more.
- If Redmine SSL/API access fails, report the failure and use available git evidence to prepare comments, but do not claim time entries were submitted.
- If a repo has no remote commit today, say so explicitly.
