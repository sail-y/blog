---
title: AI 编程时代的规范驱动开发：四大 SDD 技能选型指南
date: 2026-03-21 21:11:35
tags: [AI开发工具, Claude Code, Skills, SDD, 规范驱动开发]
categories: AI工具
description: 深入解析规范驱动开发（SDD）在 AI 编程时代的重要性，对比 OpenSpec、Superpowers、Get Shit Done、Spec-Kit 四大 SDD 技能包的特点和适用场景，帮助你根据团队规模和项目需求选择最合适的 SDD 实现方案。
---

## 引言

随着 AI 编程工具的普及，Claude Code、Cursor、Windsurf 等 AI 编程助手已经成为开发者的日常工具。然而，AI 编程也带来了新的挑战：**如何让 AI 准确理解需求并保持决策一致性？**

答案就是 **规范驱动开发（Spec-Driven Development，SDD）**。

目前，社区已经涌现出多款实现 SDD 理念的技能包，其中最具代表性的四个是：**OpenSpec**、**Superpowers**、**Get Shit Done（GSD）** 和 **Spec-Kit**。

**这四者的共同点**：都提供了规范驱动开发能力，帮助开发者在编码前先明确"要做什么"。

**不同点**：在设计理念、实现方式、工具支持、适用场景上各有侧重。

本文将：
1. 深入解析 SDD 的核心理念和价值
2. 对比四大 SDD 技能包的特点和差异
3. 提供基于团队规模和项目需求的选型建议

<!--more-->

## 一、什么是规范驱动开发（SDD）

### 1.1 SDD 的核心理念

**规范驱动开发（Spec-Driven Development，SDD）** 是一种软件开发方法论，其核心思想是：**在编写代码之前，先编写规范（Spec），让所有人对"要做什么"达成一致。**

```
传统开发流程：
需求 → 直接编码 → 发现理解偏差 → 返工 → 测试 → 交付
         ↑ 浪费时间、成本增加

SDD 开发流程：
需求 → 编写规范 → 团队审核 → 确认一致 → 编码 → 测试 → 交付
              ↑ 提前对齐，减少返工
```

### 1.2 为什么团队都在推崇 SDD？

#### 问题1：AI 编程工具的"幻觉"问题

**现象：**
```
用户：帮我添加用户认证功能
AI：直接生成代码...
    → 理解成 JWT 认证？Session 认证？OAuth？
    → 实现了登录，但忘记注册流程
    → 用了 SHA256，但你要求的是 bcrypt
    → 生成了前端代码，但你是后端 API 项目
```

**SDD 解决：**
```
用户：/opsx:propose "添加用户认证功能"
AI：生成规范文档：
    ✓ proposal.md（需求分析：JWT 认证 + 邮箱注册）
    ✓ design.md（技术方案：bcrypt 加密、Redis 缓存）
    ✓ tasks.md（实施步骤：12 个子任务）
用户：审核规范，发现不符合要求的地方
AI：修改规范，确认后再实施
→ AI 按规范执行，减少理解偏差
```

#### 问题2：团队协作中的"需求理解不一致"

**现象：**
```
PM：需要一个搜索功能
开发A：做了全文搜索
开发B：做了模糊匹配
测试：做了精确匹配测试
→ 三方理解不同，集成时出问题
```

**SDD 解决：**
```
PM：/opsx:propose "搜索功能"
AI：生成规范文档（详细描述搜索逻辑）
团队：所有人审核同一份规范
开发A、开发B、测试：基于同一份规范工作
→ 理解一致，协作顺畅
```

#### 问题3：大型项目的"上下文衰减"

**现象：**
```
项目开发到第 100 轮对话：
AI：已经忘记第 1 轮确定的技术选型
    开始使用不一致的命名规范
    违反了之前的架构决策
→ 项目越大，质量越不稳定
```

**SDD 解决：**
```
规范文档作为"锚点"：
- 技术选型写在 design.md
- 命名规范写在 specs/coding-standards.md
- 架构决策写在 proposal.md

AI 在实施过程中：
- 随时参考规范文档
- 保持决策一致性
- 即使对话很长，也有据可查
```

### 1.3 SDD 的核心价值

#### 对个人开发者

```
✅ 减少返工：想清楚再动手，避免改来改去
✅ 提高代码质量：有章可循，不会遗漏需求
✅ 便于回顾：规范文档记录了"为什么这么做"
```

#### 对团队

```
✅ 对齐理解：所有人基于同一份规范工作
✅ 降低沟通成本：规范文档比口头描述更清晰
✅ 新人友好：新成员快速了解项目决策
✅ 可追溯：每个决策都有文档记录
```

#### 对企业

```
✅ 合规审计：规范文档就是最好的审计材料
✅ 知识沉淀：项目经验固化成文档资产
✅ 风险控制：重大决策经过充分讨论
✅ 质量保证：规范先行，减少低级错误
```

### 1.4 SDD vs 传统开发对比

