---
title: "企业级 Agentic Systems 架构设计：Workflows 实战指南"
date: 2026-03-21 14:00:00
tags: [Agentic AI, LangGraph, Workflows, LLM Application]
categories: AI架构设计
description: 深入探讨企业级 Agentic Systems 架构设计，重点讲解 Workflows 模式（Prompt Chaining、Routing、Parallelization、Orchestrator-Workers）的生产实践。基于 LangGraph 提供完整的状态持久化、人工介入、流式输出等生产级特性实现方案。
---

## 一、Agentic Systems 架构概览

### 1.1 核心概念：Workflows 主导企业应用

根据 Anthropic 官方研究，**Agentic Systems** 分为两大类：

```
Agentic Systems（智能体系统）
│
├── Workflows（工作流 - 企业主流，80-90% 场景）
│   ├── Prompt Chaining：链式处理
│   ├── Routing：路由分类
│   ├── Parallelization：并行执行
│   ├── Orchestrator-Workers：编排-工作者模式
│   └── Evaluator-Optimizer：评估-优化循环
│
└── Agents（智能体 - 动态自主，10-20% 场景）
    └── Feedback Loop Agents：基于环境反馈的循环智能体
```

**关键洞察**：
> **"Success isn't about making the most sophisticated system. It's about building the right system for your needs."**
> —— Anthropic, Building Effective Agents

**企业应用现状**：
- ✅ **Workflows**：解决 80-90% 企业需求，成本可控、可预测
- ⚠️ **Agents**：仅用于真正需要自主决策的场景（开放式问题、探索性任务）
<!--more-->
### 1.2 为什么企业偏爱 Workflows？

| 维度 | Workflows | Agents | 企业选择 |
|------|-----------|--------|---------|
| **可控性** | ✅ 100% 可预测执行路径 | ⚠️ 动态决策，不可预测 | **Workflows** |
| **成本控制** | ✅ 固定步骤，成本可计算 | ❌ 循环次数不确定 | **Workflows** |
| **调试难度** | ✅ 线性追踪，容易定位 | ❌ 非线性，难以重现 | **Workflows** |
| **合规审计** | ✅ 容易记录和审计 | ⚠️ 决策路径复杂 | **Workflows** |
| **适用场景** | 固定流程、高频任务 | 开放式、探索性 | 取决于业务 |

**成本对比**（以客服系统为例）：

```
场景：每天处理 10,000 个请求

Routing Workflow：
- Token 消耗：1,000 tokens/请求
- 成本：10,000 × 1,000 × $0.03/1K = $300/天
- 年成本：$109,500
- ✅ 适合 90% 企业场景

Autonomous Agent：
- Token 消耗：10,000-20,000 tokens/请求
- 成本：$3,000-6,000/天
- 年成本：$1-2M
- ⚠️ 成本高 10-20 倍，业务价值未必提升 10-20 倍
```

### 1.3 选择指南：Workflow vs Agent

**决策树**：

```
开始：你的任务是什么？
│
├─ 是否有明确的处理步骤？
│  ├─ 是 → 使用 Workflow ✅
│  └─ 否 → 继续判断
│
├─ 是否需要根据输入动态调整策略？
│  ├─ 是，但有限几种情况 → Routing Workflow ✅
│  └─ 是，无限可能 → 考虑 Agent ⚠️
│
├─ 任务是否有明确的结束条件？
│  ├─ 是 → Workflow ✅
│  └─ 否 → 考虑 Agent ⚠️
│
├─ 是否需要探索未知解决方案？
│  ├─ 否 → Workflow ✅
│  └─ 是（如研究、创意）→ Agent ✅
│
└─ 成本是否敏感？
   ├─ 是 → Workflow ✅
   └─ 否 → 可考虑 Agent
```

**典型场景映射**：

