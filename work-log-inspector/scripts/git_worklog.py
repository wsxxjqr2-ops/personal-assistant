#!/usr/bin/env python3
"""Collect remote Git activity for Chinese work-log preparation."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
from collections import OrderedDict
from pathlib import Path
from typing import Any


PROJECTS = OrderedDict(
    [
        ("ai_voice_bot_server", ["~/code/ai_voice_bot_server"]),
        (
            "pix-microservice",
            [
                "~/code/pix-microservice",
                "~/code/pix-microservices",
                "~/code/pix-microservice/pix-console-verify",
                "~/code/pix-microservices/pix-console-verify",
            ],
        ),
        ("rt_server", ["~/code/rt_server", "~/code/rt_server/rt_web"]),
        (
            "GB28181",
            [
                "~/code/gb28181/gb28181-client",
                "~/code/gb28181/wvp-gb28181-pro",
            ],
        ),
        ("pix-ehr", ["~/code/pix-ehr"]),
        ("自动化部署平台", ["~/code/dagu"]),
    ]
)

DEFAULT_PEOPLE = ["丁昌江", "丁 昌江", "Ding Changjiang", "Changjiang Ding"]


def run_git(repo: Path, args: list[str]) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    return proc.stdout.strip() if proc.returncode == 0 else ""


def is_git_repo(path: Path) -> bool:
    return path.exists() and bool(run_git(path, ["rev-parse", "--git-dir"]))


def discover_repos(paths: list[str]) -> list[Path]:
    repos: list[Path] = []
    seen: set[str] = set()
    for raw in paths:
        path = Path(os.path.expanduser(raw)).resolve()
        candidates: list[Path] = []
        if is_git_repo(path):
            candidates.append(path)
        elif path.exists():
            for git_dir in path.glob("**/.git"):
                try:
                    depth = len(git_dir.relative_to(path).parts)
                except ValueError:
                    continue
                if depth <= 4:
                    candidates.append(git_dir.parent.resolve())

        for candidate in candidates:
            key = str(candidate)
            if key not in seen:
                repos.append(candidate)
                seen.add(key)
    return repos


def remotes(repo: Path) -> list[str]:
    output = run_git(repo, ["remote", "-v"])
    urls: list[str] = []
    seen: set[str] = set()
    for line in output.splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[1] not in seen:
            urls.append(parts[1])
            seen.add(parts[1])
    return urls


def fetch(repo: Path) -> None:
    run_git(repo, ["fetch", "--all", "--prune"])


def remote_refs(repo: Path) -> list[str]:
    output = run_git(repo, ["for-each-ref", "--format=%(refname)", "refs/remotes"])
    return [line.strip() for line in output.splitlines() if line.strip() and not line.endswith("/HEAD")]


def commit_refs(repo: Path, full_hash: str) -> str:
    return run_git(repo, ["branch", "-r", "--contains", full_hash])


def person_matches(value: str, people: list[str]) -> bool:
    normalized = value.lower().replace(" ", "")
    return any(person.lower().replace(" ", "") in normalized for person in people)


def daily_commits(repo: Path, date: str, people: list[str]) -> list[dict[str, Any]]:
    day = dt.date.fromisoformat(date)
    next_day = day + dt.timedelta(days=1)
    refs = remote_refs(repo)
    if not refs:
        return []

    fmt = "%H%x1f%h%x1f%an%x1f%cn%x1f%cd%x1f%D%x1f%s"
    output = run_git(
        repo,
        [
            "log",
            *refs,
            f"--since={day.isoformat()} 00:00:00 +0800",
            f"--until={next_day.isoformat()} 00:00:00 +0800",
            "--date=iso-local",
            f"--pretty=format:{fmt}",
        ],
    )
    commits: list[dict[str, Any]] = []
    for line in output.splitlines():
        parts = line.split("\x1f")
        if len(parts) != 7:
            continue
        full_hash, short_hash, author, committer, committed_at, decorations, subject = parts
        if not (person_matches(author, people) or person_matches(committer, people)):
            continue
        commits.append(
            {
                "hash": full_hash,
                "short_hash": short_hash,
                "author": author,
                "committer": committer,
                "committed_at": committed_at,
                "decorations": decorations,
                "remote_branches": commit_refs(repo, full_hash).splitlines(),
                "subject": subject,
            }
        )
    return commits


def build(args: argparse.Namespace) -> OrderedDict[str, list[dict[str, Any]]]:
    project_paths = OrderedDict((name, list(paths)) for name, paths in PROJECTS.items())
    for root in args.root:
        project_paths.setdefault(Path(root).name, []).append(root)

    data: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
    for project, paths in project_paths.items():
        repos = discover_repos(paths)
        seen_hashes: set[str] = set()
        entries: list[dict[str, Any]] = []
        for repo in repos:
            if not args.no_fetch:
                fetch(repo)
            commits = []
            for item in daily_commits(repo, args.date, args.person):
                if item["hash"] in seen_hashes:
                    continue
                seen_hashes.add(item["hash"])
                commits.append(item)
            entries.append({"path": str(repo), "remotes": remotes(repo), "commits": commits})
        data[project] = entries
    return data


def parse_date(value: str) -> str:
    try:
        return dt.date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise SystemExit(f"Invalid --date {value!r}; expected YYYY-MM-DD") from exc


def print_text(data: OrderedDict[str, list[dict[str, Any]]], include_empty: bool) -> None:
    for project, repos in data.items():
        rows = []
        seen_subjects: set[str] = set()
        for repo in repos:
            for commit in repo["commits"]:
                subject = commit["subject"].strip()
                if not subject or subject in seen_subjects:
                    continue
                seen_subjects.add(subject)
                rows.append(f"{commit['short_hash']} {commit['committed_at']} {subject}")
        if not rows and not include_empty:
            continue
        print(project)
        if rows:
            for index, row in enumerate(rows, 1):
                print(f"{index}、{row}")
        else:
            print("无丁昌江提交记录")
        print()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True, type=parse_date)
    parser.add_argument("--person", action="append", default=list(DEFAULT_PEOPLE))
    parser.add_argument("--include-empty", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--no-fetch", action="store_true")
    parser.add_argument("--root", action="append", default=[])
    args = parser.parse_args()

    data = build(args)
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print_text(data, args.include_empty)


if __name__ == "__main__":
    main()
