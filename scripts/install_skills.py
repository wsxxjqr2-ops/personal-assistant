#!/usr/bin/env python3
"""Install repository skills into the Codex skills directory."""

from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SKILL_NAMES = [
    "work-log-inspector",
    "collaboration-platform-assistant",
    "ogsm-writer",
]


def default_codex_skills_dir() -> Path:
    codex_home = os.environ.get("CODEX_HOME")
    if codex_home:
        return Path(codex_home).expanduser() / "skills"
    return Path.home() / ".codex" / "skills"


def install_skill(source: Path, target: Path, copy: bool, force: bool) -> str:
    if not (source / "SKILL.md").is_file():
        raise SystemExit(f"Missing SKILL.md in {source}")

    if target.exists() or target.is_symlink():
        try:
            if target.resolve() == source.resolve():
                return f"ok existing {target} -> {source}"
        except FileNotFoundError:
            pass
        if not force:
            raise SystemExit(f"Target already exists: {target}. Use --force to replace it.")
        if target.is_symlink() or target.is_file():
            target.unlink()
        else:
            shutil.rmtree(target)

    target.parent.mkdir(parents=True, exist_ok=True)
    if copy:
        shutil.copytree(source, target)
        return f"copied {source} -> {target}"

    target.symlink_to(source, target_is_directory=True)
    return f"linked {target} -> {source}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dest",
        type=Path,
        default=default_codex_skills_dir(),
        help="Codex skills directory; defaults to $CODEX_HOME/skills or ~/.codex/skills.",
    )
    parser.add_argument("--copy", action="store_true", help="Copy skills instead of symlinking them.")
    parser.add_argument("--force", action="store_true", help="Replace existing targets.")
    args = parser.parse_args()

    for name in SKILL_NAMES:
        source = REPO_ROOT / name
        target = args.dest.expanduser().resolve() / name
        print(install_skill(source, target, args.copy, args.force))


if __name__ == "__main__":
    main()
