# OGSM Rules

## Standard OGSM Table Structure

Use this standard structure unless the user explicitly provides a special template or asks for a different layout:

- `A1:A2`: `目的/愿景(Objective)`
- `B1:B2`: `目标(Goal)`
- `C1:C2`: `策略(Strategy)`
- `D1:D2`: `衡量指标(Measure)`
- `E1:H1`: `行动计划`
- `E2`: `具体行动`
- `F2`: `负责人`
- `G2`: `参与者`
- `H2`: `时间`
- `I1:I2`: `进度跟踪`

Standard header styling:

- Merge `A1:A2`, `B1:B2`, `C1:C2`, `D1:D2`, `I1:I2`.
- Merge `E1:H1` as the parent `行动计划` header.
- Row 2 contains only the action-plan subheaders `具体行动`, `负责人`, `参与者`, `时间`.
- Use large bold centered header text with wrapping.
- Use exact absorbed header colors:
  - A Objective: fill `#B7DDF5`, font `微软雅黑` 22 bold, text `#000000`.
  - B Goal: fill `#FFEBB2`, font `微软雅黑` 22 bold, text `#000000`.
  - C Strategy: fill `#5586B8`, font `微软雅黑` 22 bold, text `#FFFFFF`.
  - D Measure: fill `#958B80`, font `微软雅黑` 22 bold, text `#FFFFFF`.
  - E-H Action Plan parent and subheaders: fill `#AEE58A`, font `微软雅黑` 22 bold, text `#000000`.
  - I Progress Tracking: fill `#AEE58A`, font `微软雅黑` 22 bold, text `#0000FF`.
- Avoid making all top-level headers the same dark blue; that does not match the absorbed standard style.
- Freeze the top two rows when the output format supports it.

Formal output should keep formal headers and write actual OGSM rows, while removing instructional prompts and sample rows unless the user explicitly asks for a teaching/template version.

If the user provides a special OGSM template, inspect and extract formal headers, colors, action-plan subheaders, instructional rows, sample rows, merged cells, frozen rows, wrapping, and column layout. Follow the special template only when the user asks for it.

## Required User-Provided Inputs

Must know before final generation:

- target person
- quarter/time period
- performance contract or equivalent source goals
- task evidence from collaboration platform, issue list, or user-provided task list
- output format and destination

Ask the user at the start for required materials. Do not search local folders, prior workspaces, the internet, or collaboration systems to discover materials unless the user explicitly requests that search or gives exact paths/URLs.

Use `待确认` only for individual fields that remain unavailable after reading the user-provided sources, not as a substitute for asking for the main source files.

## Writing Experience From The Example

The intelligent remote driving example teaches how to think, not just how to format. Its content is built around project success conditions:

1. Connect personal/project work upward to a company battle.
   - Do not write a standalone personal task list.
   - Start from company/department battle direction, then show how this project contributes.
   - Example logic: company battle -> department goal -> concrete project/system contribution.

2. Treat Goal as delivery commitment, not aspiration.
   - Name the project/version, quarter boundary, and delivery cycle.
   - State what must be finished and what "finished" means.
   - Split different versions or phases when they have different purposes, such as 1.0 for PRD completion and 1.2 for safety loop, UI, detail, and experience optimization.

3. Write Strategy around the key uncertainties that decide success.
   - The example does not say "improve customer experience" or "support business". It names the management problems:
     PRD clarity, kickoff and responsibility alignment, architecture choice, technical route, UI/design coordination, interface alignment, safety strategy, performance bottlenecks, field testing, and final acceptance.
   - Good strategies therefore aim at risk control and path design:
     requirements must be clear, responsibilities must be aligned, architecture must be right, interfaces must be settled early, safety and performance risks must be verified, enough field/system tests must happen.

4. Make Strategy a compressed first-level plan.
   - Strategy is not a slogan and not raw issue titles.
   - It should summarize many detailed tasks into a few execution stages.
   - The example's S1-S5 is essentially: define the right product -> mobilize the project -> choose the right solution -> build across all systems -> test and accept.