| 业务场景 | 推荐架构 | 理由 |
|---------|---------|------|
| 文档生成 | Prompt Chaining | 固定步骤，线性处理 |
| 客服分类 | Routing | 根据意图路由到专门处理器 |
| 多文档分析 | Parallelization | 并行处理多个文档 |
| 复杂任务分解 | Orchestrator-Workers | 动态分配子任务 |
| 内容质量优化 | Evaluator-Optimizer | 迭代改进质量 |
| 代码重构 | Agent | 需要探索性决策 |
| 研究分析 | Agent | 开放式问题 |

<!--more-->

### 1.4 生产级架构全景图

```
┌─────────────────────────────────────────────────────────┐
│  应用层 (Client Applications)                            │
│  • Web UI / CLI / API Integration                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  API 网关层 (FastAPI)                                    │
│  • 认证授权 / Rate Limiting / 路由分发                   │
│  • 流式响应 (SSE/WebSocket)                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Agentic Runtime 层 (LangGraph)                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Workflows（核心）                                 │  │
│  │  ├── Prompt Chaining（链式）                      │  │
│  │  ├── Routing（路由）                              │  │
│  │  ├── Parallelization（并行）                      │  │
│  │  ├── Orchestrator-Workers（编排）                 │  │
│  │  └── Evaluator-Optimizer（评估优化）              │  │
│  │                                                    │  │
│  │  Agents（进阶）                                    │  │
│  │  └── Feedback Loop Agents                         │  │
│  └──────────────────────────────────────────────────┘  │
│  • StateGraph (状态图)                                  │
│  • Checkpointer (状态持久化)                            │
│  • Human-in-the-loop                                    │
│  • Streaming (实时流式输出)                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  增强能力层 (Augmented Capabilities)                     │
│  ├── Retrieval (RAG)                                    │
│  │   ├── Vector Store (pgvector)                       │
│  │   └── Hybrid Search (Vector + FTS)                  │
│  ├── Tools (工具调用)                                    │
│  └── Memory (记忆系统)                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  基础设施层 (Infrastructure)                             │
│  ├── Database: PostgreSQL + pgvector                   │
│  ├── LLM: OpenAI API Compatible                        │
│  ├── Cache: Redis                                      │
│  └── Observability: OpenTelemetry + Prometheus        │
└─────────────────────────────────────────────────────────┘
```

---

## 二、Workflows 核心模式详解

### 2.1 Prompt Chaining（链式工作流）

**适用场景**：任务可分解为固定步骤，每步依赖前一步输出

**典型用例**：
- 文档生成：大纲 → 内容 → 润色
- 数据处理：提取 → 转换 → 验证
- 内容创作：创意 → 扩展 → 审核

**LangGraph 实现**：

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict


class ChainingState(TypedDict):
    """链式处理状态"""
    input_text: str
    outline: str
    draft: str
    final_output: str
    quality_score: float


def create_outline(state: ChainingState) -> dict:
    """步骤1：生成大纲"""
    prompt = f"为以下内容生成大纲：\n{state['input_text']}"
    outline = llm.invoke(prompt)
    return {"outline": outline.content}


def expand_content(state: ChainingState) -> dict:
    """步骤2：扩展内容"""
    prompt = f"根据以下大纲扩展详细内容：\n{state['outline']}"
    draft = llm.invoke(prompt)
    return {"draft": draft.content}


def polish_content(state: ChainingState) -> dict:
    """步骤3：润色内容"""
    prompt = f"润色以下内容：\n{state['draft']}"
    final = llm.invoke(prompt)
    return {"final_output": final.content}


def quality_check(state: ChainingState) -> dict:
    """步骤4：质量检查"""
    prompt = f"评估以下内容的质量（0-10分）：\n{state['final_output']}"
    score = llm.invoke(prompt)
    return {"quality_score": float(score.content)}


# 构建链式图
graph = StateGraph(ChainingState)
graph.add_node("outline", create_outline)
graph.add_node("expand", expand_content)
graph.add_node("polish", polish_content)
graph.add_node("quality_check", quality_check)

