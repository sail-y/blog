---
title: "Claude Code 教程：从入门到精通"
date: 2026-03-20 22:38:00
tags: [AI, Claude Code, 编程工具]
categories: AI工具
description: 本文讲解相关技术要点和实践经验。
---

# Claude Code 完整教程：从入门到精通

> 本教程整合了 Claude Code 的核心功能、隐藏技巧、终端美化以及项目实战经验，助你快速掌握这款革命性的 AI 编程工具。

---


## 一、Claude Code 是什么

### 1.1 核心定位

Claude Code 本质上是一个运行在终端里的 **AI 编程代理**。你可以把它理解为：

> 一个懂代码的同事坐在你旁边，你说需求，他直接改文件

它能读你的项目代码、执行 shell 命令、操作 Git，甚至帮你做 Code Review。
<!--more-->
### 1.2 与 Cursor / Trae 的对比

| 特性 | Cursor | Trae | Claude Code |
|------|--------|------|-------------|
| **运行环境** | GUI 编辑器（VS Code 改造） | GUI 编辑器（AI IDE） | 终端 CLI |
| **最新版本** | Cursor 4.x（2025-2026） | Trae 2026（国内/海外版） | Claude Code 1.x |
| **工作模式** | Chat + Agent + Plan 模式 | Chat + Agent + 内置工具链 | 纯 Agent（任务驱动） |
| **上下文理解** | 200K+ token | 200K+ token | 整个项目（200K+ token） |
| **操作能力** | 改文件、终端命令、Agent 操作 | 改文件、内置工具链、MCP | 改文件、跑命令、操作 Git、MCP 扩展 |
| **模型选择** | Claude 3.5/3.7 + GPT-4o/o1 | Claude + GPT + 豆包 + DeepSeek | Claude 系列 + 多提供商路由 |
| **价格** | 免费版 + Pro（$19/月） | 免费版 + Pro | 免费版（需 API Key） |
| **扩展性** | 插件系统 + Rules | 插件系统 + MCP | MCP 协议、Skills、Hooks |
| **远程开发** | VS Code Remote | 内置支持 | /remote-control 远程操控 |
| **适合场景** | 偏好 GUI、可视化操作 | 国内用户、中文优化、全栈开发 | 喜欢终端、追求效率、自动化 |

**选型建议**：
- **Cursor**：适合习惯 VS Code 工作流、需要可视化界面、追求成熟生态的开发者
- **Trae**：适合国内用户、对中文交互有要求、需要免费 AI IDE 的开发者
- **Claude Code**：适合喜欢终端操作、追求极致效率、需要高度自动化的开发者

### 1.3 Agentic 能力深度对比：Claude Code 的独特优势

Claude Code 与 Cursor、Trae 的核心差异在于其 **Agentic 架构设计**。本节从编程能力的角度深入对比三者。

#### 1.3.1 Tools（工具系统）

| 工具类型 | Claude Code | Cursor | Trae |
|---------|------------|--------|------|
| **文件操作** | Read, Write, Edit, Glob（文件搜索）, Grep（内容搜索） | 文件编辑、查看 | 文件编辑、查看 |
| **命令执行** | Bash（完整 Shell 环境） | 终端集成（有限） | 终端集成（有限） |
| **Git 操作** | 原生 Git 工具链支持 | 基础 Git 集成 | 基础 Git 集成 |
| **浏览器自动化** | 通过 MCP 实现（Chrome DevTools） | 无 | 无 |
| **数据库操作** | 通过 MCP 实现（PostgreSQL 等） | 无原生支持 | 无原生支持 |
| **网络请求** | WebFetch, WebSearch, fetch MCP | 无原生支持 | 无原生支持 |
| **代码执行** | NotebookEdit（Jupyter 支持） | 无 | 无 |

**关键差异**：
- **Claude Code** 拥有完整的编程工具链，可以像真正的工程师一样操作文件系统、执行命令、操作 Git
- **Cursor/Trae** 主要依赖 GUI 操作，工具链被编辑器环境限制，无法像 Claude Code 那样自由执行系统级命令

#### 1.3.2 Skills（技能系统）

| 特性 | Claude Code | Cursor | Trae |
|------|------------|--------|------|
| **技能定义** | `.claude/skills/` 目录，可定义代理行为规则 | ✅ 支持 | ✅ 支持 |
| **内置 Skills** | code-review, simplify, loop, commit 等 | 内置类似功能 | 内置类似功能 |
| **权限控制** | 可精细控制每个技能的工具权限 | 支持 | 支持 |
| **触发机制** | 自动识别 + 斜杠命令调用 | 支持 | 支持 |

**说明**：Skills 是 Anthropic 发明的机制，现已逐步被其他 IDE 采纳支持。

#### 1.3.3 MCP（Model Context Protocol）扩展能力

MCP 是一个开放的协议标准，Claude Code、Cursor、Trae 等现代 AI IDE 都支持。