5. Use "重点" to expose what must not go wrong.
   - After each strategy item, write the key concern: what decision, coordination, risk, bottleneck, or acceptance point deserves leadership attention.
   - If there is no "重点", the strategy usually becomes too generic.

6. Measures must prove execution quality, not only task completion.
   - The example measures PRD coverage, task granularity to person/day, kickoff completion, solution coverage and competitiveness, cost cap, PRD feature satisfaction, subject function readiness, scalability, sufficient testing, and zero fault under continuous operation.
   - Prefer measures that prove the project was delivered with quality, safety, scalability, and acceptance evidence.

7. Action Plan is the source project breakdown structure.
   - The example shows what a well-structured project breakdown looks like: first-level work packages with second-level tasks underneath.
   - For another project, do not create equivalent phase/module blocks yourself. Copy the first-level headings from the collaboration platform/source exactly and place source child tasks below them.
   - When the task platform has first-level folded groups or parent phase rows, keep those headings in the Action Plan cell exactly as shown and in source order.
   - If the platform/source only provides a flat task list, keep it flat in the formal OGSM unless the user explicitly asks for manual reorganization.

8. Owner is the main accountable person for the row.
   - A row can have many task assignees, but the Owner column is still one accountable person.
   - Subtask assignees belong in Action Plan. The row owner and first participant represent the accountability center.

9. Participants are the collaboration network.
   - Participants are not decorative. They should include the row owner first, then the people needed across product, platform, UI, hardware, vehicle, test, and project management.

10. Time is the project/version cycle, not a duplicate of every action date.
   - Detailed dates live in Action Plan.
   - The Time column summarizes the major delivery cycle or version windows.

When generating new OGSM content, ask: "What are the equivalent PRD, kickoff, architecture, cross-system development, safety/performance, testing, acceptance, and collaboration risks for this project?" That is the direction the Strategy and Measure columns should be written toward.

## Column Meaning

Objective (`O`): "往哪去（定性）". This column must be a strict chained O/G/S hierarchy, not a prose description.

Required format:

`公司/部门关键战役(部门O)--部门关键目标(部门G)--个人或项目战略贡献(部门S)`

Concrete pattern:

`让公司的机器人集成战役成功(部门O)--自动驾驶部署和模型训练工具链平台开发(部门G)--完成海外部署工具链与数据闭环平台1.0(部门S)`

Hard rules:

- Use exactly the chain shape `...(部门O)--...(部门G)--...(部门S)`.
- Include `(部门O)`, `(部门G)`, and `(部门S)`.
- Separate the three levels with `--`.
- The first segment is the upstream company/department battle or objective.
- The second segment is the department goal or strategic goal under that battle.
- The third segment is the project/person contribution or delivery direction.
- Do not write Objective as `商业化战役：...`, `机器人集成：...`, a paragraph, a value proposition, or a list of deliverables.
- Build each Objective from the performance contract or source goal file. Do not reuse one Objective chain for every row unless the source contract truly assigns the same O/G/S to all those rows.
- The third segment `(部门S)` must match that row's Goal/project/workstream. If the row is about remote driving, cockpit, hardware, certification, operations, AI enablement, or another project family, its `(部门S)` must reflect that row's source strategy, not a copied strategy from another row.
- If source material does not clearly provide the matching department O/G/S wording for a row, ask the user for the O/G/S wording instead of inventing or copying a nearby Objective.

This means `O` is a compact hierarchy: company/department objective -> department goal -> the person's/project's strategic contribution. It is qualitative and directional, but still must keep the chain format.

Objective mapping workflow:

1. Extract all O/G/S chains or equivalent hierarchy from the performance contract/source goal file.
2. For each OGSM row, identify its project/workstream from Goal, task evidence, or source goal title.
3. Match the row to the closest O/G/S chain from the source contract.
4. Write `Objective` using the matched O, G, and S. The row's `(部门S)` should usually vary when rows represent different projects or workstreams.
5. If several rows share the same O and G but represent different projects, keep O/G the same but change `(部门S)` to the matched project strategy from the source.
6. If no source chain matches a row, ask the user; do not fill by repeating the previous row's Objective.

