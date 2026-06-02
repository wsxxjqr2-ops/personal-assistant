---
name: ogsm-writer
description: Create, edit, or review formal OGSM workbooks and plans from performance contracts, source goals, task trackers, issue lists, URLs, or project-registration/collaboration systems, using the built-in standard OGSM structure unless the user explicitly provides a special template. Use when the user asks to write an OGSM table, generate an OGSM workbook, convert project tasks into OGSM, read a collaboration platform for tasks, refine O/G/S/M wording, or correct strategy/action/owner rules for an OGSM deliverable.
---

# OGSM Writer

## Core Workflow

1. Start by asking the user to provide the required materials. Do not search the workspace, local filesystem, internet, or prior context for OGSM source materials unless the user explicitly asks you to search or gives exact paths/URLs to read.
2. Read only user-provided sources before writing: performance contract/source goals, task tracker pages, collaboration platform URLs, pasted text, attachments, and user corrections.
3. From the performance contract/source goals, first build a mapping from project/workstream/goal to its O/G/S chain.
4. Use the built-in standard OGSM table structure from `references/ogsm-rules.md` unless the user explicitly provides a special template or asks to match a template.
5. Build OGSM rows from real goals and task evidence. Do not invent polished-sounding work that is not supported by the contract, tracker, or user context.
6. For `E 具体行动`, preserve the collaboration platform's task hierarchy exactly. First-level headings must come from the platform/source wording and order; do not create, rename, merge, split, translate, summarize, or reorder headings. Even when the target person is not the first project owner, list the whole project's first-level and second-level plan/tasks rather than only the target person's own tasks; mark or identify the target person's responsible parts inside that full project plan when formatting allows.
7. Generate or edit the workbook using the spreadsheet skill when the deliverable is `.xlsx`. Keep the official template style unless the user asks for a redesign.
8. Verify the final workbook: correct sheet count, no sample/instruction residue, no formula errors, readable layout, Objective-to-Goal mapping, platform-exact action headings, and output saved where requested.

Read `references/ogsm-rules.md` when deciding wording, responsibility mapping, standard table structure, or whether a task belongs in Strategy vs Action Plan.

The standard OGSM structure and writing logic have been absorbed into this skill. Before drafting, use the "Writing Experience From The Example" section in `references/ogsm-rules.md` to decide what kind of thinking belongs in each column.

## Interactive Input Collection

If the user asks to create or fill an OGSM, request the required materials at the beginning. Do not first inspect the current directory, search for likely files, browse for company/project information, or infer missing files from naming conventions. Prefer one concise question at a time unless several missing inputs are tightly related.

Use only materials the user explicitly provides in the current task: exact file paths, pasted text, attached files, URLs, or exported task lists. Prior conversation knowledge can guide questions, but it must not substitute for source materials unless the user explicitly says to reuse it.

Required user-provided inputs for a useful OGSM:

- Target person/name: whose OGSM this is.
- Quarter or time period. Do not infer a quarter from the current date.
- Performance contract or source goal file, usually a `.docx`, `.xlsx`, PDF, or pasted text.
- Collaboration/task platform URL, issue query, or exported task list.
- Output requirement: file format and destination folder.

Useful optional inputs:

- Specific department/company `O/G/S` wording to inherit.
- Known owner corrections, such as "某项目负责人是某某".
- Projects to include or exclude.
- Special OGSM template or formatting sample, only if the user wants a non-standard layout.
- Whether the deliverable is formal only or should include an explanation sheet.

Example interaction:

User: `帮我写二季度OGSM`

Assistant should ask: `这份OGSM是给谁写？请提供时间周期、绩效合约/目标文件、协作平台任务链接或任务清单，以及输出格式和保存位置。`

User: `<绩效合约文件路径>`

Assistant should read that file, then ask only for the remaining missing inputs, such as target person, time period, task platform URL/task list, or output location.

Do not ask for an OGSM template during normal use. Ask for a template only if the user explicitly says there is a special template, wants an exact layout match, or provides one voluntarily.