| MCP 能力 | Claude Code | Cursor | Trae |
|----------|------------|--------|------|
| **MCP 支持** | ✅ 完整支持 | ✅ 完整支持 | ✅ 支持 |
| **文件系统** | ✅ `@anthropic-ai/mcp-server-filesystem` | ✅ 支持 | ✅ 支持 |
| **数据库** | ✅ PostgreSQL, MySQL, SQLite | ✅ 通过 MCP 支持 | ✅ 通过 MCP 支持 |
| **浏览器控制** | ✅ Chrome DevTools Protocol | ✅ 通过 MCP 支持 | ✅ 通过 MCP 支持 |
| **GitHub/GitLab** | ✅ GitHub MCP Server | ✅ 支持 | ✅ 支持 |
| **自定义 MCP** | ✅ 可开发自己的 MCP Server | ✅ 支持 | ✅ 支持 |

**注意**：MCP 是开放协议，所有支持 MCP 的 IDE 都能使用这些扩展能力。

#### 1.3.4 Agent & Subagent（代理与子代理）

这是 Claude Code 与其他工具最本质的架构差异。

**Claude Code 的多级代理架构**：

```
Main Agent (主代理)
    ├── Explore Agent (代码探索)
    ├── Plan Agent (规划设计)
    ├── Executor Agent (任务执行)
    ├── Debugger Agent (调试分析)
    ├── Quality Reviewer (质量审查)
    └── ... (可扩展更多子代理)
```

| 代理能力 | Claude Code | Cursor | Trae |
|---------|------------|--------|------|
| **子代理类型** | 10+ 种专用代理（Explore, Plan, Executor, Debugger, Architect 等） | 无子代理概念 | 无子代理概念 |
| **并行执行** | ✅ 多个 Agent 并行工作（如 `/simplify` 启动 3 个并行审查） | ❌ 单线程 | ❌ 单线程 |
| **模型选择** | 每个子代理可独立选择模型（Sonnet/Opus/Haiku） | 固定模型 | 固定模型 |
| **上下文隔离** | ✅ 子代理独立上下文，不污染主对话 | ❌ | ❌ |
| **任务委托** | ✅ 主代理可将复杂任务委托给专用子代理 | ❌ | ❌ |

**实际案例**：
- `/simplify` 命令启动 3 个并行 Agent 分别审查代码复用、质量、效率
- 复杂 Bug 可委托 Debugger Agent 分析，不影响主对话上下文
- 大型重构先让 Plan Agent 规划，再让 Executor Agent 执行

**Cursor 的 Agent 模式**：
- Cursor 的 "Agent" 本质是**自动化执行器**，而非真正的多代理系统
- Cursor Cloud Agents 可以在云端并行运行任务，但缺乏 Claude Code 那样的专用子代理分工
- 无法像 Claude Code 那样精细控制每个 Agent 的模型、权限、工具集

#### 1.3.5 Teams（团队协作）

Claude Code 独有的多代理协作系统，让多个 AI Agent 像团队一样协同工作。

| Teams 能力 | Claude Code | Cursor | Trae |
|-----------|------------|--------|------|
| **团队创建** | ✅ TeamCreate 创建多代理团队 | ❌ | ❌ |
| **任务分配** | ✅ 通过 TaskUpdate 分配任务给不同 Agent | ❌ | ❌ |
| **消息传递** | ✅ SendMessage 实现代理间通信 | ❌ | ❌ |
| **工作协调** | ✅ 共享任务列表、依赖管理 | ❌ | ❌ |
| **团队解散** | ✅ TeamDelete 清理团队资源 | ❌ | ❌ |

**使用场景**：
- **全栈开发**：一个 Agent 负责前端，另一个负责后端，第三个负责测试
- **代码审查**：一个 Agent 写代码，另一个 Agent 做安全审查，第三个做性能优化
- **研究项目**：一个 Agent 搜索资料，另一个整理文档，第三个生成代码

**这是 Claude Code 独有的能力，Cursor 和 Trae 完全没有类似的多代理协作机制。**

#### 1.3.6 其他 Agentic 能力对比

| 能力 | Claude Code | Cursor | Trae |
|------|------------|--------|------|
| **Plan 模式** | ✅ 深度规划模式，支持复杂任务分解、EnterPlanMode 工具 | ⚠️ Chat 模式可询问，但无专用 Plan 模式 | ⚠️ 类似 Cursor |
| **Hooks 钩子** | ✅ 在工具调用前后插入自定义脚本 | ❌ | ❌ |
| **Commands 自定义命令** | ✅ `.claude/commands/` 封装工作流 | ⚠️ 有 Snippets，但非命令级 | ⚠️ 类似 |
| **Auto Memory** | ✅ 自动记忆项目约定、用户偏好 | ⚠️ 上下文记忆，但无持久化文件 | ⚠️ 类似 |
| **Worktrees 并行工作** | ✅ Git Worktrees 支持多会话并行 | ❌ | ❌ |
| **Remote Control** | ✅ `/remote-control` 手机远程操控 | ⚠️ 有移动端 App，但功能有限 | ❌ |
| **Cron 定时任务** | ✅ `/loop` 和 CronCreate 定时执行 | ❌ | ❌ |
| **对话分叉** | ✅ `/branch` 创建平行对话分支 | ❌ | ❌ |
| **时光回溯** | ✅ `/rewind` 回退代码或对话 | ⚠️ Git 回退 | ⚠️ Git 回退 |
| **并行提问** | ✅ `/btw` 不打断主任务的旁注提问 | ❌ | ❌ |