| 维度 | 传统开发 | SDD 开发 |
|------|----------|----------|
| **需求传递** | 口头描述 + 文档（可能过期） | 结构化规范文档（持续更新） |
| **理解一致性** | ⚠️ 各自理解，可能偏差 | ✅ 基于规范，理解一致 |
| **AI 辅助** | ❌ AI 瞎猜需求 | ✅ AI 按规范执行 |
| **返工率** | ⚠️ 高（理解偏差导致） | ✅ 低（提前对齐） |
| **文档维护** | ⚠️ 文档容易过期 | ✅ 规范与代码同步 |
| **新人上手** | ⚠️ 需要大量沟通 | ✅ 读规范即可 |
| **审计追溯** | ❌ 困难 | ✅ 完整记录 |

### 1.5 为什么 AI 编程时代更需要 SDD？

**原因1：AI 理解能力的局限**
```
AI 虽然强大，但不能真正"理解"需求
→ 需要明确的规范约束
→ SDD 提供"意图 → 规范"的桥梁
```

**原因2：AI 编程的规模化应用**
```
越来越多的团队使用 AI 编程工具
→ 协作中的理解偏差问题凸显
→ SDD 提供团队协作的"共同语言"
```

**原因3：上下文窗口的限制**
```
AI 有上下文限制（如 200K tokens）
→ 长对话中容易遗忘早期决策
→ SDD 的规范文档作为"外部记忆"
```

---

## 二、四大 SDD 技能包概览

需要明确：**这四个都是 Skills（技能包），都实现了 SDD 理念**，但在实现方式和侧重点上有所不同。

### 2.1 都提供 SDD 能力

```
┌─────────────────────────────────────────────┐
│  SDD（规范驱动开发）核心理念                 │
│  ├─ 先规范，后编码                          │
│  ├─ 团队对齐理解                            │
│  └─ 决策可追溯                              │
└─────────────────────────────────────────────┘
                    ↓
      四种不同的实现方式
                    ↓
┌──────────┬─────────────┬───────────┬──────────┐
│OpenSpec  │Superpowers  │GSD        │Spec-Kit  │
└──────────┴─────────────┴───────────┴──────────┘
```

**共同点**：
- ✅ 都支持规范先行，再编码实施
- ✅ 都能解决 AI 理解偏差问题
- ✅ 都提供某种形式的文档化
- ✅ 都适合团队协作场景

**差异点**：
- 规范的持久化方式不同
- 工作流程的复杂度不同
- 跨工具支持的范围不同
- 学习曲线和易用性不同

### 2.2 支持的工具范围

| 技能包 | 支持的 AI 工具 | 数量 |
|--------|----------------|------|
| **OpenSpec** | Claude Code、Cursor、Windsurf、Gemini CLI、OpenCode、Codex、GitHub Copilot、Cline、Continue、Trae 等 24+ 工具 | 最多 |
| **Spec-Kit** | Claude Code、Cursor、Windsurf、Gemini CLI、Codex、Copilot、Jules、Junie、Qoder、Kiro 等 24+ 工具 | 最多 |
| **Get Shit Done** | Claude Code、OpenCode、Gemini CLI、Codex、GitHub Copilot CLI、Cursor CLI、Antigravity | 7个 |
| **Superpowers** | Claude Code、Cursor、Codex、OpenCode、Gemini CLI | 5个 |

**关键差异**：
- **OpenSpec**：支持最广泛的工具（24+），适合团队混用不同 AI 工具的场景
- **Spec-Kit**：GitHub 官方开发，支持最广泛的工具（24+），宪法驱动的企业级方案
- **Superpowers**：专注主流工具，深度集成，功能最丰富
- **GSD**：平衡跨工具支持和易用性，独立开发者友好的轻量方案

### 2.3 核心定位对比

虽然三者都实现 SDD，但侧重点不同：

```
┌─────────────────────────────────────────────┐
│  OpenSpec                                   │
│  └─ 变更级 SDD                              │
│     每个功能变更独立管理                     │
│     强项：轻量灵活，24+ 工具支持             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Superpowers                                │
│  └─ 工作流驱动的 SDD                        │
│     完整开发流程 + 子代理执行                │
│     强项：14+ 技能组合，测试驱动             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Get Shit Done                              │
│  └─ 项目级 SDD 平台                         │
│     从零到一的完整项目管理                   │
│     强项：简洁高效，反企业剧场               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Spec-Kit                                   │
│  └─ 宪法级 SDD 平台                         │
│     GitHub 官方，宪法驱动开发                │
│     强项：企业级，扩展性强                   │
└─────────────────────────────────────────────┘
```

**定位差异**：
- **OpenSpec**：变更级管理（适合现有项目迭代）
- **Superpowers**：工作流管理（适合复杂开发流程）
- **GSD**：项目管理（适合新项目从零开始，个人/小团队）
- **Spec-Kit**：宪法级管理（适合企业级项目，正式团队流程）

---

## 三、OpenSpec：最纯粹的 SDD 实现

### 3.1 核心能力

OpenSpec 是 SDD 理念最纯粹的实现，专注于规范的**生成、持久化、共享和追溯**。

**安装方式：**
```bash
npm install -g @fission-ai/openspec
cd your-project
openspec init
```

安装后会根据你的 AI 工具生成对应的配置文件，支持 24+ AI 编程工具。

**核心命令：**
- `/opsx:propose` - 提出变更方案，生成规范文档
- `/opsx:explore` - 探索代码结构，分析现有实现
- `/opsx:apply` - 应用已批准的规范
- `/opsx:archive` - 归档完成的变更历史