Do not assume any local output folder, quarter, task platform, or source file. If the user has not provided it, ask for it.

Hard prohibitions:

- Do not say "I did not find existing material in the workspace" unless the user explicitly asked you to look there.
- Do not scan directories to discover likely OGSM files before asking for materials.
- Do not search the web or collaboration platform unless the user provides a URL/query or explicitly asks you to search.
- Do not default a period such as "current quarter" or "2026 Q2"; ask the user.
- Do not ask the user for a template as a required material; use the built-in standard OGSM structure unless a special template is requested.
- Do not generate a formal OGSM from memory, guesses, or unstated assumptions.

## Collaboration Platform Access

- For PIX/RUBYLOFT collaboration-platform tasks (`rd.pixmoving.city`, Redmine issues, target versions, categories, assigned work, status reports, OGSMA task evidence), first load and follow the project-local `collaboration-platform-assistant` skill when available.
- Prefer `collaboration-platform-assistant/scripts/redmine_issues.py` REST API reads when `REDMINE_API_KEY` is available. Use it to query by target version, category, status, assignee, date range, parent issue, and issue id before drafting OGSM action plans.
- For OGSM action-plan evidence, query the whole project/target-version/category task set by default, not only the target person's assigned issues. Use assignee filtering only when the user explicitly asks for a personal task subset.
- If Redmine API reads hit intermittent Python `urllib` SSL errors, keep using the project-local collaboration-platform workflow: rely on the bundled script's curl fallback or use a direct curl REST call. Do not fall back to `web-access` only because urllib failed.
- Use `web-access` only when REST API access is unavailable, the user specifically provides a page-only URL/query, or the needed evidence is only visible in the browser UI, such as saved custom query layout, folded page headings, visual ordering not represented by API fields, or comments/attachments not exposed by the current script.
- Do not rely on generic web fetch, guessed summaries, or stale memory for collaboration-platform tasks.
- Extract task evidence from the platform before drafting action plans: task/project name, first-level group/phase title, parent task, assignee/owner, participants when visible, start/end date, status, completion rate, test result, parent project, and blockers.
- When REST API returns enough structure, use API fields such as `fixed_version`, `category`, `project_stage`, `parent_id`, `tracker`, `status`, `assignee`, `start_date`, `due_date`, `done_ratio`, `estimated_hours`, and `spent_hours` as the task evidence.
- When the platform cannot be accessed or a field is not visible through either REST API or browser fallback, mark the missing item as `待确认` rather than inventing it.
- Treat platform first-level groups, folded headings, module rows, parent phase rows, and issue hierarchy as source data. The action-plan structure must follow that source data exactly; absence of platform headings means no invented headings in the formal OGSM.
- Use platform task records as evidence for `E Action Plan`, `Owner`, `Participants`, `Time`, and `Progress Tracking`; use performance contracts and the built-in OGSM writing rules for O/G/S/M framing.

## Writing Rules

