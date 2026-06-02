# PIX/RUBYLOFT Redmine API Notes

## Base

- Base URL: `https://rd.pixmoving.city`
- Auth header: `X-Redmine-API-Key: $REDMINE_API_KEY`
- Do not put API keys in chat, command output, committed files, or URLs.

## Proven Endpoints

Single issue:

```bash
curl -s -H "X-Redmine-API-Key: $REDMINE_API_KEY" \
  "https://rd.pixmoving.city/issues/23067.json"
```

Assigned issues:

```bash
curl -s -H "X-Redmine-API-Key: $REDMINE_API_KEY" \
  "https://rd.pixmoving.city/issues.json?assigned_to_id=me&status_id=*&limit=100"
```

Create issue:

```bash
curl -s -X POST -H "X-Redmine-API-Key: $REDMINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"issue":{"project_id":16,"tracker_id":2,"subject":"Task title"}}' \
  "https://rd.pixmoving.city/issues.json"
```

Update issue:

```bash
curl -s -X PUT -H "X-Redmine-API-Key: $REDMINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"issue":{"status_id":2,"done_ratio":50,"notes":"Progress note"}}' \
  "https://rd.pixmoving.city/issues/23067.json"
```

Log time:

```bash
curl -s -X POST -H "X-Redmine-API-Key: $REDMINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"time_entry":{"issue_id":23067,"hours":1.5,"spent_on":"2026-05-26","comments":"Work note"}}' \
  "https://rd.pixmoving.city/time_entries.json"
```

Useful parameters:

- `assigned_to_id=me`
- `status_id=*` for all statuses
- `status_id=open` for open issues
- `limit=100`
- `offset=100` for pagination
- `project_id=<id>` when known
- `fixed_version_id=<id>` when known
- `category_id=<id>` when known
- `tracker_id=<id>` when known
- `created_on=>=YYYY-MM-DD`, `updated_on=>=YYYY-MM-DD`, `start_date=>=YYYY-MM-DD`, `due_date=>=YYYY-MM-DD`
- `due_date=><YYYY-MM-DD|YYYY-MM-DD` for a range
- `subject=~keyword` for contains matching
- `sort=due_date:asc,updated_on:desc`

Reference endpoints:

- `GET /projects.json`
- `GET /trackers.json`
- `GET /issue_statuses.json`
- `GET /issue_priorities.json`
- `GET /users.json?name=<name>`
- `GET /projects/<project_id>/versions.json`
- `GET /projects/<project_id>/issue_categories.json`
- `GET /time_entries.json?issue_id=<issue_id>`

## Bundled CLI

Prefer `scripts/redmine_issues.py` over hand-written curl because it keeps the API key out of command output, resolves common names to ids, and dry-runs writes by default.

Network fallback:

- `rd.pixmoving.city` can intermittently close Python `urllib` TLS handshakes with `SSL: UNEXPECTED_EOF_WHILE_READING`.
- The bundled script falls back to `curl --retry 3` for network/SSL errors.
- If doing a manual read, use curl directly rather than browser scraping:

```bash
curl -sS --retry 3 --retry-delay 1 \
  -H "X-Redmine-API-Key: $REDMINE_API_KEY" \
  "https://rd.pixmoving.city/issues.json?fixed_version_id=815&status_id=*&limit=100"
```

Examples:

```bash
python3 scripts/redmine_issues.py query --status open --due-from 2026-05-01 --due-to 2026-05-31
python3 scripts/redmine_issues.py query --fixed-version "RoboShop机器人卖东西扫码收款系统" --category "Robobus小程序奇遇环线" --status '*'
python3 scripts/redmine_issues.py issue 24651
python3 scripts/redmine_issues.py refs statuses
python3 scripts/redmine_issues.py refs versions --project PIX
python3 scripts/redmine_issues.py create --tracker 支持 --subject "Task title" --fixed-version "Target version" --category "Category"
python3 scripts/redmine_issues.py update 24651 --done-ratio 100 --notes "Progress note"
python3 scripts/redmine_issues.py time --issue 24651 --hours 1.5 --spent-on 2026-05-26 --comments "Work note"
```

Add `--confirm` to create/update/time only after the user approves the exact dry-run payload.

Issue creation requirements observed on RUBYLOFT:

- `due_date` / 计划完成日期 is required.
- `estimated_hours` / 预期时间 is required.
- If the user has not provided either value, ask before creating the issue.

## Important Fields

- `project.name`: broad project space, usually `PIX`.
- `tracker.name`: task type.
- `status.name` and `status.is_closed`: current state.
- `assigned_to.name`: owner.
- `category.name`: work module/stage.
- `fixed_version.name`: concrete project or delivery milestone.
- `subject`: task title.
- `description`: detailed description.
- `start_date`, `due_date`, `done_ratio`.
- `estimated_hours`, `spent_hours`.
- `custom_fields`: includes fields such as 项目阶段, 任务级别, 序号, 测试是否通过, 测试完成时间.

## Safety For Writes

Use `POST /issues.json`, `PUT /issues/<id>.json`, and `POST /time_entries.json` only after explicit user confirmation. A typical update body:

```json
{
  "issue": {
    "status_id": 2,
    "done_ratio": 50,
    "notes": "Progress note here"
  }
}
```

Do not guess enum ids for statuses, trackers, categories, versions, or custom field values. Read the current issue first, then inspect allowed values from the UI or API if needed.