### 3.2 解决的核心问题

**问题1：AI 临时决策，缺乏规划**
```
传统方式：
用户："帮我添加用户认证"
AI：直接生成代码（可能理解偏差）

OpenSpec 方式：
用户：/opsx:propose "添加用户认证功能"
AI：生成 proposal.md（需求分析）
AI：生成 design.md（设计方案）
AI：生成 tasks.md（实施步骤）
用户：审核规范文档
用户：/opsx:apply（按规范实施）
→ 决策有据可查，理解一致
```

**问题2：团队协作需求理解不一致**
```
场景：PM 提需求 → 开发实施 → 发现理解偏差

OpenSpec 解决：
1. PM：/opsx:propose 生成规范文档
2. 团队：共同审核 proposal.md、design.md
3. 所有人：对需求达成一致理解
4. 开发：/opsx:apply 按规范实施
→ 规范文档成为团队的"合同"
```

**问题3：大型项目缺少历史追溯**
```
传统方式：
做了什么修改？为什么这么改？
→ 只能查 Git commit message（信息有限）

OpenSpec 解决：
每个变更都有完整的：
- proposal.md（为什么改）
- design.md（怎么改的）
- tasks.md（具体步骤）
- archive/（归档历史）
→ 随时回溯决策过程
```

### 3.3 适用场景

✅ **推荐使用：**
- 正式项目开发（需要文档和规范）
- 团队协作（5人以上）
- 长期维护的项目（需要历史追溯）
- 跨工具团队（成员使用不同 AI 工具）
- 合规要求高的项目（需要审计记录）

❌ **不推荐使用：**
- 快速原型验证（流程太重）
- 个人学习项目（杀鸡用牛刀）
- 小型临时脚本（没必要文档化）

---

## 四、Superpowers：SDD + 工作流编排

### 4.1 核心能力

Superpowers 将 SDD 与完整的工作流编排结合，提供 14+ 个可组合的技能。

**SDD 实现**：
- 通过 `brainstorming` → `writing-plans` → `executing-plans` 实现 SDD 流程
- 规范文档在 `brainstorming` 和 `writing-plans` 阶段生成
- 但规范是临时的，不持久化到文件系统

**安装方式：**
```bash
npx skills add obra/superpowers
```

**核心技能组合：**

**计划阶段：**
- `brainstorming` - 多角度头脑风暴
- `writing-plans` - 编写详细计划
- `executing-plans` - 执行计划

**实施阶段：**
- `subagent-driven-development` - 启动子代理处理子任务
- `dispatching-parallel-workers` - 并行处理多个任务

**质量保证：**
- `code-review` - 代码审查
- `test-driven-development` - 测试驱动开发

### 5.2 解决的核心问题

**问题1：复杂任务无从下手**
```
场景：重构一个大型支付模块

传统方式：
用户："帮我重构支付模块"
AI：可能直接开始改某个文件（缺乏全局思考）

Superpowers 方式：
用户：/brainstorming "重构支付模块"
AI：分析现有架构（技术、业务、风险多角度）
用户：/writing-plans
AI：生成详细重构计划（分阶段、分模块）
用户：/executing-plans
AI：按计划逐步实施
→ 系统化思维，避免遗漏
```

**问题2：需要灵活编排工作流**
```
场景：不同项目需要不同的开发流程

Superpowers 灵活组合：
- 新功能开发：brainstorming → writing-plans → executing-plans
- Bug 修复：investigating → fixing
- 代码优化：code-review → refactoring
- 测试：test-driven-development

→ 像搭积木一样组合技能
```

**问题3：大型项目需要并行处理**
```
场景：同时重构多个独立模块

Superpowers 方式：
/dispatching-parallel-workers
→ 启动多个子代理
→ 每个子代理处理一个模块
→ 并行执行，提高效率
```

### 5.3 适用场景

✅ **推荐使用：**
- 复杂项目开发（需要多阶段流程）
- 中等规模团队（2-5人）
- 需要灵活定制工作流
- 探索性任务（需要多角度分析）
- 使用主流 AI 工具的团队

❌ **不推荐使用：**
- 简单脚本开发（太重了）
- 个人学习项目（学习成本高）
- 使用小众 AI 工具的团队（仅支持主流 5 个工具）

---

## 五、Spec-Kit：宪法驱动的 SDD 平台

### 5.1 核心能力

Spec-Kit 是 **GitHub 官方开发**的开源 SDD 工具包，采用"宪法驱动"理念。

**SDD 实现**：
- 通过 `/speckit.constitution` 创建项目宪法，定义项目原则和开发准则
- 7 阶段工作流：constitution → specify → clarify → plan → tasks → implement → analyze
- 规范持久化保存在 `.specify/` 目录
- 支持 24+ AI 编程工具

**安装方式：**
```bash
# 使用 Specify CLI 初始化项目
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify init my-project --ai claude

# 或在现有项目中初始化
specify init --here --ai claude
```

**核心工作流**：
- `/speckit.constitution` - 创建项目宪法和开发准则
- `/speckit.specify` - 定义需求（做什么和为什么）
- `/speckit.clarify` - 澄清不明确区域（可选）
- `/speckit.plan` - 创建技术实施计划
- `/speckit.tasks` - 生成可执行任务列表
- `/speckit.implement` - 执行任务
- `/speckit.analyze` - 跨制品一致性和覆盖分析（可选）