# 线性连接
graph.add_edge(START, "outline")
graph.add_edge("outline", "expand")
graph.add_edge("expand", "polish")
graph.add_edge("polish", "quality_check")
graph.add_edge("quality_check", END)

# 编译
app = graph.compile()
```

**生产级增强**（带重试和降级）：

```python
from langgraph.types import RetryPolicy


def robust_chaining_node(state: ChainingState) -> dict:
    """健壮的链式节点"""
    try:
        result = create_outline(state)
        return result
    except Exception as e:
        logger.error(f"Outline generation failed: {e}")
        # 降级：使用简化版大纲
        return {"outline": "默认大纲"}


# 添加重试策略
graph.add_node(
    "outline",
    robust_chaining_node,
    retry_policy=RetryPolicy(
        max_attempts=3,
        initial_interval=1.0,
        backoff_factor=2.0
    )
)
```

### 2.2 Routing（路由工作流）

**适用场景**：根据输入类型路由到不同的处理分支

**典型用例**：
- 客服分类：账单问题、技术支持、投诉建议
- 文档处理：PDF、Word、Excel 不同处理流程
- 多语言处理：中文、英文、日文 翻译策略

**实现示例**：

```python
from langgraph.types import Command
from typing import Literal


class RoutingState(TypedDict):
    """路由状态"""
    query: str
    category: str
    response: str


def classify_node(state: RoutingState) -> dict:
    """分类节点"""
    prompt = f"""
    对以下查询进行分类（billing/technical/complaint）：

    {state['query']}

    只返回分类名称。
    """
    category = llm.invoke(prompt).content.strip()
    return {"category": category}


def route_by_category(state: RoutingState) -> Command[Literal["billing", "technical", "complaint"]]:
    """动态路由"""
    category = state["category"]

    if category == "billing":
        return Command(goto="billing")
    elif category == "technical":
        return Command(goto="technical")
    else:
        return Command(goto="complaint")


def billing_handler(state: RoutingState) -> dict:
    """账单问题处理"""
    response = llm.invoke(f"处理账单问题：{state['query']}")
    return {"response": response.content}


def technical_handler(state: RoutingState) -> dict:
    """技术支持处理"""
    response = llm.invoke(f"技术支持：{state['query']}")
    return {"response": response.content}


def complaint_handler(state: RoutingState) -> dict:
    """投诉处理"""
    response = llm.invoke(f"处理投诉：{state['query']}")
    return {"response": response.content}


# 构建路由图
graph = StateGraph(RoutingState)
graph.add_node("classify", classify_node)
graph.add_node("billing", billing_handler)
graph.add_node("technical", technical_handler)
graph.add_node("complaint", complaint_handler)

# 路由连接
graph.add_edge(START, "classify")
graph.add_conditional_edges("classify", route_by_category)
graph.add_edge("billing", END)
graph.add_edge("technical", END)
graph.add_edge("complaint", END)

app = graph.compile()
```

**生产级路由增强**（带置信度阈值）：

```python
def classify_with_confidence(state: RoutingState) -> dict:
    """带置信度的分类"""
    prompt = f"""
    分类查询并给出置信度（0-1）：
    查询：{state['query']}

    返回 JSON：{{"category": "xxx", "confidence": 0.95}}
    """

    result = llm.invoke(prompt)
    data = json.loads(result.content)

    # 低置信度时转人工
    if data["confidence"] < 0.7:
        data["category"] = "human_review"

    return data
```

### 2.3 Parallelization（并行工作流）

**适用场景**：多个独立任务可并行执行

**典型用例**：
- 多文档摘要：并行处理多个文档
- 多角度分析：技术、市场、法律 并行评估
- 多语言翻译：并行翻译多种语言

**实现示例**：

```python
import asyncio
from typing import List


class ParallelState(TypedDict):
    """并行处理状态"""
    documents: List[str]
    summaries: List[str]
    final_summary: str