#### 1.3.7 架构对比总结

**Claude Code 的独有优势**：
1. **Teams 多代理协作**：TeamCreate/TaskUpdate/SendMessage，让多个 Agent 像团队一样协同工作（Cursor/Trae 无此功能）
2. **Subagent 架构**：专用的 Explore/Plan/Executor/Debugger 等子代理，每个可独立配置模型和权限
3. **终端 CLI 环境**：完整的 Bash Shell 能力，不受 GUI 环境限制（Cursor/Trae 是 GUI 应用）
4. **Hooks 钩子机制**：PreToolUse/PostToolUse 等事件钩子，实现自动化工作流
5. **高级对话管理**：`/branch` 对话分叉、`/btw` 并行提问、`/rewind` 时光回溯等独特命令

**三方都支持的能力**：
- ✅ MCP（Model Context Protocol）扩展
- ✅ Skills 技能系统
- ✅ 文件操作、Git 集成、代码补全等基础功能

**Cursor 的优势**：
- **GUI 编辑器**：VS Code 基础上的可视化操作体验
- **Cloud Agents**：云端并行执行任务
- **成熟生态**：插件系统、团队协作功能完善
- **Tab 模型**：高速精准的代码补全

**Trae 的优势**：
- **国内用户友好**：中文优化、免费 AI IDE
- **多模型支持**：Claude + GPT + 豆包 + DeepSeek
- **成本优势**：适合对成本敏感的开发者

**选择建议**：
- 如果你需要 **多代理协作（Teams）** 或 **终端 CLI 工作流**，选择 **Claude Code**
- 如果你更习惯 **GUI 操作** 或需要 **成熟的团队协作功能**，选择 **Cursor**
- 如果你是 **国内开发者**，对 **中文交互和成本敏感**，选择 **Trae**

### 1.4 核心能力

- **项目级全局视野**：一次性"阅读"项目中成百上千个文件
- **自然语言交互**：用中文/英文描述需求即可
- **强大实操能力**：直接修改代码、执行命令、操作版本控制

---

## 二、安装与环境配置

### 2.1 系统要求

| 平台 | 要求 |
|------|------|
| **Windows** | Windows 10/11，PowerShell 5.1+ 或 PowerShell 7+ |
| **macOS** | macOS 10.15 (Catalina) 或更高版本 |
| **Linux** | Ubuntu 18.04+, Debian 10+, CentOS 7+, Fedora 30+ |

**必需软件**：
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器
- Git（推荐）

### 2.2 安装 Node.js

#### Windows 安装 Node.js

**方式一：使用 winget（推荐）**

```powershell
# 安装 Node.js LTS 版本
winget install OpenJS.NodeJS.LTS

# 或安装最新版本
winget install OpenJS.NodeJS
```

**方式二：使用官方安装包**

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS（长期支持）版本
3. 运行安装程序，一路下一步即可

**方式三：使用 nvm-windows（开发者推荐）**

```powershell
# 安装 nvm-windows
winget install CoreyButler.NVMforWindows

# 安装完成后，在新的终端窗口中执行
nvm install lts
nvm use lts
```

#### macOS 安装 Node.js

```bash
# 使用 Homebrew 安装
brew install node

# 或使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc
nvm install --lts
nvm use --lts
```

#### Linux 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

### 2.3 安装 Claude Code

#### 方式一：npm 全局安装（推荐）

```bash
# 全局安装 Claude Code
npm install -g @anthropic-ai/claude-code

# 验证安装
claude --version
```

#### 方式二：使用 npx（无需安装）

```bash
# 直接运行，无需全局安装
npx @anthropic-ai/claude-code
```

#### 方式三：使用 Homebrew（macOS）

```bash
brew tap anthropics/claude-code
brew install claude-code
```

### 2.4 首次运行与认证

```bash
# 启动 Claude Code
claude

# 首次启动会提示登录
# 按照提示访问 https://console.anthropic.com/ 获取 API Key
```

### 2.5 环境变量配置

Claude Code 支持通过环境变量进行配置：

```bash
# 设置 API Key（可选，也可在运行时登录）
export ANTHROPIC_API_KEY="your-api-key-here"

# 设置代理（如需要）
export HTTPS_PROXY="http://127.0.0.1:7890"

# 设置自定义 API 端点（如使用代理服务）
export ANTHROPIC_BASE_URL="https://your-proxy-server.com"
```

