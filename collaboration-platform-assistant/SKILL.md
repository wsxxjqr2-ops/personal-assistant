---
name: collaboration-platform-assistant
description: "Use for Ding Changjiang's PIX/RUBYLOFT collaboration platform work: reading and writing Redmine-style issues, explaining task fields, summarizing assigned work, finding projects/target versions/categories, multi-condition queries, generating status reports, creating tasks, updating tasks, and logging time entries. Use when the user asks about 协作平台, rd.pixmoving.city, RUBYLOFT, Redmine issues, 我的任务, 项目/目标版本, 类别, 工时, 周报, 绩效目标, OGSMA, or wants to query/create/update collaboration-platform tasks."
---

# Collaboration Platform Assistant

## Operating Rules

- Treat `https://rd.pixmoving.city` as the PIX/RUBYLOFT Redmine-style collaboration platform.
- Use `web-access` for browser-authenticated reads when no API key is configured or when page-only UI data is needed.
- Prefer REST API operations when `REDMINE_API_KEY` is available.
- The bundled REST script has a curl fallback for intermittent Python `urllib` SSL errors such as `UNEXPECTED_EOF_WHILE_READING`. If this error appears, do not switch to browser scraping or keep retrying urllib manually; rerun the bundled script or use an equivalent `curl -H "X-Redmine-API-Key: $REDMINE_API_KEY"` REST call.
- Never reveal, print, log, or paste the API key. Ask the user to put it in `REDMINE_API_KEY` instead.
- Default to read-only analysis. For writes, create a proposed change summary first and ask for explicit confirmation before calling any modifying endpoint. The bundled script also defaults writes to dry-run unless `--confirm` is passed.
- When creating issues, always provide `计划完成日期` / `due_date` and `预期时间` / `estimated_hours`; the platform rejects empty values. If either value is uncertain, ask the user before creating the task.
- Avoid destructive actions such as deleting issues, resetting keys, changing account settings, or bulk updates unless the user explicitly asks and confirms.

## Common Mental Model

- `项目` is the broad platform project space, usually `PIX`.
- `目标版本` / `fixed_version` is the concrete project, delivery package, or milestone.
- `类别` / `category` is the work module or stage inside a target version, such as cloud, frontend, design, testing, or support.
- For meeting, communication, sync, alignment, or demand-alignment tasks, prefer category `工作协作` even when the target version belongs to a specific product project.
- `跟踪` / `tracker` is the task type, such as 功能, 支持, 设计, Bug, or 绩效目标.
- `项目阶段` is a custom field that often captures lifecycle stage, such as 方案设计, 产品开发, 综合测试.

## Known Field IDs

- Issue status `取消` has id `5`; use `status_id: 5` when canceling an issue through the API.
- Issue progress uses `done_ratio` as an integer percentage, such as `10`, `90`, or `100`.

## API Quick Start

Read `references/api.md` before doing API work beyond simple issue lookup.

Use the bundled script for common reads:

```bash
python3 scripts/redmine_issues.py --mine --status '*' --limit 25
python3 scripts/redmine_issues.py --issue 23067
python3 scripts/redmine_issues.py query --status open --due-from 2026-05-01 --due-to 2026-05-31
python3 scripts/redmine_issues.py query --fixed-version "RoboShop机器人卖东西扫码收款系统" --category "Robobus小程序奇遇环线" --status '*'
```

The script requires:

```bash
export REDMINE_API_KEY="..."
```

Use the bundled script for safe write preparation:

```bash
python3 scripts/redmine_issues.py create --tracker 支持 --subject "任务标题" --fixed-version "目标版本" --category "类别"
python3 scripts/redmine_issues.py update 24651 --status 关闭 --done-ratio 100 --notes "处理说明"
python3 scripts/redmine_issues.py time --issue 24651 --hours 1.5 --spent-on 2026-05-26 --comments "联调测试"
```

These commands print a dry-run payload by default. Add `--confirm` only after the user explicitly approves the exact change.

Useful reference lookups:

```bash
python3 scripts/redmine_issues.py refs statuses
python3 scripts/redmine_issues.py refs trackers
python3 scripts/redmine_issues.py refs versions --project PIX
python3 scripts/redmine_issues.py refs categories --project PIX
```

## Analysis Workflow

1. Define the user's intent: explain fields, summarize work, inspect a project, generate a report, or prepare an update.
2. Choose source:
   - Use API when `REDMINE_API_KEY` exists and the task is data-oriented.
   - Use `web-access` when relying on browser login, saved custom queries, or UI-only context.
3. Collect only the needed data. For "my work", start with assigned issues across all statuses or open statuses depending on the user's wording.
   - For project/OGSM evidence, do not default to only Ding's assigned issues. Query the whole target version/category unless the user explicitly asks for "my tasks".
4. When matching work to issues for time logging, search across all statuses (`status_id=*`) and match by semantic fit first.
   - Do not exclude closed issues. Closed tasks can be reused for time entries when the work clearly belongs to that task.
   - Only create a new task when no existing issue, including closed issues, matches the work well.
5. Group by `fixed_version` first, then `category` or `项目阶段` when useful.
6. Separate active work from closed/canceled work in reports, but do not treat closed status as a blocker for time-entry matching.
7. In reports, highlight overdue/open items, upcoming due dates, and projects with many active tasks.

## Writing Updates

For task creation, task updates, and time logging, first present:

- issue id and title
- exact fields to change
- for new tasks: project, tracker, subject, target version, category, assignee, dates, estimate, custom fields
- for time entries: issue id, date, hours, activity if used, comment
- note/comment to add
- before/after values when known

Time-entry comment format:

- Always write Chinese numbered comments in this style: `1、...；2、...；3、...。`
- Do not use a single unnumbered summary sentence for time entries.
- The number of items is flexible and should match the actual work, typically 2-4 items.
- End intermediate items with `；` and the final item with `。`.
- If source evidence or commit subjects are in English, translate them into natural Chinese before writing the comment.
- Do not paste raw English commit subjects into time-entry comments unless the English text is a product name, API name, file name, protocol, or other proper noun.

Time-entry issue state requirements:

- Always inspect the issue status and done ratio before logging time.
- If the issue status is `新建`, update it to `进行中` before or together with logging time.
- If the issue done ratio is below `10%`, update it to at least `10%` before or together with logging time.
- Do not log time against a `新建` issue or a `0%` issue without first applying these updates.
- When the user asks to cancel an issue, set status to `取消` using `status_id: 5` and add a short note explaining the cancellation reason when known.

Only after the user confirms, call the API with `--confirm`. Prefer a single issue/time-entry update at a time unless the user requests bulk changes.