async def summarize_document(doc: str) -> str:
    """单个文档摘要"""
    prompt = f"摘要以下文档：\n{doc[:2000]}"
    result = await llm.ainvoke(prompt)
    return result.content


async def parallel_summarize_node(state: ParallelState) -> dict:
    """并行摘要节点"""
    # 并行处理所有文档
    tasks = [
        summarize_document(doc)
        for doc in state["documents"]
    ]

    summaries = await asyncio.gather(*tasks)
    return {"summaries": summaries}


def merge_summaries_node(state: ParallelState) -> dict:
    """合并摘要节点"""
    combined = "\n\n".join(state["summaries"])
    prompt = f"合并以下摘要：\n{combined}"
    final = llm.invoke(prompt)
    return {"final_summary": final.content}


# 构建并行图
graph = StateGraph(ParallelState)
graph.add_node("parallel_summarize", parallel_summarize_node)
graph.add_node("merge", merge_summaries_node)

graph.add_edge(START, "parallel_summarize")
graph.add_edge("parallel_summarize", "merge")
graph.add_edge("merge", END)

app = graph.compile()
```

**生产级并发控制**：

```python
from asyncio import Semaphore


class ConcurrencyManager:
    """并发管理器"""

    def __init__(self, max_concurrency: int = 10):
        self.semaphore = Semaphore(max_concurrency)

    async def run_with_limit(self, func, *args, **kwargs):
        """限制并发数"""
        async with self.semaphore:
            return await func(*args, **kwargs)


# 使用并发限制
manager = ConcurrencyManager(max_concurrency=5)


async def safe_parallel_summarize(state: ParallelState) -> dict:
    """安全的并行摘要（带并发限制）"""
    tasks = [
        manager.run_with_limit(summarize_document, doc)
        for doc in state["documents"]
    ]

    summaries = await asyncio.gather(*tasks, return_exceptions=True)

    # 过滤错误
    valid_summaries = [
        s for s in summaries
        if not isinstance(s, Exception)
    ]

    return {"summaries": valid_summaries}
```

### 2.4 Orchestrator-Workers（编排-工作者模式）

**适用场景**：复杂任务需动态分解和分配

**典型用例**：
- 代码重构：分析 → 分解 → 多模块重构 → 合并
- 报告生成：收集数据 → 多角度分析 → 汇总
- 项目规划：需求分析 → 任务分解 → 分配执行

**实现示例**：

```python
from typing import List, Dict


class OrchestratorState(TypedDict):
    """编排状态"""
    task: str
    subtasks: List[Dict]
    worker_results: List[Dict]
    final_result: str


def orchestrator_node(state: OrchestratorState) -> dict:
    """编排节点：分解任务"""
    prompt = f"""
    将以下任务分解为 3-5 个子任务：

    任务：{state['task']}

    返回 JSON 数组：[
        {{"id": 1, "description": "子任务描述", "type": "analysis"}},
        ...
    ]
    """

    result = llm.invoke(prompt)
    subtasks = json.loads(result.content)
    return {"subtasks": subtasks}


async def worker_node(state: OrchestratorState) -> dict:
    """工作者节点：处理子任务"""
    results = []

    for subtask in state["subtasks"]:
        prompt = f"执行子任务：{subtask['description']}"
        result = await llm.ainvoke(prompt)
        results.append({
            "subtask_id": subtask["id"],
            "result": result.content
        })

    return {"worker_results": results}


def synthesizer_node(state: OrchestratorState) -> dict:
    """合成节点：整合结果"""
    prompt = f"""
    整合以下工作成果：

    {json.dumps(state['worker_results'], ensure_ascii=False, indent=2)}

    生成最终报告。
    """

    final = llm.invoke(prompt)
    return {"final_result": final.content}


# 构建编排-工作者图
graph = StateGraph(OrchestratorState)
graph.add_node("orchestrator", orchestrator_node)
graph.add_node("workers", worker_node)
graph.add_node("synthesizer", synthesizer_node)