Windows PowerShell 环境变量设置：

```powershell
# 临时设置（当前会话）
$env:ANTHROPIC_API_KEY = "your-api-key-here"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"

# 永久设置（用户环境变量）
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your-api-key-here", "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://127.0.0.1:7890", "User")
```

### 2.6 验证安装

```bash
# 检查版本
claude --version

# 启动 Claude Code
claude

# 进入后测试
> 你好，请介绍一下你自己
```

---

## 三、斜杠命令全解析

### 3.1 高频命令（每天都会用）

| 命令 | 用途 | 使用场景 |
|------|------|----------|
| `/help` | 查看帮助信息 | 忘记某个功能时随手查 |
| `/model` | 切换模型 | 简单任务切小模型省 token |
| `/cost` | 查看本次会话费用 | 每次结束前看看花了多少钱 |
| `/memory` | 编辑记忆文件 | 让 AI 记住项目的约定和偏好 |
| `/clear` | 清空当前对话 | 开始新任务时重置上下文 |

### 3.2 项目级命令

| 命令 | 用途 | 说明 |
|------|------|------|
| `/init` | 初始化项目配置 | 生成 CLAUDE.md，相当于给 AI 写项目说明书 |
| `/config` | 修改配置 | 调整权限、行为偏好等 |
| `/mcp` | 管理 MCP 服务器 | 接入外部工具和数据源 |

**重要提示**：第一次打开一个新项目，先跑 `/init`。它会扫描你的代码库，自动生成一份项目描述文件。后续 AI 理解你的代码会准确得多。

### 3.3 进阶命令

| 命令 | 用途 |
|------|------|
| `/review` | 让 AI 做 Code Review |
| `/compact` | 压缩对话历史，释放上下文空间 |

---

## 四、键盘快捷键速查表

### 4.1 核心快捷键

```
Ctrl + C      → 打断当前 AI 的执行（跑偏了赶紧刹车）
Ctrl + O      → 切换详细输出模式（看 AI 的思考过程）
Shift + Tab   → 切换权限模式（信任模式 vs 确认模式）
Esc + Esc     → 撤销上一次文件改动（改坏了一键回退）
```

**救命键 Esc + Esc**：有一次 AI 帮我重构一个文件，改完发现逻辑不对，双击 Esc 直接回退，比 Git 操作快多了。

### 4.2 多行输入的三种姿势

- **反斜杠换行**：在行尾打 `\` 再按 Enter
- **Option + Enter**（macOS）：直接换行不发送
- **Shift + Enter**：跨平台通用

推荐使用 **Shift + Enter**，肌肉记忆和其他工具一致。

### 4.3 实用快捷键补充

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + V` | 直接粘贴截图（Mac 用户注意是 Ctrl 不是 Cmd） |
| `Ctrl + J` 或 `Option + Enter` | 换行 |
| `Ctrl + R` | 搜索历史 prompt |
| `Ctrl + U` | 删除整行输入 |

---

## 五、Plan 模式深度应用

### 5.1 什么是 Plan 模式

Plan 模式是 Claude Code 的一个核心特性，让 AI 在执行复杂任务前先进行规划和分析，而不是直接动手修改代码。这对避免"AI 在错误的方向上狂奔"至关重要。

### 5.2 何时使用 Plan 模式

**必须使用 Plan 模式的场景**：

1. **大型重构任务**
   - 涉及多个文件的修改
   - 需要调整架构或模块划分

2. **新功能开发**
   - 需要设计新的 API 或数据结构
   - 涉及多个组件的协作

3. **复杂 Bug 修复**
   - 需要先分析根本原因
   - 可能影响多个模块

4. **技术选型决策**
   - 需要比较多种方案
   - 涉及权衡取舍

### 5.3 Plan 模式的三种触发方式

#### 方式一：自然语言触发

```
请先分析一下这个项目的架构，然后制定一个重构计划，不要直接改代码。
```

#### 方式二：EnterPlanMode 工具

Claude Code 会在检测到复杂任务时自动建议进入 Plan 模式。

### 5.4 Plan 模式最佳实践

#### 实践一：分阶段规划

```
我需要添加用户认证功能，请分阶段规划：

阶段1：分析现有代码结构
阶段2：设计认证方案（JWT vs Session）
阶段3：规划数据库表结构
阶段4：设计 API 接口
阶段5：制定实现步骤

请先完成阶段1-4的规划，确认后再开始实现。
```

#### 实践二：明确约束条件

```
请帮我重构这个模块，但有以下约束：
1. 必须保持向后兼容
2. 不能修改公开 API 的签名
3. 性能不能下降

请先制定计划，列出每个步骤可能的风险点。
```

#### 实践三：利用 /rewind 做实验

Plan 模式配合 /rewind 使用效果最佳：