Goal (`G`): "要达成什么结果（定量，偏业务）". Describe concrete outcomes under the objective. Include project/version names, quarter scope, total project cycle, required delivery result, and numeric or acceptance expectations. The template example includes both 1.0 and 1.2 project targets and their project cycles. Goal can contain several related targets in one cell when they belong to the same strategic row.

When a performance contract includes participant lists inside target text, adapt the Goal cell to the leader template style: remove `@person` participant lists from Goal and put people in `Owner`, `Participants`, and `Action Plan`; keep project cycle wording such as `项目总周期...` when present. Do not delete measurable target values, version names, quarter scope, or acceptance wording.

Write Goal toward "deliverable + acceptance boundary":

- what system/platform/product/version will be completed
- which customer, scenario, or company battle it supports
- what project cycle or quarter boundary applies
- what acceptance target proves success, such as PRD coverage, feature completion, stable operation, safety validation, or customer usable state

Goal must not describe the work method. Do not start or center Goal on actions such as `沟通需求`, `梳理流程`, `确认痛点`, `对齐协议`, `收集培训资料`, `拜访/访谈用户`, `组织会议`, or `推动协同`. Those are Strategy or Action Plan content. In Goal, rewrite them into the result they enable:

- Bad Goal: `与自驾和FAE部门一起沟通需求，梳理原有海外部署流程...`
- Better Goal: `完成海外部署工具链与数据闭环平台1.0，支撑德国客户自助部署、问题反馈和闭环...`
- Bad Goal: `与车端、座舱端开发人员沟通协议...`
- Better Goal: `完成车端、座舱端、云端通信协议、API接口和协议转发处理，支撑三端联调...`

Keep project boundaries clean. Similar names, shared departments, same upstream battle, or same quarter do not mean the same goal. Do not mix adjacent project wording into a row:

- If a row is `RoboShop扫码收款系统`, do not add `RoboCin`, commercial demo, Germany launch/demo, or other project-specific acceptance unless the source explicitly says the target person or this row owns that scope.
- `RoboCin` and commercial demo are not banned projects. If the target person truly owns that project or module, write it as a separate clean row mapped to its own source O/G/S chain and platform task evidence; do not mix it into RoboShop or another neighboring project row.
- If a row is only the target person's subsystem (for example backend/platform/service), do not import UI, hardware, certification, or operations deliverables as if they were owned by that row.
- If the user corrects a boundary, remove unrelated wording from Objective, Goal, Strategy, Measure, Time, and Progress Tracking, not only from one cell.

Goal formatting:

- Use line breaks inside the Goal cell when there are multiple targets, versions, phases, or acceptance groups.
- One line/paragraph should describe one major target, version, or delivery commitment.
- Do not squeeze several semicolon-separated goals into one dense paragraph.
- Good pattern:
  `完成某系统1.0项目：满足PRD目标，项目周期...；`
  newline
  `完成某系统1.2项目：完成安全闭环、体验优化和验收...；`
  newline
  `运营/质量目标：可用率...，重大故障...，问题闭环...。`
- Keep wrapping enabled, but do not rely on automatic wrapping as the only separator; insert explicit `\n` line breaks for distinct goal segments.

Strategy (`S`): "怎么干（策略，靠什么路径/打法去赢）". It is a condensed first-level plan that highlights the path and key risks. For software/system organizations, write it as project execution strategy:

- S1: demand analysis, scope split, milestone plan, owner and responsibility boundaries
- S2: project kickoff, mobilization, responsibility confirmation, and cross-role coordination when needed
- S3: technical方案, architecture, API/interface, data, deployment, security, SOP, or certification material design
- S4: coding, module development, integration, joint debugging, environment adaptation, deployment execution
- S5: test acceptance, launch, operations monitoring, issue closure, evidence archive, review and improvement

Use 4-5 strategy items depending on project complexity. The template example uses S1-S5: demand/PRD -> kickoff/planning -> overall solution -> multi-side development -> testing/acceptance.

Each strategy item should follow this shape:

`Sx：阶段/打法，重点：关键判断、关键协同、关键风险或关键验收点；`

Do not make `S` a list of platform issue titles. Those belong in Action Plan.

Write Strategy toward these directions when applicable:

- requirement correctness: PRD, scope, user scenario, boundary, stakeholder confirmation
- project organization: kickoff, responsibility split, milestone, resource/design/hardware coordination
- technical correctness: architecture, data flow, interface protocol, module split, security/safety strategy, cost/performance decision
- cross-system delivery: cloud, vehicle, cockpit, frontend, hardware, UI, data, algorithm, test, and operations dependencies
- risk closure: interface ambiguity, performance bottleneck, safety fallback, hardware selection, deployment environment, field support
- validation: joint debugging, integration test, system test, field test, acceptance evidence, long-running stability

Capture real coordination in Strategy when it is necessary for the work to succeed. Examples:

- Overseas deployment/toolchain: with autonomous-driving and FAE teams, confirm the original deployment workflow, pain points, blockers, training material, real customer cases, FAQ, and issue records; turn FAE material/cases into AI knowledge-base corpus.
- Remote driving/cloud-platform work: with cockpit-side and vehicle-side developers, align protocol fields, state definitions, API ownership, protocol versions, interface lists, fallback logic, and joint-debug plans.
- Robot/RoboShop work: with robot developers, clarify arm workflow, scan/payment interaction, success/failure state, abnormal handling logic, MQTT fields, and hardware/arm joint-debug flow.
- Operations/miniprogram work: with operations, confirm actual usage feedback, acceptance口径, backend service boundaries, data statistics, and issue closure.

Keep this coordination at the strategy level. Do not move it into Goal unless the sentence describes a delivered system state rather than the communication itself.

Measure (`M`): "怎么衡量干得好不好、目标有没有达成". Write acceptance standards. Each strategy should map to 1-2 measures using `Sx.M1` / `Sx.M2`. Good measures from the template include PRD coverage, task split to person/day, kickoff completion, solution coverage, cost cap, PRD feature satisfaction, subject function readiness, multi-vehicle/multi-cockpit scalability, sufficient test completion, continuous-running fault rate, and acceptance result.

Measures should be hard enough to prevent vague success. Good `M` types:

- coverage: PRD coverage 100%,方案覆盖需求100%, core modules covered
- granularity: task split to person/day, owner/date clear
- source/evidence: workflow, pain-point list, training material, customer cases, FAQ, protocol fields, data model, interface list, or responsibility boundary is complete and traceable
- delivery: PRD feature satisfaction >=95%, subject functions 100% ready
- quality: test cases completed, field/integration/system test passed, major failure 0
- stability: continuous operation >=72h with fault rate 0, uptime target met
- scalability/performance: multi-vehicle/multi-cockpit support, performance bottleneck verified
- cost/commercial constraint: hardware cost cap, deployability, customer usable state

Avoid weak process-only measures such as generic `方案评审通过`, `已沟通`, or `已对齐` unless the source explicitly treats that event as a formal acceptance gate. Prefer stronger result evidence:

- artifacts are complete and traceable
- protocol/interface/data fields are implemented and used by all relevant sides
- chain can run end to end
- real customer/operations/FAE cases validate the result
- test or field scenario passes
- issue records have owner, status, and closure result
- customer or operations can use the system without extra manual support

Calibrate response-time and closure metrics by risk:

- Safety-critical, real-vehicle, remote-driving, production deployment, customer-facing blocker: minute-level response can be appropriate, such as `实车/联调阻塞问题15分钟内响应`.
- Operational tools, miniprograms, dashboards, or non-safety customer workflows: use realistic tiers, such as `重大运营阻塞问题30分钟内响应，普通问题1个工作日内响应，问题闭环≤5个工作日`.
- Internal documentation, knowledge-base, certification material, or planning work: measure artifact completeness, traceability, and issue closure instead of aggressive minute-level response.

Action Plan (`E`): "具体谁、何时、做什么". This is where detailed first-level and second-level source task plans go. The template's numbered phase blocks are examples of how source headings appear, not permission to invent headings:

`01启动项目:`
`02设计:`
`03前端:`
`04交互和UI:`
`05硬件:`
`06车端远程驾驶软件:`
`07车端自动驾驶软件:`
`08远驾座舱软件:`
`09集成、测试:`

Use only phase names from the collaboration platform/source. Put task records here with owner and date in the form `任务名(@负责人 yyyy.mm.dd~yyyy.mm.dd)` or `任务名(@负责人 yyyy-mm-dd~yyyy-mm-dd)`. Multi-person task owners can appear inside action text only when the source task says so; the separate Owner column must still be one person.

First-level heading rules:

- Preserve the task platform's first-level headings/folded groups/parent phase rows in `E 具体行动` exactly as shown in the platform.
- Format each source heading as its own line ending with `:`, for example `01启动项目:` or `03云端:`.
- Put child tasks below the heading, one task per line.
- Do not flatten child tasks into a list without the heading when the source platform provides phase/module groups.
- Do not invent, rename, merge, split, translate, or reorder first-level headings.
- If the platform does not provide headings, do not create headings unless the user explicitly asks for a manually organized version. In the formal OGSM, use only the task structure that exists in the provided source.
- A good Action Plan cell should read like a project breakdown structure, not a disconnected issue list.

Owner (`F`): One person only. Use the project/module owner from the source evidence. No role suffixes, no numbered lists, no multiple names.

Participants (`G`): Start with `@负责人`, then list collaborators as plain names without `@`. Only the first responsible person has `@`. The first participant must match the Owner column.

Time (`H`): Use the project-level time range or version-level time ranges. The template example puts the 1.0 and 1.2 project cycles here, not every subtask date.

Progress Tracking (`I`): Actual state from tracker or user context, written as a direct itemized status list. Include completion rate, closed/in-progress/new state, test status, and important risks, but do not write platform-source summary sentences.

Good patterns:

- `xxx功能：完成`
- `xxx任务：完成60%`
- `xxx问题：进行中50%`
- `xxx事项：待确认`

Hard rules:

- One task/function/status per line.
- Do not write `平台 query_id=xxx 显示...`, `当前多项为...`, `覆盖...任务...`, or other broad source-summary prose in the formal workbook.
- Do not group several statuses into one sentence when the tracker provides item-level status.
- Keep the wording direct and auditable: task/function name first, then status or completion percentage.

## Placement Rules

Use this decision process when drafting:

- If the text answers "why / toward what direction", extract the three O/G/S levels and put them in Objective using `...(部门O)--...(部门G)--...(部门S)`.
- If it answers "what result by the quarter or project cycle", put it in Goal.
- If it is a communication/alignment/discovery action such as stakeholder demand confirmation, workflow discovery, pain-point collection, protocol alignment, training-material/customer-case collection, or cross-team coordination, put it in Strategy or Action Plan, not Goal.
- If it answers "what path/stage/risk-management method makes the goal achievable", put it in Strategy.
- If it answers "how to judge whether that strategy worked", put it in Measure.
- If it is a task name, person, date, module, issue, or work package, put it in Action Plan.
- If it is actual status, completion percentage, closed/open state, test result, or risk, put it in Progress Tracking as one direct line per task/function.

Strategy should be abstracted from the action plan. For example, many tasks such as "主屏软件技术方案", "云控平台和通信技术方案", "平板软件技术方案", and "技术方案汇总" can become one Strategy item: "总体方案设计，重点：软件技术总架构、感知可视化、三屏显示体验、交互硬件选型和方案汇总". Keep the detailed tasks in Action Plan.

Goal can mention project versions and total cycles. Action Plan should contain the detailed task schedule. Time column should summarize project/version cycles.

## Objective Validation

Before finalizing, validate every Objective value:

- It contains `(部门O)`, `(部门G)`, and `(部门S)`.
- It contains two `--` separators between O, G, and S.
- It does not contain a colon-style label such as `商业化战役：`, `机器人集成：`, or `提升组织能力：`.
- It is not a sentence-style summary of projects.
- Its `(部门S)` is semantically aligned with that row's Goal/project/workstream.
- If multiple rows have identical Objective values but different Goal/project families, confirm the performance contract truly uses the same O/G/S for all of them. Otherwise, remap the Objectives.
- Watch for copy-paste errors where every row has the same third segment `(部门S)`. This is usually wrong unless the rows are sub-goals of the exact same department strategy.

If an Objective fails this validation, rewrite it into the chain format or ask the user for the missing O/G/S source wording.

## Action Plan Validation

Before finalizing, validate every Action Plan cell:

- If the source platform has first-level groups/phase headings, the Action Plan must include them.
- Group headings should be separate lines ending with `:` and must match the platform wording.
- Child tasks should appear under their source group heading.
- A cell that contains only flat task lines without headings is incomplete when the source has grouped tasks.
- The order of headings must follow the platform/source order.
- A cell that contains invented headings not present in the platform is invalid unless the user explicitly requested manual reorganization.

## Task Platform Evidence

When task evidence comes from a collaboration platform or project-registration URL, first use the `web-access` skill. This is required for internal systems, logged-in pages, dynamic rendered pages, and user-provided URLs such as issue lists.

Capture these fields when visible:

- task or project title
- parent project or milestone
- owner/assignee
- participants/collaborators
- start date and due date
- status: closed, in progress, new, delayed, canceled, blocked
- completion percentage
- test/acceptance result
- important comments, blockers, or next steps

Use missing/hidden fields as `待确认`; never infer owners or completion state only because the OGSM belongs to a specific person.

## Good Strategy Patterns

Use wording like:

- "需求分析和计划制定，重点：拆清需求边界、责任人、里程碑和交付计划"
- "总体架构和接口方案设计，重点：明确云端、车端、座舱端、前端通信协议、API接口和异常回退策略"
- "模块开发和集成联调，重点：完成后端服务、协议开发、前后端联调和客户环境适配"
- "测试验收和闭环管理，重点：完成专项测试、回归测试、上线验证、问题闭环和资料归档"

Avoid wording like:

- "围绕客户自助部署场景，提升客户体验"
- "围绕商业化运营和客户交付，支撑规模化复制"
- "完善平台能力，提升产品竞争力"

These can appear in Objective or Goal if supported, but they are too business-oriented for Strategy.

## Owner Rules

The owner is the single person responsible for the project, module, or action item. It is not necessarily the person whose OGSM is being prepared.

Use these patterns:

- One owner only: write one person's name.
- No role suffixes in owner cells: do not write role explanations such as `（项目主责）` or `（平台端）`.
- No numbered or multi-person owner lists in owner cells.
- Participants must start with the owner: if owner is `张三`, participants must begin with `@张三`.
- User-owned row: use the target person's name only when the tasks or module are actually owned by that person.
- Unknown owner: prefer `待确认` or infer cautiously from task assignee; do not silently assign to the OGSM subject.

For example, if a system project is led by one person and the OGSM target person owns only the platform-side work:

- Action Plan should separate overall coordination from platform-side tasks.
- Owner should be the project owner.
- Participants should begin with `@项目负责人`, then include the target person and cross-functional collaborators.
- Platform-side responsibility can be described in action text, such as `平台端：云控平台、后端服务、通信协议/API接口`.

## Workbook Hygiene

- Remove sample explanations, placeholder instructions, and non-final notes from the formal workbook.
- Keep only formal sheets unless the user asks for an explanation sheet.
- Preserve standard headers, colors, and merged cells unless the user asks for another style.
- Set wrapping, row height, and participant/time column widths so long action plans remain readable.
- Validate the generated workbook content for sample/instruction residue and formula errors before final response.
- Visually check the generated workbook header: A/B/C/D/I should be vertically merged across rows 1-2, E1:H1 should be merged as `行动计划`, and header colors should match the exact absorbed colors `#B7DDF5`, `#FFEBB2`, `#5586B8`, `#958B80`, and `#AEE58A`.
- Visually check Goal readability: if a Goal cell contains multiple targets/versions/metric groups, it should have explicit line breaks instead of a single crowded paragraph.