graph.add_edge(START, "orchestrator")
graph.add_edge("orchestrator", "workers")
graph.add_edge("workers", "synthesizer")
graph.add_edge("synthesizer", END)

app = graph.compile()
```

### 2.5 Evaluator-Optimizer（评估-优化循环）

**适用场景**：需要迭代改进质量

**典型用例**：
- 内容创作：初稿 → 评估 → 修改 → 满意为止
- 代码生成：生成 → 测试 → 修复 → 通过测试
- 翻译优化：初译 → 审校 → 润色 → 达标

**实现示例**：

```python
from typing import TypedDict


class EvalOptState(TypedDict):
    """评估优化状态"""
    content: str
    feedback: str
    score: float
    iteration: int
    max_iterations: int


def generator_node(state: EvalOptState) -> dict:
    """生成器节点"""
    if state["iteration"] == 0:
        prompt = f"生成内容：{state.get('task', '')}"
    else:
        prompt = f"""
        根据反馈改进内容：

        当前内容：{state['content']}

        反馈：{state['feedback']}

        生成改进版本。
        """

    content = llm.invoke(prompt).content
    return {
        "content": content,
        "iteration": state["iteration"] + 1
    }


def evaluator_node(state: EvalOptState) -> dict:
    """评估器节点"""
    prompt = f"""
    评估以下内容的质量（0-10分）并给出改进建议：

    {state['content']}

    返回 JSON：{{"score": 8.5, "feedback": "建议..."}}
    """

    result = llm.invoke(prompt)
    eval_result = json.loads(result.content)

    return {
        "score": eval_result["score"],
        "feedback": eval_result["feedback"]
    }


def should_continue(state: EvalOptState) -> str:
    """判断是否继续优化"""
    if state["score"] >= 8.0:
        return END
    if state["iteration"] >= state["max_iterations"]:
        return END
    return "generator"


# 构建评估-优化图
graph = StateGraph(EvalOptState)
graph.add_node("generator", generator_node)
graph.add_node("evaluator", evaluator_node)

graph.add_edge(START, "generator")
graph.add_edge("generator", "evaluator")
graph.add_conditional_edges("evaluator", should_continue, ["generator", END])

app = graph.compile()
```

**生产级增强**（带人工审核）：

```python
from langgraph.checkpoint.postgres import PostgresSaver


# 添加人工审核节点
def human_review_node(state: EvalOptState) -> dict:
    """人工审核节点"""
    # 此节点会中断，等待人工输入
    return state


# 修改图
graph.add_node("human_review", human_review_node)

graph.add_edge("evaluator", "human_review")
graph.add_conditional_edges("human_review", lambda s: END if s["score"] >= 8 else "generator")

# 编译时添加中断
app = graph.compile(
    checkpointer=PostgresSaver(connection),
    interrupt_before=["human_review"]
)
```

---

## 三、状态管理：LangGraph 核心

### 3.1 StateGraph 与状态持久化

**核心概念**：

```python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver
from typing import TypedDict, Annotated
import operator


class WorkflowState(TypedDict):
    """工作流状态"""
    messages: Annotated[list, operator.add]  # 自动累加
    current_step: str
    data: dict
    errors: list[str]


# 状态持久化（生产环境必需）
from psycopg import Connection

connection = Connection.connect(DATABASE_URL)
checkpointer = PostgresSaver(connection)
checkpointer.setup()  # 初始化表

# 构建图
graph = StateGraph(WorkflowState)
# ... 添加节点和边

# 编译
app = graph.compile(checkpointer=checkpointer)
```

**状态快照查询**：

```python
# 执行工作流
config = {"configurable": {"thread_id": "user-123-task-456"}}
result = app.invoke(initial_state, config)

# 查询当前状态
snapshot = app.get_state(config)
print(f"当前步骤: {snapshot.values['current_step']}")
print(f"历史消息: {len(snapshot.values['messages'])}")