1. 让 AI 尝试一种方案
2. 不满意？使用 `/rewind` 回退代码但保留对话
3. AI 记得上次尝试失败，直接换方向

### 5.5 Plan 模式工作流程图

```
┌─────────────────┐
│   描述需求      │
└────────┬────────┘
         ↓
┌─────────────────┐
│  进入 Plan 模式 │
└────────┬────────┘
         ↓
┌─────────────────┐
│ AI 分析并规划   │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 用户确认/修改   │
└────────┬────────┘
         ↓
    ┌────┴────┐
    │ 确认？  │
    └────┬────┘
    Yes  │  No
    ↓    └──→ 修改计划
┌─────────────────┐
│  分步执行       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  /rewind 调整   │ ← 如果需要
└─────────────────┘
```

---

## 六、OpenSpec 详细配置

OpenSpec 是一个独立的规范驱动开发工具，与 Claude Code 内置的 Plan 模式有相似之处，但功能更强大。它是本教程重点介绍的高级工作流工具。

### 6.1 OpenSpec vs Plan 模式

| 特性 | Plan 模式 | OpenSpec |
|------|----------|----------|
| **定位** | Claude Code 内置功能 | 独立的规范驱动工具 |
| **规范存储** | 临时（会话内） | 持久化（文件系统） |
| **团队协作** | 不支持 | 支持（规范文件可共享） |
| **历史追溯** | 无 | 完整的变更归档 |
| **跨工具支持** | 仅 Claude Code | 支持 Claude、Cursor、Windsurf 等 |

### 6.2 OpenSpec 的核心优势

**1. 规范持久化**
- Plan 模式的规划只在当前会话有效，关闭终端就消失
- OpenSpec 将规范保存为文件，随时可查看、修改、复用

**2. 团队协作友好**
- 规范文件可以提交到 Git，团队成员都能看到
- 新成员加入项目时，可以快速了解历史决策

**3. 变更可追溯**
- `/opsx:archive` 归档完成的变更
- 可以回溯查看每个功能的设计决策

**4. 跨 AI 工具支持**
- 同一份规范可用于 Claude Code、Cursor、Windsurf
- 团队成员使用不同工具也能保持一致

**5. 更严格的流程控制**
- `propose → apply → archive` 形成完整闭环
- 减少 AI"自作主张"的情况

### 6.3 安装

```bash
# 使用 npm 安装（推荐）
npm install -g @fission-ai/openspec@latest

# 使用 pnpm
pnpm add -g @fission-ai/openspec@latest

# 使用 yarn
yarn global add @fission-ai/openspec@latest
```

**要求**：Node.js 20.19.0 或更高版本

### 6.4 初始化项目

```bash
# 进入项目目录
cd your-project

# 交互式初始化
openspec init

# 指定 AI 工具
openspec init --tools claude,cursor

# 使用全部工具和 core 配置
openspec init --tools all --profile core --force
```

初始化后会在项目中创建：
- `.claude/skills/` - OpenSpec 技能文件
- `.claude/commands/opsx/` - OpenSpec 命令
- `openspec/config.yaml` - 项目配置文件

### 6.5 核心命令

| 命令 | 功能 |
|------|------|
| `/opsx:propose` | 提出新的功能变更方案，生成规范文件 |
| `/opsx:explore` | 探索现有代码结构 |
| `/opsx:apply` | 应用已批准的规范 |
| `/opsx:archive` | 归档完成的变更 |

### 6.6 工作流程

```
/opsx:propose → 生成规范文件 → 人工审核 → /opsx:apply → /opsx:archive
                （规范持久化保存，可追溯、可共享）
```

### 6.7 使用示例

**新功能开发**
```
/opsx:propose "添加用户认证功能，支持 JWT 和 OAuth2"
```

**代码重构**
```
/opsx:propose "重构支付模块，解耦第三方支付接口"
```

**架构探索**
```
/opsx:explore 分析当前系统的数据流向
```

### 6.8 扩展工作流

通过 `openspec config profile` 切换到扩展配置后，还支持：

| 命令 | 功能 |
|------|------|
| `/opsx:new` | 创建新的规范分支 |
| `/opsx:continue` | 继续之前未完成的工作 |
| `/opsx:verify` | 验证实现是否符合规范 |
| `/opsx:sync` | 同步规范与代码状态 |

### 6.9 何时使用 OpenSpec

- 中大型功能开发
- 需要团队协作的项目
- 需要保留设计决策的场景
- 跨多个 AI 工具的工作流

---

## 七、CC Switch：多服务提供商管理神器

CC Switch 是一款专为 Claude Code、Codex 和 Gemini CLI 设计的一站式服务提供商管理工具，支持可视化管理 API 配置、快速切换服务商、速度测试等功能。

### 7.1 为什么需要 CC Switch