**宪法驱动理念**：
```
第一步：创建宪法（constitution）
→ 定义项目原则、代码质量标准、测试要求
→ 所有后续开发都基于这个"宪法"

后续阶段：
- specify：遵循宪法定义需求
- plan：基于宪法设计架构
- tasks：按照宪法分解任务
- implement：按宪法标准实施
```

**扩展系统**：
- **Extensions（扩展）**：添加新能力（如 Jira 集成、代码审查）
- **Presets（预设）**：自定义现有工作流（如敏捷、瀑布、领域驱动设计）
- **项目级覆盖**：临时调整单个项目

### 5.2 解决的核心问题

**问题1：项目原则不一致**

```
场景：团队开发到第 10 个阶段

传统方式：
"我们之前为什么选择 PostgreSQL？"
"这个模块为什么用 REST 而不是 GraphQL？"
→ 决策不一致，架构混乱

Spec-Kit 解决：
第一步创建宪法：
- 技术选型原则（PostgreSQL 优先、REST API）
- 代码质量标准（测试覆盖率 80%+）
- 性能要求（响应时间 < 200ms）

所有后续决策都基于宪法
→ 团队有统一的原则指导
```

**问题2：跨工具团队协作困难**

```
场景：团队成员使用不同的 AI 工具

传统方式：
成员A 用 Claude Code
成员B 用 Cursor
成员C 用 Windsurf
→ 工作流不统一，协作困难

Spec-Kit 解决：
支持 24+ AI 工具，统一的命令体系
→ 不同工具，相同工作流
→ 团队协作顺畅
```

**问题3：缺乏需求澄清机制**

```
场景：需求描述模糊

传统方式：
PM：需要一个搜索功能
AI：直接生成代码
→ 理解偏差，返工

Spec-Kit 解决：
/speckit.specify "搜索功能"
/speckit.clarify（澄清阶段）
AI：提问确认：
    - 全文搜索还是精确匹配？
    - 是否需要分页？
    - 搜索范围是什么？
→ 需求明确后再实施
```

### 5.3 与 GSD 的设计理念差异

**GSD 作者对 Spec-Kit 的批评**：

> "Other spec-driven development tools exist; BMAD, Speckit... But they all seem to make things way more complicated than they need to be (sprint ceremonies, story points, stakeholder syncs, retrospectives, Jira workflows) or lack real big picture understanding of what you're building."

**核心理念对比**：

| 维度 | Spec-Kit | GSD |
|------|----------|-----|
| **设计哲学** | 企业级，正式流程 | 简洁高效，反企业剧场 |
| **目标用户** | 企业团队 | 个人/小团队 |
| **工作流复杂度** | 7 阶段（完整） | 5 阶段（精简） |
| **宪法驱动** | ✅ 强制第一步创建宪法 | ❌ 无宪法概念 |
| **扩展性** | ✅ 扩展 + 预设系统 | ⚠️ 有限 |
| **澄清机制** | ✅ `/speckit.clarify` | ✅ `/gsd:discuss-phase` |
| **验证机制** | ✅ `/speckit.analyze` | ✅ `/gsd:verify-work` |

**用户反馈**：

> *"I've done SpecKit, OpenSpec and Taskmaster — this has produced the best results for me."*（用过 SpecKit、OpenSpec、Taskmaster，GSD 效果最好）
>
> *"Nothing over-engineered. Literally just gets shit done."*（没有过度工程，真的就是把事情做完）

**选择建议**：
- **选 Spec-Kit**：企业团队、需要正式流程、需要宪法级一致性
- **选 GSD**：个人/小团队、追求效率、反感复杂流程

### 5.4 适用场景

✅ **推荐使用：**
- 企业级项目开发
- 需要正式流程和文档的团队
- 混用多种 AI 工具的团队
- 需要高度定制工作流
- 需要项目级宪法指导

❌ **不推荐使用：**
- 个人项目（流程太重）
- 快速原型验证（流程太正式）
- 小团队敏捷开发（GSD 更合适）

---

## 六、Get Shit Done：项目级 SDD 平台

### 5.1 核心能力

GSD 是一个完整的**项目级 SDD 平台**，提供从需求分析到实施验证的全流程管理。

**SDD 实现**：
- 通过 `/gsd:new-project` 启动完整的项目初始化
- 规范持久化保存在 `.planning/` 目录
- 使用结构化文档（PROJECT.md、REQUIREMENTS.md、ROADMAP.md 等）
- 任务使用 XML 格式，结构化、可验证

**规范文件结构**：
```
.planning/
├── PROJECT.md          # 项目愿景，始终加载
├── REQUIREMENTS.md     # v1/v2 需求，分阶段追溯
├── ROADMAP.md          # 目标与进度
├── STATE.md            # 决策、阻碍、状态记忆
├── {phase}-CONTEXT.md  # 阶段特定上下文
└── {phase}-{N}-PLAN.md # 原子任务计划
```

**为什么是"项目级平台"**：
- OpenSpec：专注规范本身（变更级）
- Superpowers：专注工作流编排（任务级）
- GSD：完整项目管理（项目级），从零到一的全生命周期