# 查看执行历史
history = list(app.get_state_history(config))
for state in history:
    print(f"步骤 {state.metadata['step']}: {state.metadata['source']}")
```

### 3.2 状态恢复与重试

**从检查点恢复**：

```python
# 场景：工作流执行到一半失败，需要恢复

# 1. 获取失败状态
config = {"configurable": {"thread_id": "failed-task-123"}}
failed_state = app.get_state(config)

# 2. 修复数据
fixed_data = fix_issue(failed_state.values)

# 3. 更新状态
app.update_state(config, {"data": fixed_data})

# 4. 恢复执行
result = app.invoke(None, config)  # None 表示从检查点恢复
```

### 3.3 Command 模式：动态路由

**推荐使用 Command 进行动态路由**：

```python
from langgraph.types import Command
from typing import Literal


def smart_router(state: WorkflowState) -> Command[Literal["path_a", "path_b", END]]:
    """智能路由"""
    if state.get("error_count", 0) > 3:
        return Command(goto=END)

    if state.get("requires_rag"):
        return Command(goto="rag_node")

    return Command(goto="generation_node")


# 使用 Command
graph.add_node("router", smart_router)
graph.add_conditional_edges("router")  # 不需要路由函数
```

---

## 四、Human-in-the-Loop：人工介入

### 4.1 interrupt_before 模式

**审批工作流实现**：

```python
from langgraph.graph import StateGraph
from langgraph.checkpoint.postgres import PostgresSaver


class ApprovalState(TypedDict):
    task_id: str
    content: str
    approval_status: str  # pending/approved/rejected
    feedback: str


def generate_content(state: ApprovalState) -> dict:
    """生成内容"""
    content = llm.invoke(f"生成内容：{state['task_id']}")
    return {"content": content.content, "approval_status": "pending"}


def human_approval(state: ApprovalState) -> dict:
    """人工审批（会被中断）"""
    return state  # 等待外部输入


def finalize(state: ApprovalState) -> dict:
    """最终处理"""
    return {"approval_status": "completed"}


# 构建审批工作流
graph = StateGraph(ApprovalState)
graph.add_node("generate", generate_content)
graph.add_node("approval", human_approval)
graph.add_node("finalize", finalize)

graph.add_edge(START, "generate")
graph.add_edge("generate", "approval")

# 条件路由
def route_after_approval(state: ApprovalState) -> str:
    if state["approval_status"] == "approved":
        return "finalize"
    elif state["approval_status"] == "rejected":
        return "generate"  # 重新生成
    return "approval"

graph.add_conditional_edges("approval", route_after_approval, ["generate", "finalize"])
graph.add_edge("finalize", END)

# 编译：在 approval 节点前中断
app = graph.compile(
    checkpointer=PostgresSaver(connection),
    interrupt_before=["approval"]
)
```

### 4.2 完整审批 API

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI()


class ApprovalRequest(BaseModel):
    thread_id: str
    approved: bool
    feedback: str = None


@app.post("/tasks")
async def create_task(task: str):
    """创建任务并等待审批"""
    thread_id = f"task-{uuid.uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}

    # 执行到审批节点前会自动中断
    result = await app.ainvoke(
        {"task_id": task},
        config
    )

    # 获取当前状态
    state = app.get_state(config)

    return {
        "thread_id": thread_id,
        "status": "waiting_approval",
        "content": state.values["content"]
    }


@app.post("/tasks/{thread_id}/approve")
async def approve_task(thread_id: str, request: ApprovalRequest):
    """审批任务"""
    config = {"configurable": {"thread_id": thread_id}}

    # 更新审批状态
    app.update_state(
        config,
        {
            "approval_status": "approved" if request.approved else "rejected",
            "feedback": request.feedback
        }
    )

    # 恢复执行
    result = await app.ainvoke(None, config)

    return {
        "thread_id": thread_id,
        "status": "completed" if request.approved else "regenerating"
    }
```

---

## 五、流式输出：实时响应

### 5.1 SSE 流式实现

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json