- **一键切换**：无需手动编辑配置文件，图形化界面轻松切换
- **多服务商支持**：同时管理 Anthropic、OpenAI、DeepSeek、智谱 GLM 等多个服务商
- **国内友好**：轻松配置代理和中转服务，解决网络访问问题
- **成本优化**：根据任务复杂度选择合适的模型，节省 API 费用
- ![image-20260320212535028](/img/AI/image-20260320212535028.png)

### 7.2 安装 CC Switch

#### 方式一：下载桌面应用（推荐）

访问 [CC Switch GitHub Releases](https://github.com/farion1231/cc-switch/releases) 下载对应平台的安装包：

| 平台 | 文件 |
|------|------|
| Windows | `cc-switch_x.x.x_x64-setup.exe` |
| macOS | `cc-switch_x.x.x_x64.dmg` |
| Linux | `cc-switch_x.x.x_amd64.AppImage` |

#### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/farion1231/cc-switch.git
cd cc-switch

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建生产版本
npm run tauri build
```

### 7.3 添加服务提供商

启动 CC Switch 后，点击 "Add Provider" 添加新的服务提供商。

![PixPin_2026-03-20_21-27-20](/img/AI/PixPin_2026-03-20_21-27-20.png)

### 7.4 切换服务提供商

#### 方式一：主界面切换

1. 在 CC Switch 主界面选择目标提供商
2. 点击 "Enable" 按钮启用
3. 重启终端或 Claude Code 使配置生效

#### 方式二：系统托盘快速切换

点击系统托盘中的 CC Switch 图标，直接点击提供商名称即可即时切换。

#### 方式三：命令行切换

```bash
# 切换到指定提供商
cc-switch switch "DeepSeek" --app claude

# 查看当前激活的提供商
cc-switch status

# 列出所有提供商
cc-switch list --app claude
```

### 7.5 OpenAI 协议兼容模型配置

大多数国产大模型都提供 OpenAI 兼容的 API，可直接通过 CC Switch 接入：

| 服务商 | Base URL | 特点 |
|--------|----------|------|
| **智谱 GLM** | `https://open.bigmodel.cn/api/paas/v4` | 国产领先，支持长上下文 |
| **DeepSeek** | `https://api.deepseek.com` | 高性价比，代码能力强 |
| **月之暗面** | `https://api.moonshot.cn/v1` | 支持超长上下文（128K） |
| **通义千问** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 阿里云服务稳定 |
| **硅基流动** | `https://api.siliconflow.cn/v1` | 多模型聚合平台 |

---

## 八、终端美化：Oh My Posh + PSReadLine（可选）

一个漂亮的终端能显著提升开发体验。下面是 Windows 环境的完整配置方案。

### 8.1 安装 Oh My Posh

Oh My Posh 是一个跨平台的提示符渲染引擎，可以让你的终端焕然一新。

```powershell
# 使用 winget 安装
winget install JanDeDobbeleer.OhMyPosh -s winget

# 或使用 PowerShell Gallery 安装
Install-Module oh-my-posh -Scope CurrentUser
```

### 8.2 安装 PSReadLine（增强命令行编辑体验）

PSReadLine 提供了类似 bash 的命令行编辑体验，包括语法高亮、历史搜索、自动补全等。

```powershell
# 安装 PSReadLine（Windows 10/11 通常已预装）
Install-Module PSReadLine -Force -SkipPublisherCheck -AllowClobber

# 安装补全模块
Install-Module -Name CompletionPredictor -Force
```

### 8.3 配置 PowerShell Profile

打开 PowerShell Profile 文件进行配置：

```powershell
# 打开 Profile 文件
notepad $PROFILE
```

如果文件不存在，先创建：

```powershell
New-Item -Path $PROFILE -Type File -Force
notepad $PROFILE
```

### 8.4 完整 Profile 配置示例

```powershell
# ============================================
# PowerShell Profile 配置
# ============================================

# ---------- Oh My Posh 配置 ----------
# 初始化 Oh My Posh，使用指定主题
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\paradox.omp.json" | Invoke-Expression

# 推荐主题：
# - paradox: 经典双行提示符
# - agnoster: 简洁美观
# - powerlevel10k_rainbow: 彩虹配色
# - jandedobbeleer: 作者默认主题

# ---------- PSReadLine 配置 ----------
# 开启预测性 IntelliSense（输入时显示历史建议列表）
Set-PSReadLineOption -PredictionSource History
Set-PSReadLineOption -PredictionViewStyle ListView

# 上/下箭头直接浏览历史命令
Set-PSReadLineKeyHandler -Key UpArrow -Function PreviousHistory
Set-PSReadLineKeyHandler -Key DownArrow -Function NextHistory

# Tab 补全显示菜单（可选文件/命令）
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete

# Ctrl+R 搜索历史
Set-PSReadLineKeyHandler -Key Ctrl+r -Function ReverseSearchHistory

# ---------- 常用别名 ----------
Set-Alias -Name ll -Value Get-ChildItem
Set-Alias -Name which -Value Get-Command

# ---------- Claude Code 快捷别名 ----------
Set-Alias -Name cc -Value claude

# ---------- 欢迎信息 ----------
Write-Host "Welcome to PowerShell with Oh My Posh!" -ForegroundColor Cyan
Write-Host "Claude Code ready. Type 'cc' to start." -ForegroundColor Green
```

### 8.5 安装 Nerd Fonts（推荐）

Oh My Posh 的许多主题使用了特殊图标，需要安装 Nerd Fonts 才能正确显示。

```powershell
# 使用 Oh My Posh 安装字体
oh-my-posh font install

# 或手动下载安装推荐字体：
# - CascadiaCode Nerd Font
# - FiraCode Nerd Font
# - JetBrainsMono Nerd Font
```

安装后在 Windows Terminal 设置中将字体改为对应的 Nerd Font。

### 8.6 最终效果

![image-20260320212305874](/img/AI/image-20260320212305874.png)

配置完成后，你的终端将具备：
- 美观的提示符（显示 Git 分支、路径、时间等）
- 语法高亮
- 历史命令智能搜索
- Tab 补全菜单
- 预测性补全

---

## 九、高级扩展功能

Claude Code 提供了多种扩展机制，让 AI 能力边界不断拓展。

### 9.1 MCP（Model Context Protocol）

MCP 是 Claude Code 最具想象力的功能之一，让 AI 能调用外部工具——数据库、API、浏览器，甚至你自己写的脚本。

**配置示例**：
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "./src"]
    }
  }
}
```

### 9.2 Hooks 钩子机制

Hooks 让你在 AI 执行的各个阶段插入自定义脚本，实现自动化工作流。

**常用事件**：`PreToolUse`（工具调用前）、`PostToolUse`（工具调用后）、`SessionStart`（会话启动时）

### 9.3 自定义命令（Commands）

在项目的 `.claude/commands/` 目录下创建 `.md` 文件，封装常用工作流。

**示例**：创建 `review-pr.md`，之后用 `/review-pr` 直接调用。

### 9.4 Skills 技能系统

Skills 是高级扩展机制，比 Commands 更强大，可定义代理的行为规则、工具权限等。

**内置 Skills**：`/code-review`、`/simplify`、`/loop`

---

## 十、隐藏命令大揭秘

### 10.1 /btw - 并行提问神器

**发布时间**：2026年3月11日

**用途**：在 Claude 正在干活时插入问题，但不会污染对话历史。

**使用场景**：
- AI 正在重构一个大模块，你突然想问个问题
- 不想打断当前任务，又想获取信息

**使用方法**：
```
/btw 这个测试文件在哪个目录来着？
```

**优势**：
- 完全不中断正在执行的任务
- 上下文干净，不污染对话历史
- 几乎不费 token（复用提示缓存）

### 10.2 /rewind - 时光回溯

**快捷方式**：按两下 Esc

**功能**：撤销/回退，类似 Ctrl+Z

**高级用法**：
- 只回退代码，保留对话
- 只回退对话，保留代码
- 从某点开始压缩上下文

**实验模式**：让 Claude 试一种新方案 → 不行就回退代码但保留对话 → Claude 记得这条路不通，直接换方向。

### 10.3 /insights - 使用习惯分析

**功能**：生成一份 HTML 报告，分析你过去一个月使用 Claude Code 的习惯。

**报告内容包括**：
- 最常用的命令
- 重复性的操作模式
- 自定义命令和 Skills 推荐
- 翻车现场分析

**建议**：每月跑一次 `/insights`，重新认识自己的使用习惯。

### 10.4 /simplify - 三合一代码审查

**功能**：启动三个平行的 Agent，分别从以下角度审查代码：
1. 代码复用
2. 代码质量
3. 运行效率

**使用时机**：
- 完成几个大功能更新后
- 想要优化代码时

**优势**：相当于找了三个同事同时 review。

### 10.5 /branch - 对话分叉

**曾用名**：`/fork`

**用途**：将当前对话分叉出新会话，原会话不受影响。

**使用场景**：
- 聊到一半想试另一个方向
- 想保留当前进度，同时探索新方案

**与 /rewind 的区别**：
- `/rewind` 是后悔药（回退）
- `/branch` 是平行宇宙（分叉）

### 10.6 /loop - 定时任务

**功能**：定时重复执行某个任务。

**使用方法**：
```
/loop 5m 检查一下部署状态
```

**注意事项**：
- 默认间隔 10 分钟
- 任务 3 天后自动过期
- 如需长期运行，使用桌面版

### 10.7 /remote-control - 远程操控

**简写**：`/rc`

**功能**：生成一个 URL，用手机打开后可以远程操控 Claude Code。

**特点**：
- 完全同步（手机和终端实时同步）
- 代码始终在本地运行
- 安全可靠

### 10.8 /export - 对话导出

**功能**：将当前对话导出为 Markdown 文件。

**使用场景**：
- 保存重要的架构讨论
- 与其他 AI 工具协同
- 作为未来的 context 参考

---

## 十一、实战技巧与最佳实践

### 11.1 用 @ 引用文件

```
请帮我 review @src/utils/auth.ts 这个文件的安全性
```

用 `@` 符号直接引用文件路径，AI 会自动读取文件内容。比复制粘贴干净利落。

### 11.2 用 ! 前缀执行 Shell 命令

```
! npm run test
```

不用切出 Claude Code 就能跑命令，测试结果还会作为上下文供 AI 分析。跑完测试如果有报错，直接说"帮我修"就行。

### 11.3 自定义命令

在项目的 `.claude/commands/` 目录下创建 `.md` 文件：

**示例：review-pr.md**

```markdown
请对当前分支的所有改动做一次完整的 Code Review，重点关注：