**安装方式：**
```bash
npx gsd-build/get-shit-done
# 安装时会提示选择目标平台（支持 7 个工具）
```

支持一键安装到所有平台：`--all` 标志

**核心工作流**：
- `/gsd:new-project` - 新建项目，提问 → 研究 → 需求提取 → 创建路线图
- `/gsd:discuss-phase` - 讨论阶段细节
- `/gsd:plan-phase` - 生成阶段任务计划（XML 格式）
- `/gsd:execute-phase` - 执行任务
- `/gsd:verify-work` - 验证完成情况

**安装方式：**
```bash
npx gsd-build/get-shit-done
# 安装时会提示选择目标平台（支持 7 个工具）
```

支持一键安装到所有平台：`--all` 标志

### 5.2 解决的核心问题

**问题1：新项目从零开始的混乱**
```
场景：启动一个新项目

传统方式：
用户："帮我做一个博客系统"
AI：直接开始写代码
    → 缺少需求分析
    → 没有明确 v1/v2 范围
    → 缺少项目规划

GSD 方式：
用户：/gsd:new-project "博客系统"
AI：提问阶段 → 深入理解需求（目标、约束、技术偏好、边界情况）
AI：研究阶段 → 并行调研技术方案
AI：需求提取 → 明确 v1/v2/out-of-scope
AI：创建路线图 → 分阶段实施计划
→ 完整的项目规划文档
```

**问题2：项目状态和决策容易遗忘**
```
场景：项目开发到第 10 个阶段

传统方式：
"我们之前为什么选择 PostgreSQL？"
"第 3 个阶段做了什么？"
→ 需要翻阅大量对话历史

GSD 解决：
所有决策记录在 STATE.md：
- 技术选型及原因
- 遇到的阻碍和解决方案
- 当前项目状态
→ 随时查看，跨会话记忆
```

**问题3：缺少验证标准的任务执行**
```
场景：实现一个功能

传统方式：
AI："我实现了登录功能"
→ 缺少验证标准
→ 可能没有真正完成

GSD 解决：
任务使用 XML 格式，包含验证标准：
<task type="auto">
  <name>Create login endpoint</name>
  <files>src/app/api/auth/login/route.ts</files>
  <verify>curl -X POST localhost:3000/api/auth/login returns 200</verify>
  <done>Valid credentials return cookie, invalid return 401</done>
</task>
→ 明确的完成定义，可自动验证
```

### 5.3 适用场景

✅ **推荐使用：**
- 新项目启动（从零到一）
- 需要完整项目管理的团队
- 中长期项目（多个阶段迭代）
- 需要跨会话状态记忆的项目
- 使用多个 AI 工具的团队（支持 7 个工具）

❌ **不推荐使用：**
- 简单脚本开发（太重了）
- 小改动、bug 修复（不需要完整项目管理）
- 临时原型验证（流程太正式）

---

## 七、对比分析与选型指南

### 7.1 核心维度对比

| 维度 | OpenSpec | Superpowers | Get Shit Done | Spec-Kit |
|------|----------|-------------|---------------|----------|
| **SDD 层级** | 变更级 | 工作流级 | 项目级 | 宪法级 |
| **开发方** | 社区 | 社区 | 独立开发者 | GitHub 官方 |
| **规范持久化** | ✅ 文件系统（`openspec/changes/`） | ✅ 设计文档保存 | ✅ 完整目录结构（`.planning/`） | ✅ 完整目录结构（`.specify/`） |
| **学习曲线** | 中等 | 陡峭（14+技能） | 中等（5个核心命令） | 中等（7个核心命令） |
| **跨工具支持** | ✅ 最强（24+工具） | ⚠️ 中（5个工具） | ✅ 强（7个工具） | ✅ 最强（24+工具） |
| **团队协作** | ✅ 强（变更可共享） | ⚠️ 中（需对齐） | ✅ 强（完整项目文档） | ✅ 强（宪法驱动） |
| **工作流灵活性** | ⚠️ 中（三步流程） | ✅ 强（自由组合） | ⚠️ 中（固定流程） | ✅ 强（扩展+预设） |
| **验证机制** | ⚠️ 手动验证 | ✅ 两阶段审查 + TDD | ✅ XML 验证标准 | ✅ 跨制品分析 |
| **宪法驱动** | ❌ | ❌ | ❌ | ✅ 核心特性 |
| **扩展性** | ⚠️ 中 | ⚠️ 中 | ⚠️ 低 | ✅ 高（扩展+预设） |
| **适合场景** | 现有项目迭代 | 复杂开发流程 | 新项目从零开始，个人/小团队 | 企业级项目，正式团队流程 |

### 7.2 根据项目类型选型

#### 现有项目迭代

**推荐：OpenSpec**

**理由：**
- 变更级管理，适合增量开发
- 每个功能变更独立管理
- 不影响现有项目结构
- 支持 24+ 工具，团队可混用

**场景示例：**
```
现有项目：给博客添加评论功能
→ /opsx:propose "添加评论功能"
→ 生成规范文档（proposal.md、design.md、tasks.md）
→ 团队审核规范
→ /opsx:apply 按规范实施
→ /opsx:archive 归档变更历史
```

#### 新项目从零开始