- Use the department/company `O` and `G` as the upstream context when the user says to use department strategy; do not leave instructional labels such as "where to go", "sample", or "use department S".
- Write `Objective` as a strict chained hierarchy from the performance contract: `...(部门O)--...(部门G)--...(部门S)`. Do not write Objective as a descriptive paragraph, colon label, business summary, or repeated placeholder chain.
- Preserve the standard formal columns and header styling: `A Objective`, `B Goal`, `C Strategy`, `D Measure`, `E-H Action Plan`, and `I Progress Tracking`.
- In final deliverables, keep formal header rows and remove instructional/sample rows.
- Write `Goal` from the performance contract/source goal wording, but format it according to the leader OGSM templates. Do not freely invent, summarize, embellish, or replace the contract's target wording with self-written goals. When a performance contract is provided, the Goal column should preserve the relevant contract goal/M/target-value text as directly as possible, trimming only unrelated project sections when necessary.
- In `Goal`, remove `@person` participant lists copied from the performance contract; people belong in `Owner`, `Participants`, and `Action Plan`. Keep project cycle wording such as `项目总周期...` when present, matching the leader templates.
- Write `Goal` as delivered result and usable/accepted state only. Do not put communication, requirement clarification, stakeholder interviews, material collection, or alignment work in Goal unless that wording is directly present in the performance contract/source target. Those activities otherwise belong in Strategy or Action Plan.
- Write `S` as execution strategy for software engineering, system delivery, project management, and closed-loop management. Avoid business-value-only strategy wording.
- Keep `S` at the strategy level: demand analysis, technical plan, architecture/interface design, module development, integration, testing, launch, operations, issue closure, evidence and archive.
- In `S`, include the real coordination that makes delivery possible: department/user requirement confirmation, original workflow discovery, protocol/interface alignment with upstream/downstream developers, training material/customer case collection, and field/operations feedback loops when supported by source evidence or user corrections.
- Put concrete tracker tasks in `E Action Plan`, not in `S`. Action Plan can include task names, assignees, dates, and task states.
- In `E Action Plan`, first-level headings must be copied from the collaboration platform/source exactly as shown, including wording and order. Do not fill missing structure with reasonable-looking headings.
- In `E Action Plan`, follow the leader templates: for both first project owner and non-first project owner cases, include the whole project's first-level and second-level plans/tasks. For non-first project owner rows, do not reduce the action plan to only the target person's tasks; instead, keep the full project plan and identify the target person's responsible module/tasks within it when possible.
- In `E Action Plan`, mark the target person's responsible tasks/modules in blue whether or not the target person is the first project owner. If those marked tasks are completed/closed according to the source platform or template evidence, also apply strikethrough. Keep unfinished/open target-person tasks blue without strikethrough.
- In `E Action Plan`, do not append textual status labels such as `关闭`, `完成`, `进行中`, `新建`, or completion percentages when color/strikethrough or the `Progress Tracking` column already represents status. Keep action items in the clean form `任务名(@负责人 yyyy-mm-dd~yyyy-mm-dd)`. Put status and percentages in `I Progress Tracking`.
- In `E Action Plan`, insert one blank line before each new first-level stage/module heading after the first heading, such as before `03产品开发:` or `07综合测试:`. This keeps long action plans readable and matches the leader template's visual rhythm.
- When applying blue/strikethrough rich-text formatting in Excel, preserve the workbook's existing body font family, font size, wrap setting, row height intent, and in-cell line breaks. Do not copy rich-text runs directly from a leader template if that imports the template's larger font size or changes visual density. Rebuild only the necessary color/strikethrough formatting on top of the current workbook's body style.
- For Excel rich-text colors, use opaque ARGB values such as `FF000000` for black and `FF0000FF` for blue. Do not write transparent ARGB values such as `00000000` or `000000FF`; Microsoft Excel may warn that the workbook has problematic content and offer to repair it.
- When rebuilding rich text with line breaks, keep each line break inside the same text run as its line text, for example `TextBlock(font, line + "\n")`. Do not write newline-only rich-text runs between text runs; Excel/WPS may render the action plan as a crowded paragraph even though the file technically contains newline characters.
- After any rich-text edit to `E Action Plan` or `Participants`, reopen the saved workbook and verify that target-person tasks have the expected color/strikethrough, all rich-text runs use the intended body font size, and the action-plan text still contains visible in-cell line breaks rather than appearing as a crowded paragraph.
- Write `Progress Tracking` as a direct itemized status list. Do not write source-summary sentences such as `平台 query_id=xxx 显示...`, `当前多项为...`, or broad grouped summaries. Use one line per task/function/status, such as `xxx功能：完成`、`xxx任务：完成60%`、`xxx问题：进行中50%`、`xxx事项：待确认`.
- Write `M` as real acceptance/result criteria linked to each strategy item. Prefer deliverable readiness, source artifact completeness, interface/protocol landing, link run-through, scenario usability, test/field validation, fault rate, response time, closure time, and customer/operations usability. Avoid fake-sounding measures such as generic "方案评审通过" unless the source explicitly treats it as a formal gate.
- Calibrate response and closure metrics to project complexity. Safety-critical, real-vehicle, remote-driving, production deployment, or customer-blocking issues may require minute-level response; ordinary operational/web/miniprogram issues should use more realistic levels such as major blocker response, normal issue response, and closure within several workdays.
- Treat the `Owner` column as the project/module/action owner, not automatically as the person whose OGSM is being written.
- Write exactly one person in the `Owner` column. Do not add role suffixes such as `（项目主责）` or `（平台端）`, and do not write numbered/multiple owners in this column.
- If the user owns only one subsystem but the row belongs to another project owner, put the project owner as `Owner`; describe the user's subsystem responsibility inside `Action Plan` or `Progress Tracking`.
- Put the `Owner` as the first participant in the `Participants` column every time. Only the first responsible person uses `@`; all other participant names are plain names without `@`. The first `@name` in participants must match the `Owner` cell.
- The `Participants` column must be evidence-based: include the row `Owner`, people who actually appear in that row's `Action Plan` task assignees or explicit task collaborators, and people the user explicitly names for that row. Do not carry over old participant-list names when they do not appear in the current row's tasks or user-provided source evidence. Keep the owner first, deduplicate, and do not include placeholder assignees such as `待确认`.
- Whenever `E Action Plan` is updated from platform tasks, manually pasted task lists, or regenerated project evidence, immediately recompute and verify the same row's `Participants` column from the updated action evidence. Treat Action and Participants as linked fields; never update Action while leaving an old participant list unreviewed.
- When the target person is not the row `Owner` but appears in `Participants`, mark only the target person's name in blue in the `Participants` cell. Keep the first owner `@name` and other participant names in the normal color.

