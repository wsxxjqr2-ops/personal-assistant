---
name: work-log-inspector
description: "Use when the user asks to inspect, summarize, or fill Chinese work logs from code activity. Covers checking Ding Changjiang's remote commits in ~/code projects such as pix-microservice(s), ai_voice_bot_server, and rt_server; grouping front-end/back-end repos by business project; reading commit diffs to produce detailed work-log text; matching work to collaboration-platform tasks; and preparing time-entry comments."
---

# Work Log Inspector

## Purpose

Turn real code activity into defensible work-log summaries and time-entry comments.

Use commit messages only as clues. Use remote commit history and code diffs as evidence.

## Default Scope

When the user says "today", "yesterday", "前天", "上周五", or similar, convert to absolute dates using the current timezone before running commands.

For `上周五`, compute the Friday before the current week. If the current day is Sunday and the user's wording naturally means the immediately preceding Friday, use that date and state the absolute date.

Default person filters:

- `丁昌江`
- `丁 昌江`
- `Ding Changjiang`
- `Changjiang Ding`
- common git author/committer variants found in the repo

Filter by committer date, because that reflects when commits landed in remote history. Author dates may be older after rebase, cherry-pick, or amend.

Fetch remotes before extracting commits, then query only remote-tracking refs (`refs/remotes/*`). Do not use local-only commits for the work log.

Include each repository's remote URL in the evidence gathered, but keep the final work log focused on project tasks unless the user asks for remote URLs.

Treat front-end and back-end repositories under the same business area as one project in the final log.

Default repositories:

- `ai_voice_bot_server`
  - `~/code/ai_voice_bot_server`
- `pix-microservice`
  - `~/code/pix-microservice`
  - `~/code/pix-microservices`
  - `~/code/pix-microservice/pix-console-verify`
  - `~/code/pix-microservices/pix-console-verify`
- `rt_server`
  - `~/code/rt_server`
  - `~/code/rt_server/rt_web`

If the user names other repos, include them.

If a configured path is not a Git repository, search up to three levels below it for `.git` directories and include those repositories under the same project.

## Required Workflow

1. Resolve the requested date to `YYYY-MM-DD`.

2. Run the bundled evidence collector from this skill directory. It fetches remotes, searches remote-tracking refs, filters by author or committer variants, and groups repos by business project:

```bash
python3 scripts/git_worklog.py --date YYYY-MM-DD --json
```

Useful options:

- `--include-empty` prints all configured projects, including projects with no matching commits.
- `--json` prints structured evidence for further editing and review.
- `--no-fetch` skips remote refresh only when the user explicitly asks to avoid network/git fetch.
- `--root PATH` can be repeated to add extra repository roots for one-off requests.
- `--person NAME` can be repeated when another author/committer variant is discovered.

3. If the script is unavailable or a manual check is needed, refresh remote state first:

```bash
git -C <repo> fetch --all --prune
```

4. Inspect remote branches, not only the local checked-out branch:

```bash
git -C <repo> log --remotes \
  --since='<YYYY-MM-DD 00:00:00 +0800>' \
  --until='<NEXT-DAY 00:00:00 +0800>' \
  --date=iso-local \
  --pretty=format:'%h%x09%ad%x09%an%x09%cn%x09%D%x09%s'
```

5. Filter or classify commits by author/committer. If exact author filtering may miss variants, first list all same-day remote commits, then manually identify Ding Changjiang entries.

6. For each relevant commit, inspect changed files:

```bash
git -C <repo> show --stat --oneline --name-only <commit>
```

7. If the commit title is vague, English-only, too generic, duplicated, or the work log needs detail, inspect targeted diffs for core files:

```bash
git -C <repo> show --stat <commit>
git -C <repo> show <commit> -- <path/to/core/file>
```

Focus on controllers, services, mappers, migrations, jobs, tests, config, docs, scripts, and protocol files.

8. Group commits into work themes before writing logs. Examples:

- API/interface development
- backend business logic
- data model and migration
- scheduled jobs
- production operations
- tests and verification
- documentation/protocol design
- bug fix and compatibility

9. Deduplicate repeated commit subjects within a project only when they are identical or clearly the same task. Translate English commit subjects into concise Chinese task descriptions instead of copying the English subject verbatim.

10. If matching to collaboration-platform tasks, use `collaboration-platform-assistant` rules:

- Prefer same target version, feature name, assignee, category, and date range.
- Search by concrete terms from commits, such as `发票`, `MQTT`, `语音`, `自动播报`, `权益`, `退款`.
- Do not create or update time entries without explicit user confirmation.

## Output Style

When only summarizing whether there is work:

- Say which projects/repos had remote commits and which did not when the user asks for a full inventory.
- Include commit hash, time, title, and a concise work theme.

When producing a daily/weekly work log, group by business project:

```text
ai_voice_bot_server
1、xxxxx
2、xxxxx

pix-microservice
1、xxxxx
2、xxxxx

rt_server
1、xxxxx
```

When a project has no commits by the target person for the date, write `无丁昌江提交记录` only if the user needs a full project inventory; otherwise omit empty projects for a concise log.

When preparing work-log comments:

- Use concrete numbered Chinese entries for every time-entry comment: `1、...；2、...；3、...。`
- The numbered format is mandatory even for short comments; do not write a single unnumbered summary sentence.
- The number of entries is not fixed. Use as many items as the actual work needs, usually 2-4, and end the final item with `。`.
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