**根据团队规模选择：**

**个人/小团队（1-5人）→ Get Shit Done**

**理由：**
- 项目级管理，从零到一的全生命周期
- 简洁高效，不搞企业剧场
- STATE.md 记录所有决策，跨会话记忆
- XML 任务格式，明确的验证标准

**场景示例：**
```
新项目：开发一个电商平台
→ /gsd:new-project "电商平台"
→ AI 提问阶段 → 深入理解需求
→ 研究阶段 → 并行调研技术方案
→ 需求提取 → v1/v2/out-of-scope
→ 创建路线图 → 10 个阶段规划
→ 完整的项目管理文档
```

**企业团队（5人以上）→ Spec-Kit**

**理由：**
- 宪法驱动，项目级一致性
- GitHub 官方支持，成熟稳定
- 支持 24+ AI 工具，团队可混用
- 完善的扩展和预设系统

**场景示例：**
```
新项目：企业级电商平台
→ /speckit.constitution 创建宪法（技术选型、质量标准）
→ /speckit.specify 定义需求
→ /speckit.clarify 澄清细节
→ /speckit.plan 制定计划
→ /speckit.tasks 分解任务
→ /speckit.implement 实施
→ /speckit.analyze 分析一致性
```

#### 复杂开发流程

**推荐：Superpowers**

**理由：**
- 14+ 技能灵活组合
- 完整工作流：brainstorming → planning → execution
- 子代理驱动开发，两阶段审查
- 强制测试驱动开发

**场景示例：**
```
复杂任务：重构支付系统
→ /brainstorming 分析支付系统架构
→ /writing-plans 制定详细重构计划
→ /subagent-driven-development 启动多个子代理
→ 子代理1：重构支付宝接口
→ 子代理2：重构微信支付接口
→ 两阶段审查确保质量
```

### 7.3 根据团队规模选型

#### 个人开发者

**根据项目类型选择**：
- 现有项目迭代 → **OpenSpec**（轻量灵活）
- 新项目从零开始 → **GSD**（简洁高效）
- 复杂功能开发 → **Superpowers**（工作流编排）

#### 小团队（2-5人）

**根据工作风格选择：**

**追求效率 → GSD**
- 快速迭代
- 简洁工作流
- 反企业剧场

**需要灵活编排 → Superpowers**
- 复杂开发流程
- 团队成员使用相同 AI 工具
- 需要多角度分析

**工具混用 → OpenSpec**
- 团队成员使用不同 AI 工具
- 需要正式的变更文档
- 现有项目的增量开发

#### 中大型团队（5人以上）

**企业级项目 → Spec-Kit**
- 需要正式流程和文档
- 宪法驱动的一致性
- 支持 24+ AI 工具混用
- 完善的扩展和预设系统

**现有项目迭代 → OpenSpec**
- 现有大型项目的迭代
- 团队成员使用不同 AI 工具
- 需要变更级管理和追溯

**新项目从零开始 → GSD 或 Spec-Kit**
- GSD：敏捷团队，追求效率
- Spec-Kit：企业团队，需要正式流程

### 7.4 能否同时使用？

**答案：可以，但需谨慎。**

```
✓ 技术上可行：
- 可以安装多个技能包
- 不同场景使用不同技能

⚠️ 注意事项：
- 命令可能冲突（都有类似 /plan 的命令）
- 学习成本增加
- 可能造成混乱

💡 推荐做法：
主用 1 个 + 辅助其他场景

例如：
方案1：主用 OpenSpec（正式开发） + 偶尔用 GSD（快速实验）
方案2：主用 Superpowers（复杂任务） + OpenSpec（需要文档时）
方案3：主用 Spec-Kit（企业项目） + GSD（个人项目）
```

---

## 八、实际案例对比

### 案例：重构支付模块 - 四种 SDD 实现

#### OpenSpec 方式：最严格的 SDD 实现

```bash
# 1. 提出变更方案
/opsx:propose "重构支付模块，解耦第三方支付接口"

# AI 生成文档：
- openspec/changes/payment-refactor/proposal.md
  （为什么改、改什么、影响范围）
- openspec/changes/payment-refactor/design.md
  （架构设计、接口设计、风险分析）
- openspec/changes/payment-refactor/tasks.md
  （分步骤实施计划）

# 2. 团队审核
团队成员：查看 design.md，提出修改意见
PM：确认需求范围
Tech Lead：确认技术方案

# 3. 应用规范
/opsx:apply
AI：按 tasks.md 分步实施

# 4. 归档
/opsx:archive
保存完整决策历史
```

**特点**：
- ✅ 变更级 SDD 实现（规范先行，独立文档）
- ✅ 规范持久化到文件系统，可归档追溯
- ✅ 团队可共享审核
- ✅ 轻量灵活，适合增量开发

#### Superpowers 方式：SDD + 工作流编排

```bash
# 1. 头脑风暴
/brainstorming "支付模块重构方案"
AI：从技术、业务、风险多角度分析

# 2. 编写计划
/writing-plans
AI：生成详细重构计划（3个阶段、每个阶段的具体步骤）

# 3. 执行计划
/executing-plans
AI：按计划逐步实施
AI：遇到问题自动调整

# 或使用子代理并行处理
/subagent-driven-development
AI：启动多个子代理
- 子代理1：处理支付宝接口
- 子代理2：处理微信支付接口
- 子代理3：处理订单系统
```