## Review Checklist

Before finalizing:

- Strategies read like engineering execution methods, not product slogans or business benefits.
- Every Objective cell follows `...(部门O)--...(部门G)--...(部门S)`, is mapped from the performance contract to that row's project/goal, and is not repeated across unrelated rows.
- Repeated identical Objective values across rows are allowed only when the performance contract clearly maps those rows to the same O/G/S chain; otherwise remap or ask the user.
- Goal cells state delivered systems, versions, capabilities, target scenario/customer usability, and acceptance boundaries. They must not start with or center on "沟通/梳理/确认/对齐/收集" actions.
- Keep adjacent or similarly named projects cleanly separated by the current target person's real responsibility boundary. Do not import goals, acceptance wording, customers, markets, demos, releases, or metrics from a neighboring project unless the source explicitly links that scope to the target person or row owner. If the target person truly owns an adjacent project such as RoboCin/commercial demo, write it as its own clean row with its own Objective, Goal, Strategy, Measure, Action Plan, Time, and Progress Tracking; if they do not own it, leave it out. If the user says two projects are different, remove the unrelated project wording from Objective, Goal, Strategy, Measure, Time, and Progress Tracking.
- Goal cells use explicit line breaks when they contain multiple targets, versions, phases, or metric groups.
- Measures prove real execution quality and acceptance. Remove vague process-only measures such as generic "评审通过" and replace them with artifacts, runnable links, completed interfaces, validated scenarios, issue closure, or risk-specific quality metrics.
- Action Plan cells preserve first-level group/phase headings from the task platform exactly, such as `01启动项目:` or `03云端:`, with child tasks listed under each source heading in platform order. If the platform has no heading, do not invent one unless the user explicitly requests manual reorganization.
- User-mentioned project families or major workstreams are not accidentally omitted.
- Header layout and colors match the built-in standard unless the user requested another style.
- Built-in standard header fills use exact colors: A `#B7DDF5`, B `#FFEBB2`, C `#5586B8`, D `#958B80`, E-H/I `#AEE58A`.
- Owners match the tracker/project responsibility. Do not default every row to the user.
- Action Plan entries are specific enough to be auditable.
- Progress Tracking is a direct line-by-line task/function status list. It must not contain platform source summaries like `平台 query_id=xxx 显示`; each line should state the task/function and its status or completion percentage.
- The generated file is in the requested output location and has a clear formal filename.
