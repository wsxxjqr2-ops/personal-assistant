#!/usr/bin/env python3
"""Redmine/RUBYLOFT REST CLI for Ding's collaboration platform work."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


BASE_URL = os.environ.get("REDMINE_BASE_URL", "https://rd.pixmoving.city").rstrip("/")
PAGE_LIMIT = 100


def api_key() -> str:
    key = os.environ.get("REDMINE_API_KEY")
    if not key:
        raise SystemExit("REDMINE_API_KEY is not set")
    return key


def request_json(
    method: str,
    path: str,
    params: dict[str, Any] | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    url = f"{BASE_URL}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(clean_params(params), doseq=True)

    data = None
    headers = {
        "X-Redmine-API-Key": api_key(),
        "Accept": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Redmine API {method} {path} failed: HTTP {exc.code}\n{body}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return request_json_with_curl(method, url, payload, exc)


def request_json_with_curl(
    method: str,
    url: str,
    payload: dict[str, Any] | None,
    original_error: BaseException,
) -> dict[str, Any]:
    cmd = [
        "curl",
        "-sS",
        "--fail-with-body",
        "--retry",
        "3",
        "--retry-delay",
        "1",
        "-X",
        method,
        "-H",
        f"X-Redmine-API-Key: {api_key()}",
        "-H",
        "Accept: application/json",
    ]
    if payload is not None:
        cmd.extend(
            [
                "-H",
                "Content-Type: application/json",
                "--data-binary",
                json.dumps(payload, ensure_ascii=False),
            ]
        )
    cmd.append(url)
    try:
        result = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=45)
    except (subprocess.SubprocessError, OSError) as exc:
        raise SystemExit(
            f"Redmine API {method} failed with urllib and curl fallback failed.\n"
            f"urllib: {original_error}\ncurl: {exc}"
        ) from exc
    if result.returncode != 0:
        raise SystemExit(
            f"Redmine API {method} failed with urllib and curl fallback failed.\n"
            f"urllib: {original_error}\ncurl exit {result.returncode}: {result.stderr}{result.stdout}"
        )
    body = result.stdout.strip()
    return json.loads(body) if body else {}


def get_json(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    return request_json("GET", path, params=params)


def post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    return request_json("POST", path, payload=payload)


def put_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    return request_json("PUT", path, payload=payload)


def clean_params(params: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in params.items() if value not in (None, "", [])}


def compact_issue(issue: dict[str, Any]) -> dict[str, Any]:
    custom = {
        field.get("name"): field.get("value")
        for field in issue.get("custom_fields", [])
        if field.get("name")
    }
    return {
        "id": issue.get("id"),
        "subject": issue.get("subject"),
        "status": issue.get("status", {}).get("name"),
        "tracker": issue.get("tracker", {}).get("name"),
        "priority": issue.get("priority", {}).get("name"),
        "assignee": issue.get("assigned_to", {}).get("name"),
        "category": issue.get("category", {}).get("name"),
        "fixed_version": issue.get("fixed_version", {}).get("name"),
        "parent_id": issue.get("parent", {}).get("id"),
        "start_date": issue.get("start_date"),
        "due_date": issue.get("due_date"),
        "done_ratio": issue.get("done_ratio"),
        "estimated_hours": issue.get("estimated_hours"),
        "spent_hours": issue.get("spent_hours"),
        "project_stage": custom.get("项目阶段"),
        "task_level": custom.get("任务级别"),
        "sequence": custom.get("序号"),
        "review_status": custom.get("评审情况"),
        "tags": custom.get("标签"),
        "test_passed": custom.get("测试是否通过"),
        "test_done_at": custom.get("测试完成时间"),
        "created_on": issue.get("created_on"),
        "updated_on": issue.get("updated_on"),
        "closed_on": issue.get("closed_on"),
    }


def print_json(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def parse_id_or_name(value: str | None) -> int | str | None:
    if value is None or value == "":
        return None
    return int(value) if value.isdigit() else value


def first_named(items: list[dict[str, Any]], name: str) -> dict[str, Any]:
    unique: dict[str, dict[str, Any]] = {}
    for item in items:
        key = str(item.get("id", item.get("name")))
        unique[key] = item
    items = list(unique.values())
    exact = [item for item in items if item.get("name") == name]
    if len(exact) == 1:
        return exact[0]
    contains = [item for item in items if name.lower() in str(item.get("name", "")).lower()]
    if len(contains) == 1:
        return contains[0]
    matches = exact or contains
    if matches:
        raise SystemExit(
            f"Multiple matches for {name!r}: "
            + ", ".join(f"{item.get('id')}:{item.get('name')}" for item in matches[:20])
        )
    raise SystemExit(f"No match for {name!r}")


def all_pages(path: str, collection_key: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    params = dict(params or {})
    params.setdefault("limit", PAGE_LIMIT)
    params.setdefault("offset", 0)
    items: list[dict[str, Any]] = []
    while True:
        data = get_json(path, params)
        batch = data.get(collection_key, [])
        items.extend(batch)
        total = data.get("total_count", len(items))
        offset = int(data.get("offset", params["offset"]))
        limit = int(data.get("limit", params["limit"]))
        if offset + limit >= total or not batch:
            return items
        params["offset"] = offset + limit


def resolve_project(value: int | str | None) -> int | None:
    if value is None:
        value = "PIX"
    if isinstance(value, int):
        return value
    projects = all_pages("/projects.json", "projects")
    return int(first_named(projects, value)["id"])


def resolve_from_enumeration(collection: str, value: int | str | None) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    items = get_json(f"/{collection}.json").get(collection, [])
    return int(first_named(items, value)["id"])


def resolve_tracker(value: int | str | None) -> int | None:
    return resolve_from_enumeration("trackers", value)


def resolve_priority(value: int | str | None) -> int | None:
    return resolve_from_enumeration("issue_priorities", value)


def resolve_status(value: int | str | None) -> int | str | None:
    if value is None:
        return None
    if isinstance(value, int) or value in {"open", "*"}:
        return value
    statuses = get_json("/issue_statuses.json").get("issue_statuses", [])
    return int(first_named(statuses, value)["id"])


def resolve_user(value: int | str | None) -> int | str | None:
    if value is None:
        return None
    if isinstance(value, int) or value == "me":
        return value
    users = all_pages("/users.json", "users", {"name": value})
    if not users:
        users = all_pages("/users.json", "users")
    return int(first_named(users, value)["id"])


def resolve_version(project_id: int | None, value: int | str | None) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if project_id is None:
        project_id = resolve_project(None)
    versions = all_pages(f"/projects/{project_id}/versions.json", "versions")
    return int(first_named(versions, value)["id"])


def resolve_category(project_id: int | None, value: int | str | None) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if project_id is None:
        raise SystemExit("--category-name requires --project or --project-id when creating/updating")
    categories = get_json(f"/projects/{project_id}/issue_categories.json").get("issue_categories", [])
    return int(first_named(categories, value)["id"])


def custom_field_ids(issue: dict[str, Any] | None = None) -> dict[str, int]:
    if issue:
        return {
            str(field.get("name")): int(field["id"])
            for field in issue.get("custom_fields", [])
            if field.get("name") and field.get("id") is not None
        }
    return {
        "项目阶段": 24,
        "任务级别": 22,
        "测试完成时间": 11,
        "新计划完成日期": 30,
        "序号": 26,
        "评审情况": 79,
        "标签": 38,
        "测试是否通过": 28,
    }


def make_custom_fields(values: dict[str, Any], ids: dict[str, int]) -> list[dict[str, Any]]:
    fields = []
    for name, value in values.items():
        if value is not None:
            if name not in ids:
                raise SystemExit(f"Unknown custom field {name!r}; inspect an issue first")
            fields.append({"id": ids[name], "value": value})
    return fields


def issue_query_params(args: argparse.Namespace) -> dict[str, Any]:
    project_id = resolve_project(parse_id_or_name(args.project or args.project_id))
    return clean_params(
        {
            "project_id": project_id,
            "assigned_to_id": resolve_user(parse_id_or_name(args.assigned_to)),
            "author_id": resolve_user(parse_id_or_name(args.author)),
            "status_id": resolve_status(parse_id_or_name(args.status)),
            "tracker_id": resolve_tracker(parse_id_or_name(args.tracker)),
            "priority_id": resolve_priority(parse_id_or_name(args.priority)),
            "fixed_version_id": resolve_version(project_id, parse_id_or_name(args.fixed_version)),
            "category_id": resolve_category(project_id, parse_id_or_name(args.category)),
            "subject": f"~{args.subject_contains}" if args.subject_contains else None,
            "created_on": date_filter(args.created_from, args.created_to),
            "updated_on": date_filter(args.updated_from, args.updated_to),
            "start_date": date_filter(args.start_from, args.start_to),
            "due_date": date_filter(args.due_from, args.due_to),
            "sort": args.sort,
            "limit": args.limit,
            "offset": args.offset,
            "include": args.include,
        }
    )


def date_filter(date_from: str | None, date_to: str | None) -> str | None:
    if date_from and date_to:
        return f"><{date_from}|{date_to}"
    if date_from:
        return f">={date_from}"
    if date_to:
        return f"<={date_to}"
    return None


def list_issues(args: argparse.Namespace) -> dict[str, Any]:
    data = get_json("/issues.json", issue_query_params(args))
    if args.raw:
        return data
    return {
        "total_count": data.get("total_count"),
        "limit": data.get("limit"),
        "offset": data.get("offset"),
        "issues": [compact_issue(issue) for issue in data.get("issues", [])],
    }


def get_issue(args: argparse.Namespace) -> dict[str, Any]:
    params = {"include": args.include} if args.include else None
    data = get_json(f"/issues/{args.issue}.json", params)
    return data if args.raw else compact_issue(data["issue"])


def issue_payload_from_args(
    args: argparse.Namespace,
    existing_issue: dict[str, Any] | None = None,
    *,
    default_project: bool = True,
) -> dict[str, Any]:
    project_value = parse_id_or_name(args.project or args.project_id)
    project_id = resolve_project(project_value) if default_project or project_value is not None else None
    lookup_project_id = project_id or (existing_issue or {}).get("project", {}).get("id")
    custom_values = {
        "项目阶段": args.project_stage,
        "任务级别": args.task_level,
        "序号": args.sequence,
        "评审情况": args.review_status,
        "标签": args.tags,
        "测试是否通过": args.test_passed,
        "测试完成时间": args.test_done_at,
    }
    issue = clean_params(
        {
            "project_id": project_id,
            "tracker_id": resolve_tracker(parse_id_or_name(args.tracker)),
            "status_id": resolve_status(parse_id_or_name(args.status)),
            "priority_id": resolve_priority(parse_id_or_name(args.priority)),
            "assigned_to_id": resolve_user(parse_id_or_name(args.assigned_to)),
            "fixed_version_id": resolve_version(lookup_project_id, parse_id_or_name(args.fixed_version)),
            "category_id": resolve_category(lookup_project_id, parse_id_or_name(args.category)),
            "parent_issue_id": args.parent_id,
            "subject": args.subject,
            "description": args.description,
            "start_date": args.start_date,
            "due_date": args.due_date,
            "estimated_hours": args.estimated_hours,
            "done_ratio": args.done_ratio,
            "notes": args.notes,
        }
    )
    custom_fields = make_custom_fields(custom_values, custom_field_ids(existing_issue))
    if custom_fields:
        issue["custom_fields"] = custom_fields
    return {"issue": issue}


def maybe_write(action: str, path: str, payload: dict[str, Any], confirm: bool) -> dict[str, Any]:
    if not confirm:
        return {
            "dry_run": True,
            "action": action,
            "path": path,
            "payload": payload,
            "message": "Add --confirm to submit this change.",
        }
    if action == "POST":
        return post_json(path, payload)
    if action == "PUT":
        return put_json(path, payload)
    raise SystemExit(f"Unsupported write action {action}")


def create_issue(args: argparse.Namespace) -> dict[str, Any]:
    if not args.tracker:
        raise SystemExit("create requires --tracker")
    if not args.subject:
        raise SystemExit("create requires --subject")
    if not args.due_date:
        raise SystemExit("create requires --due-date because Redmine requires 计划完成日期")
    if args.estimated_hours is None:
        raise SystemExit("create requires --estimated-hours because Redmine requires 预期时间")
    return maybe_write("POST", "/issues.json", issue_payload_from_args(args), args.confirm)


def update_issue(args: argparse.Namespace) -> dict[str, Any]:
    data = get_json(f"/issues/{args.issue}.json")
    payload = issue_payload_from_args(args, data["issue"], default_project=False)
    if not payload["issue"]:
        raise SystemExit("No update fields provided")
    return maybe_write("PUT", f"/issues/{args.issue}.json", payload, args.confirm)


def log_time(args: argparse.Namespace) -> dict[str, Any]:
    payload = {
        "time_entry": clean_params(
            {
                "issue_id": args.issue,
                "hours": args.hours,
                "spent_on": args.spent_on,
                "activity_id": parse_id_or_name(args.activity),
                "comments": args.comments,
            }
        )
    }
    if not payload["time_entry"].get("issue_id"):
        raise SystemExit("time requires --issue")
    if not payload["time_entry"].get("hours"):
        raise SystemExit("time requires --hours")
    return maybe_write("POST", "/time_entries.json", payload, args.confirm)


def list_time(args: argparse.Namespace) -> dict[str, Any]:
    params = clean_params(
        {
            "issue_id": args.issue,
            "user_id": resolve_user(parse_id_or_name(args.user)),
            "project_id": resolve_project(parse_id_or_name(args.project or args.project_id)),
            "spent_on": date_filter(args.spent_from, args.spent_to),
            "limit": args.limit,
            "offset": args.offset,
        }
    )
    data = get_json("/time_entries.json", params)
    return data


def list_reference(args: argparse.Namespace) -> dict[str, Any]:
    project_id = resolve_project(parse_id_or_name(args.project or args.project_id))
    if args.kind == "projects":
        return {"projects": all_pages("/projects.json", "projects")}
    if args.kind == "trackers":
        return get_json("/trackers.json")
    if args.kind == "statuses":
        return get_json("/issue_statuses.json")
    if args.kind == "priorities":
        return get_json("/issue_priorities.json")
    if args.kind == "users":
        return {"users": all_pages("/users.json", "users", {"name": args.name})}
    if args.kind == "versions":
        if project_id is None:
            raise SystemExit("refs versions requires --project or --project-id")
        return {"versions": all_pages(f"/projects/{project_id}/versions.json", "versions")}
    if args.kind == "categories":
        if project_id is None:
            raise SystemExit("refs categories requires --project or --project-id")
        return get_json(f"/projects/{project_id}/issue_categories.json")
    raise SystemExit(f"Unsupported reference kind {args.kind}")


def add_query_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--project", help="Project name")
    parser.add_argument("--project-id", help="Project id")
    parser.add_argument("--assigned-to", help="User id/name or me")
    parser.add_argument("--author", help="Author id/name")
    parser.add_argument("--status", default="open", help="Status id/name, open, or *")
    parser.add_argument("--tracker", help="Tracker id/name")
    parser.add_argument("--priority", help="Priority id/name")
    parser.add_argument("--fixed-version", help="Fixed version id/name")
    parser.add_argument("--category", help="Category id/name")
    parser.add_argument("--subject-contains", help="Subject substring")
    parser.add_argument("--created-from")
    parser.add_argument("--created-to")
    parser.add_argument("--updated-from")
    parser.add_argument("--updated-to")
    parser.add_argument("--start-from")
    parser.add_argument("--start-to")
    parser.add_argument("--due-from")
    parser.add_argument("--due-to")
    parser.add_argument("--sort", default="updated_on:desc")
    parser.add_argument("--include")
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--raw", action="store_true")


def add_issue_write_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--project", help="Project name")
    parser.add_argument("--project-id", help="Project id")
    parser.add_argument("--tracker", help="Tracker id/name")
    parser.add_argument("--status", help="Status id/name")
    parser.add_argument("--priority", help="Priority id/name")
    parser.add_argument("--assigned-to", help="User id/name or me")
    parser.add_argument("--fixed-version", help="Fixed version id/name")
    parser.add_argument("--category", help="Category id/name")
    parser.add_argument("--parent-id", type=int)
    parser.add_argument("--subject")
    parser.add_argument("--description")
    parser.add_argument("--start-date")
    parser.add_argument("--due-date")
    parser.add_argument("--estimated-hours", type=float)
    parser.add_argument("--done-ratio", type=int)
    parser.add_argument("--project-stage")
    parser.add_argument("--task-level")
    parser.add_argument("--sequence")
    parser.add_argument("--review-status")
    parser.add_argument("--tags")
    parser.add_argument("--test-passed")
    parser.add_argument("--test-done-at")
    parser.add_argument("--notes", help="Issue note/comment")
    parser.add_argument("--confirm", action="store_true", help="Actually submit the write")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command")

    query = subparsers.add_parser("query", help="List issues with Redmine filters")
    add_query_args(query)

    issue = subparsers.add_parser("issue", help="Read one issue")
    issue.add_argument("issue", type=int)
    issue.add_argument("--include")
    issue.add_argument("--raw", action="store_true")

    create = subparsers.add_parser("create", help="Create an issue; dry-run unless --confirm")
    add_issue_write_args(create)

    update = subparsers.add_parser("update", help="Update an issue; dry-run unless --confirm")
    update.add_argument("issue", type=int)
    add_issue_write_args(update)

    time = subparsers.add_parser("time", help="Log time; dry-run unless --confirm")
    time.add_argument("--issue", type=int, required=True)
    time.add_argument("--hours", type=float, required=True)
    time.add_argument("--spent-on", required=True)
    time.add_argument("--activity", help="Activity id; use refs if unsure")
    time.add_argument("--comments")
    time.add_argument("--confirm", action="store_true")

    times = subparsers.add_parser("times", help="List time entries")
    times.add_argument("--issue", type=int)
    times.add_argument("--user", default="me")
    times.add_argument("--project")
    times.add_argument("--project-id")
    times.add_argument("--spent-from")
    times.add_argument("--spent-to")
    times.add_argument("--limit", type=int, default=25)
    times.add_argument("--offset", type=int, default=0)

    refs = subparsers.add_parser("refs", help="List ids for projects, versions, categories, enums, users")
    refs.add_argument("kind", choices=["projects", "trackers", "statuses", "priorities", "users", "versions", "categories"])
    refs.add_argument("--project")
    refs.add_argument("--project-id")
    refs.add_argument("--name")

    parser.add_argument("--issue", type=int, help=argparse.SUPPRESS)
    parser.add_argument("--mine", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--status", default="open", help=argparse.SUPPRESS)
    parser.add_argument("--limit", type=int, default=25, help=argparse.SUPPRESS)
    parser.add_argument("--offset", type=int, default=0, help=argparse.SUPPRESS)
    parser.add_argument("--raw", action="store_true", help=argparse.SUPPRESS)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "query":
        output = list_issues(args)
    elif args.command == "issue":
        output = get_issue(args)
    elif args.command == "create":
        output = create_issue(args)
    elif args.command == "update":
        output = update_issue(args)
    elif args.command == "time":
        output = log_time(args)
    elif args.command == "times":
        output = list_time(args)
    elif args.command == "refs":
        output = list_reference(args)
    elif args.issue:
        data = get_json(f"/issues/{args.issue}.json")
        output = data if args.raw else compact_issue(data["issue"])
    elif args.mine:
        data = get_json(
            "/issues.json",
            {
                "assigned_to_id": "me",
                "status_id": args.status,
                "limit": args.limit,
                "offset": args.offset,
            },
        )
        output = data if args.raw else {
            "total_count": data.get("total_count"),
            "limit": data.get("limit"),
            "offset": data.get("offset"),
            "issues": [compact_issue(issue) for issue in data.get("issues", [])],
        }
    else:
        parser.error("use a subcommand, --issue ID, or --mine")

    print_json(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