**特点**：
- ✅ 工作流级 SDD（规范在工作流中生成并保存）
- ✅ 14+ 技能灵活组合
- ✅ 子代理驱动 + 两阶段审查 + TDD
- ✅ 系统化、适合复杂开发流程

#### Get Shit Done 方式：项目级 SDD 平台

```bash
# 1. 初始化项目（如果是从零开始）
/gsd:new-project "支付模块重构"

AI：提问阶段
  Q: 重构的目标是什么？
  Q: 需要支持哪些支付渠道？
  Q: 有什么技术约束？

AI：研究阶段 → 并行调研多种方案
AI：需求提取 → v1: 支付宝/微信，v2: 银联，out-of-scope: 国际支付
AI：创建路线图 → 分 5 个阶段实施

# 2. 讨论阶段
/gsd:discuss-phase
AI：细化阶段 1 的实施细节

# 3. 生成任务计划
/gsd:plan-phase
AI：生成 XML 格式任务：
<task type="auto">
  <name>解耦支付宝支付</name>
  <files>src/payment/alipay.ts</files>
  <verify>npm test 支付宝测试通过</verify>
  <done>支付成功返回订单号，失败返回错误信息</done>
</task>

# 4. 执行任务
/gsd:execute-phase
AI：执行任务并验证

# 5. 验证工作
/gsd:verify-work
AI：运行验证标准，确认完成
```

**特点**：
- ✅ 项目级 SDD 平台（完整生命周期管理）
- ✅ 规范持久化到 `.planning/` 目录
- ✅ STATE.md 记录所有决策，跨会话记忆
- ✅ XML 任务格式，明确的验证标准

#### Spec-Kit 方式：宪法驱动的企业级 SDD

```bash
# 1. 创建项目宪法
/speckit.constitution "支付模块重构原则"

# AI 生成宪法文档：
- .specify/CONSTITUTION.md
  （技术选型原则：第三方支付解耦、接口抽象）
  （代码质量标准：测试覆盖率 80%+、接口文档完整）
  （性能要求：支付响应时间 < 3s，幂等性保证）

# 2. 定义需求
/speckit.specify "重构支付模块，解耦第三方支付接口"

# AI 生成文档：
- .specify/features/payment-refactor/SPEC.md
  （需求描述：解耦支付宝、微信支付）
  （用户故事：作为商家，我需要支持多种支付方式）

# 3. 澄清细节（可选但推荐）
/speckit.clarify

# AI 提问：
  Q: 需要支持哪些支付渠道？
  Q: 是否需要支付回调机制？
  Q: 事务一致性要求？
  Q: 如何处理支付失败重试？

# 4. 制定技术计划
/speckit.plan "使用策略模式重构"

# AI 生成文档：
- .specify/features/payment-refactor/PLAN.md
  （架构设计：策略模式、支付接口抽象）
  （接口定义：PaymentStrategy、PaymentResult）
  （风险评估：第三方依赖、事务一致性）

# 5. 分解任务
/speckit.tasks

# AI 生成文档：
- .specify/features/payment-refactor/TASKS.md
  （任务1：创建支付策略接口）
  （任务2：实现支付宝适配器）
  （任务3：实现微信支付适配器）
  （任务4：迁移现有支付代码）
  （任务5：编写单元测试）

# 6. 实施
/speckit.implement

# AI 执行：
按任务逐步实施，每个任务完成后验证
- 创建 src/payment/PaymentStrategy.ts
- 实现 src/payment/AlipayAdapter.ts
- 实现 src/payment/WechatAdapter.ts
- 更新现有代码使用新接口

# 7. 分析一致性（可选）
/speckit.analyze

# AI 检查：
- 实施是否符合宪法原则？✅
- 测试覆盖率是否达标？✅ 85%
- 接口文档是否完整？✅
- 性能是否满足要求？✅ 平均响应时间 1.2s
```

**特点**：
- ✅ 宪法级 SDD（项目原则一致性，第一步定义宪法）
- ✅ GitHub 官方支持，成熟稳定
- ✅ 7 阶段工作流，最完整（constitution → specify → clarify → plan → tasks → implement → analyze）
- ✅ 扩展 + 预设系统，高度可定制
- ✅ 支持 24+ AI 工具，跨工具协作
- ✅ 可选的澄清和分析阶段，确保质量

---

## 九、选型决策树

基于项目类型和团队规模的 SDD 工具选择：

```
开始选型：你需要什么样的 SDD 实现？
 │
 ├─ 项目类型？
 │   ├─ 现有项目迭代 → OpenSpec
 │   │   （变更级管理，轻量灵活）
 │   │
 │   ├─ 新项目从零开始 → 团队规模？
 │   │   ├─ 个人/小团队（1-5人）→ GSD
 │   │   │   （项目级管理，简洁高效）
 │   │   │
 │   │   └─ 企业团队（5人+）→ Spec-Kit
 │   │       （宪法级管理，正式流程）
 │   │
 │   └─ 复杂开发流程 → Superpowers
 │       （工作流级管理，技能组合）
 │
 └─ 特殊需求？
     ├─ 团队使用不同 AI 工具 → OpenSpec 或 Spec-Kit
     │   （支持 24+ 工具）
     │
     ├─ 需要强测试驱动 → Superpowers
     │   （强制 RED-GREEN-REFACTOR）
     │
     ├─ 需要跨会话状态记忆 → GSD
     │   （STATE.md 记录所有决策）
     │
     └─ 需要宪法级一致性 → Spec-Kit
         （宪法驱动，项目原则统一）
```