1. 潜在的安全漏洞
2. 性能问题
3. 代码规范

输出格式用表格，包含文件名、问题描述、严重程度。
```

之后直接调用这个自定义命令，每次 Review 的标准就统一了。

### 11.4 ultrathink 扩展思考

遇到复杂的设计决策或疑难 bug，可以触发扩展思考模式（ultrathink），让 AI 在给出方案前进行更深入的推理。

### 11.5 Git Worktrees 并行作战

高级玩法：利用 Git Worktrees 在不同目录同时开多个 Claude Code 会话，每个处理不同的任务分支。等于同时派出多个 AI 同事并行干活，最后合并结果。

---

## 十二、配置文件体系

### 12.1 两层覆盖机制

```
~/.claude/settings.json        → 用户级配置（全局生效）
项目/.claude/settings.json     → 项目级配置（覆盖全局）
```

项目级配置优先级更高，可以在全局配置里设好通用偏好，再在具体项目里做微调。

### 12.2 CLAUDE.md 项目说明文件

运行 `/init` 后会自动生成 `CLAUDE.md`，这是给 AI 的项目说明书。建议包含：

- 项目概述和技术栈
- 目录结构说明
- 编码规范
- 常用命令
- 注意事项

### 12.3 推荐的 settings.json 配置

```json
{
  "model": "claude-sonnet-4-6",
  "permissions": {
    "allow": [
      "Read(**)",
      "Write(src/**)",
      "Bash(npm run *)",
      "Bash(git *)"
    ],
    "deny": [
      "Write(.env*)",
      "Bash(rm -rf /*)"
    ]
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "./src"]
    }
  }
}
```

---

## 附录：常用命令速查卡

```
=================== 高频命令 ===================
/help          查看帮助
/model         切换模型
/cost          查看费用
/memory        编辑记忆
/clear         清空对话