app = FastAPI()


async def stream_workflow(thread_id: str, query: str):
    """流式工作流输出"""
    config = {"configurable": {"thread_id": thread_id}}

    # 使用 astream_events 获取细粒度事件
    async for event in app.astream_events(
        {"query": query},
        version="v2",
        config=config
    ):
        kind = event["event"]

        if kind == "on_chat_model_stream":
            # LLM token 流
            content = event["data"]["chunk"].content
            if content:
                yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"

        elif kind == "on_chain_start":
            # 节点开始
            yield f"data: {json.dumps({'type': 'node_start', 'node': event['name']})}\n\n"

        elif kind == "on_chain_end":
            # 节点结束
            yield f"data: {json.dumps({'type': 'node_end', 'node': event['name']})}\n\n"


@app.post("/stream")
async def stream_endpoint(request: StreamRequest):
    """流式 API"""
    return StreamingResponse(
        stream_workflow(request.thread_id, request.query),
        media_type="text/event-stream"
    )
```

---

## 六、容错与重试策略

### 6.1 RetryPolicy 配置

```python
from langgraph.types import RetryPolicy


# 定义重试策略
retry_policy = RetryPolicy(
    max_attempts=3,
    initial_interval=1.0,
    backoff_factor=2.0,
    jitter=True,
    retry_on=[ConnectionError, TimeoutError]
)


# 添加到节点
graph.add_node(
    "external_api",
    api_node,
    retry_policy=retry_policy
)
```

### 6.2 熔断器模式

```python
from circuitbreaker import circuit