**关键决策点**：
1. **项目类型**：现有项目迭代 vs 新项目 vs 复杂流程
2. **团队规模**：个人/小团队 vs 企业团队
3. **跨工具支持**：团队成员使用的 AI 工具是否一致？
4. **验证需求**：是否需要强制测试驱动或自动验证？
5. **一致性要求**：是否需要宪法级项目原则？

---

## 十、总结

### 核心观点

1. **SDD 是核心，工具是手段**：
   - SDD（规范驱动开发）解决的是 AI 编程时代的根本问题
   - 四个工具都是 SDD 的不同实现方式
   - 选择工具 = 选择 SDD 的实现层级

2. **实现层级的差异**：
   - **OpenSpec**：变更级 SDD，适合现有项目迭代，跨工具支持最广（24+）
   - **Superpowers**：工作流级 SDD，适合复杂开发流程，技能组合最灵活（14+）
   - **Get Shit Done**：项目级 SDD 平台，适合新项目从零开始，个人/小团队首选
   - **Spec-Kit**：宪法级 SDD 平台，GitHub 官方，企业级项目首选

3. **没有最好的工具，只有最合适的工具**：
   - 现有项目迭代 → OpenSpec（轻量灵活）
   - 新项目（个人/小团队）→ GSD（简洁高效）
   - 新项目（企业团队）→ Spec-Kit（宪法驱动）
   - 复杂开发流程 → Superpowers（工作流编排）

4. **Spec-Kit vs GSD 的理念差异**：
   - **Spec-Kit**：企业级，正式流程，宪法驱动
   - **GSD**：简洁高效，反企业剧场，独立开发者友好
   - 根据团队文化选择合适的工具

### 推荐方案

```
现有项目迭代 → OpenSpec
  ↓ 变更级管理，不影响现有结构

新项目从零开始 → 根据团队规模
  ├─ 个人/小团队 → Get Shit Done
  │   ↓ 项目级管理，简洁高效
  │
  └─ 企业团队 → Spec-Kit
      ↓ 宪法级管理，正式流程

复杂开发流程 → Superpowers
  ↓ 工作流级管理，技能灵活组合

跨工具团队 → OpenSpec 或 Spec-Kit
  ↓ 支持 24+ 工具，最广泛
```

### SDD 实践建议

1. **先理解 SDD 理念**：工具只是手段，理念才是核心
2. **从简单开始**：个人项目用 GSD，熟悉 SDD 流程
3. **考虑团队规模**：团队越大，越需要正式的规范管理
4. **考虑工具生态**：团队成员使用的 AI 工具是否一致
5. **可以组合使用**：主用 1 个，特定场景辅助其他
6. **持续优化规范**：SDD 是迭代过程，规范要不断完善

### 下一步行动

**如果你有现有项目需要迭代**：
```
1. 安装 OpenSpec：npm install -g @fission-ai/openspec
2. 在项目中运行：openspec init
3. 尝试一个功能变更：/opsx:propose "添加新功能"
4. 体验变更级 SDD 流程
```

**如果你要启动一个新项目（个人/小团队）**：
```
1. 安装 GSD：npx gsd-build/get-shit-done
2. 运行：/gsd:new-project "项目描述"
3. 完成提问 → 研究 → 需求提取 → 创建路线图
4. 体验项目级 SDD 平台
```

**如果你要启动一个企业级项目**：
```
1. 安装 Specify CLI：uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
2. 初始化项目：specify init my-project --ai claude
3. 创建宪法：/speckit.constitution "项目原则"
4. 运行工作流：/speckit.specify → /speckit.plan → /speckit.tasks → /speckit.implement
5. 体验宪法级 SDD 平台
```

**如果你需要复杂开发流程**：
```
1. 安装 Superpowers：npx skills add obra/superpowers
2. 尝试工作流：/brainstorming → /writing-plans → /executing-plans
3. 体验子代理驱动的开发过程
4. 感受测试驱动开发的强制约束
```

**SDD 不只是一个方法论，更是 AI 编程时代的新范式**。根据项目类型和团队规模选择合适的工具，让你的团队拥抱 SDD，提升开发效率和代码质量。

---

## 参考资料

- [OpenSpec GitHub](https://github.com/fission-ai/openspec) - 支持 24+ AI 工具
- [Superpowers GitHub](https://github.com/obra/superpowers) - 102k+ stars，支持 5 个主流工具
- [Get Shit Done GitHub](https://github.com/gsd-build/get-shit-done) - 支持 7 个工具，独立开发者友好
- [Spec-Kit GitHub](https://github.com/github/spec-kit) - GitHub 官方，支持 24+ 工具，企业级
- [Claude Code 官方文档](https://docs.anthropic.com/en/docs/claude-code)
- [AI Agent Skills 生态](https://skills.sh/)