=================== 项目命令 ===================
/init          初始化项目
/config        修改配置
/mcp           管理 MCP

=================== OpenSpec ==================
/opsx:propose  提出变更方案
/opsx:explore  探索代码结构
/opsx:apply    应用规范
/opsx:archive  归档变更

=================== 隐藏命令 ===================
/btw           并行提问（不污染历史）
/rewind        时光回溯（或按两下 Esc）
/insights      使用习惯分析
/simplify      三合一代码审查
/branch        对话分叉
/loop          定时任务
/rc            远程操控
/export        导出对话

=================== 快捷键 ===================
Ctrl+C         打断执行
Ctrl+O         切换详细模式
Shift+Tab      切换权限模式
Esc+Esc        撤销改动
Ctrl+V         粘贴截图
Ctrl+R         搜索历史
Ctrl+J         换行
```

---

## 结语

Claude Code 不是万能的，它偶尔也会犯错、会跑偏。但只要掌握了正确的使用方法，它确实能大幅提升编码效率。

**核心建议**：
1. 先花 30 分钟熟悉斜杠命令和快捷键，这是基本功
2. 用好 `/init` 和 memory 功能，让 AI 真正理解你的项目
3. 复杂任务使用 OpenSpec 规范驱动开发，减少 AI 盲目操作
4. 善用 `Esc + Esc` 回退，大胆让 AI 尝试，不满意就撤销
5. 配置好 CC Switch，灵活选择最适合的服务提供商

> **工具本身不产生价值，会用工具的人才产生价值。**

---

*本教程基于 Claude Code 2026年3月版本整理，功能持续更新中。*

*参考来源：*
- *[腾讯云开发者社区 - Claude Code 使用技巧](https://developer.cloud.tencent.com/article/2638047)*
- *[数字生命卡兹克 - Claude Code 隐藏命令](https://mp.weixin.qq.com/s/XopaISgwzSgoqZctym_Ajg)*
- *[CC Switch - GitHub](https://github.com/farion1231/cc-switch)*
- *[Claude Code 官方文档](https://docs.anthropic.com/en/docs/claude-code)*
## 总结

本文系统讲解了技术要点，通过学习掌握核心知识和实践方法。