class ExternalService:
    """外部服务（带熔断器）"""

    @circuit(failure_threshold=5, recovery_timeout=60)
    async def call_api(self, data: dict) -> dict:
        """调用 API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(API_URL, json=data)
            response.raise_for_status()
            return response.json()


# 在节点中使用
async def safe_api_node(state: WorkflowState) -> dict:
    """安全的 API 节点"""
    service = ExternalService()
    try:
        result = await service.call_api(state["data"])
        return {"result": result}
    except Exception as e:
        if "Circuit breaker" in str(e):
            # 降级方案
            return await fallback_process(state)
        raise
```

---

## 七、可观测性：分布式追踪

### 7.1 OpenTelemetry 集成

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter


# 配置追踪
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://jaeger:4317"))
)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)


# 在节点中使用
async def traced_node(state: WorkflowState) -> dict:
    """带追踪的节点"""
    with tracer.start_as_current_span("process_document") as span:
        span.set_attribute("doc.id", state["doc_id"])

        result = await process(state)

        span.add_event("Processing completed")
        return result
```

### 7.2 Prometheus 指标

```python
from prometheus_client import Counter, Histogram

# 定义指标
REQUEST_COUNT = Counter(
    'workflow_requests_total',
    'Total workflow requests',
    ['workflow_type', 'status']
)

REQUEST_LATENCY = Histogram(
    'workflow_latency_seconds',
    'Workflow latency',
    ['workflow_type']
)


# 中间件记录
@app.middleware("http")
async def metrics_middleware(request, call_next):
    start_time = time.time()
    response = await call_next(request)

    REQUEST_COUNT.labels(
        workflow_type="routing",
        status=response.status_code
    ).inc()

    REQUEST_LATENCY.labels(workflow_type="routing").observe(
        time.time() - start_time
    )

    return response
```

---

## 八、RAG 架构：混合检索

### 8.1 向量数据库设计

```sql
-- PostgreSQL + pgvector
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 向量索引
CREATE INDEX idx_embedding ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 全文索引
CREATE INDEX idx_content_fts ON documents
USING gin(to_tsvector('simple', content));
```

### 8.2 混合检索实现

```python
class HybridRetriever:
    """混合检索：向量 + 全文"""

    async def retrieve(self, query: str, top_k: int = 5) -> List:
        # 1. 向量检索
        vector_results = await self._vector_search(query, top_k * 2)

        # 2. 全文检索
        fts_results = await self._fulltext_search(query, top_k * 2)

        # 3. RRF 融合
        return self._rrf_fusion(vector_results, fts_results, top_k)

    def _rrf_fusion(self, vector_results, fts_results, top_k):
        """Reciprocal Rank Fusion"""
        scores = {}

        for idx, doc in enumerate(vector_results):
            scores[doc.id] = {"doc": doc, "v_score": 1 / (idx + 60)}

        for idx, doc in enumerate(fts_results):
            if doc.id in scores:
                scores[doc.id]["f_score"] = 1 / (idx + 60)
            else:
                scores[doc.id] = {"doc": doc, "f_score": 1 / (idx + 60)}

        # 计算最终分数
        for doc_id, data in scores.items():
            data["final"] = data.get("v_score", 0) + data.get("f_score", 0)

        sorted_results = sorted(
            scores.values(),
            key=lambda x: x["final"],
            reverse=True
        )

        return [item["doc"] for item in sorted_results[:top_k]]
```

---

## 九、容器化部署

### 9.1 完整 docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: ${DB_USER:-agent}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-agent}
      POSTGRES_DB: ${DB_NAME:-agent_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agent"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  embedding:
    image: ghcr.io/huggingface/text-embeddings-inference:cpu-1.8
    command: --model-id BAAI/bge-small-zh-v1.5
    ports:
      - "8090:80"
    volumes:
      - tei_cache:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://agent:agent@postgres:5432/agent_db
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      EMBEDDING_BASE_URL: http://embedding:80
      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      embedding:
        condition: service_healthy

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4317:4317"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin

volumes:
  postgres_data:
  tei_cache:

networks:
  default:
    driver: bridge
```

---

## 十、最佳实践总结

### 10.1 架构选择原则

**从简单到复杂**：

```
1. 单次 LLM 调用 → 优先尝试
   ↓ 如果需要多步处理
2. Prompt Chaining → 固定步骤
   ↓ 如果需要分类处理
3. Routing Workflow → 多分支
   ↓ 如果需要并行
4. Parallelization → 并发处理
   ↓ 如果需要动态分解
5. Orchestrator-Workers → 复杂编排
   ↓ 如果需要迭代优化
6. Evaluator-Optimizer → 质量优化
   ↓ 仅在真正需要时
7. Agents → 开放式问题、探索性任务
```

### 10.2 生产级检查清单

**Workflows 必备**：
- ✅ 状态持久化（Checkpointer）
- ✅ 错误处理和重试
- ✅ 日志和追踪
- ✅ 人工介入机制（如需）
- ✅ 流式输出（如需）

**可选增强**：
- ⚠️ 内存管理（短期/长期）
- ⚠️ 并发控制
- ⚠️ 熔断器
- ⚠️ 降级策略

### 10.3 成本优化建议

| 优化点 | 方法 | 效果 |
|--------|------|------|
| **Token 消耗** | 缓存常见查询 | 减少 30-50% |
| **并发限制** | Semaphore 控制 | 避免资源耗尽 |
| **模型选择** | 简单任务用小模型 | 成本降低 5-10x |
| **提前终止** | 满足条件即结束 | 避免无效循环 |

---

## 参考资料

**官方文档**：
- [Building Effective Agents - Anthropic](https://www.anthropic.com/research/building-effective-agents)
- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/)
- [LangGraph Workflow Patterns](https://docs.langchain.com/oss/python/langgraph/workflows-agents)

**最佳实践**：
- [LangGraph Production Patterns](https://docs.langchain.com/oss/python/langgraph/thinking-in-langgraph)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [pgvector Performance](https://github.com/pgvector/pgvector#performance)

---

**作者注**：本文基于 Anthropic 官方架构指南和 LangGraph 生产实践编写。**企业级应用应优先考虑 Workflows**，仅在开放式、探索性任务中使用 Agents。记住：**简单的解决方案往往是最有效的**。