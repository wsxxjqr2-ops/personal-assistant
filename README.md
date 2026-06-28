# personal-assistant

Codex personal assistant skills and helper scripts.

## Skills

- `work-log-inspector`: inspect git activity and prepare work-log entries.
- `collaboration-platform-assistant`: read and write Redmine-style collaboration platform tasks and time entries.
- `ogsm-writer`: help draft OGSM content.

## Codex Skill Layout

Each skill is stored as a standard Codex skill folder:

```text
skill-name/
├── SKILL.md
├── agents/openai.yaml      # optional UI metadata
├── references/             # optional reference docs
└── scripts/                # optional helper scripts
```

`SKILL.md` frontmatter contains only the required `name` and `description` fields.

## Install Into Codex

Install these repository-managed skills into the Codex discovery directory with symlinks:

```bash
python3 scripts/install_skills.py
```

By default this links skills into `$CODEX_HOME/skills` when `CODEX_HOME` is set, otherwise `~/.codex/skills`.

Useful options:

```bash
python3 scripts/install_skills.py --force
python3 scripts/install_skills.py --copy
python3 scripts/install_skills.py --dest ~/.codex/skills
```

Prefer symlinks during development so edits in this repository are immediately reflected in Codex.
