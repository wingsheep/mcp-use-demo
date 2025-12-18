# AGENTS.md
## MCP-Use × DeepSeek 完整 Demo（Codex 执行版）

> 本文档是 **Codex / Cursor Agent 的执行指令**  
> 目标是实现一个 **完整、可运行、可演示的 mcp-use Demo**  
> 严禁自由发挥、严禁擅自简化架构

> 参考文档：
https://github.com/mcp-use/mcp-use/tree/main
https://github.com/Simon-He95/markstream-vue
https://ui.nuxt.com/docs/components#ai-chat
---

## 🎯 总目标（必须满足）

实现一个 Demo，展示以下能力：

1. 使用 **mcp-use**
2. 使用 **DeepSeek（OpenAI 兼容模式）**
3. 包含：
   - MCP Server
   - MCP Client
   - MCP Agent
   - UI-aware 的结构化响应
   - 前端 Chat UI（Web）
4. AI **不能返回 HTML**
5. AI **不能直接控制 UI**
6. UI 只能由 **UI Resource / UI Block** 决定

---

## 🧱 总体架构（必须遵守）

```
/demo
├─ mcp-server/        # 业务 MCP Server
├─ agent/             # MCP Client + MCP Agent
├─ web/               # Nuxt（内含前端 Chat UI + Nitro API）
├─ shared/            # 共享类型 / UI schema
└─ README.md
```

---

## ✅ 状态标记（AI 自动更新区）
> 仅勾选状态或追加说明，保持标记块格式不变。新增任务请在模板区复制后插入到标记块内部。

<!-- STATUS_BLOCK_START -->
- [x] Phase 0：初始化工程（基础）
- [x] Phase 1：实现 MCP Server（业务层）
- [x] Phase 2：实现 MCP Client（连接层）
- [x] Phase 3：实现 MCP Agent（核心）
- [x] Phase 4：API 层（对前端，集成 Nuxt）
- [x] Phase 5：前端 Chat UI（Web）
- [x] Phase 6：联调与验证
<!-- STATUS_BLOCK_END -->

## 🧩 新任务模板（复制后放入状态标记块内）
```
- [ ] Task X：{任务标题}
  - 目标：{简述目标}
  - 产出：{预期交付物}
  - 验收：{验收标准或验证方式}
```

---

# Phase 0：初始化工程（基础）

### Task 0.1：初始化 Monorepo

- 使用 Node.js ≥ 18
- 使用 TypeScript
- 使用 pnpm / npm 均可

产出：
- 根目录 package.json
- 基础 tsconfig.json

---

# Phase 1：实现 MCP Server（业务层）

## 🎯 目标

实现一个 **独立运行的 MCP Server**，模拟业务能力（订单系统）。

---

### Task 1.1：创建 MCP Server 基础结构

目录：

```
mcp-server/
├─ index.ts
├─ tools/
├─ ui-resources/
└─ data/
```

---

### Task 1.2：实现 Mock 数据

在 `data/orders.ts` 中定义：

```ts
export const orders = [
  {
    id: "A001",
    status: "paid",
    amount: 199,
    items: [
      { name: "Apple", price: 99, quantity: 1 },
      { name: "Banana", price: 50, quantity: 2 }
    ]
  },
  {
    id: "A002",
    status: "pending",
    amount: 89,
    items: [
      { name: "Orange", price: 89, quantity: 1 }
    ]
  }
]
```

---

### Task 1.3：实现 MCP Tool：`get_orders`

**输入**

```json
{
  "userId": "string"
}
```

**输出**

```json
{
  "orders": [
    { "id": "string", "status": "string", "amount": "number" }
  ]
}
```

> 数据直接从 mock 中返回

---

### Task 1.4：实现 MCP Tool：`get_order_detail`

**输入**

```json
{
  "orderId": "string"
}
```

**输出**

```json
{
  "id": "string",
  "status": "string",
  "amount": "number",
  "items": [
    { "name": "string", "price": "number", "quantity": "number" }
  ]
}
```

---

### Task 1.5：定义 UI Resources（关键）

在 `ui-resources/` 中定义 UI 意图描述（JSON）。

#### UI Resource：订单列表表格

```json
{
  "id": "order_table",
  "type": "table",
  "title": "订单列表",
  "columns": [
    { "key": "id", "label": "订单号" },
    { "key": "status", "label": "状态", "badge": true },
    { "key": "amount", "label": "金额", "format": "currency" }
  ],
  "actions": [
    {
      "label": "查看详情",
      "action": "get_order_detail",
      "params": ["id"]
    }
  ]
}
```

规则：
- ❌ 不允许 HTML
- ❌ 不允许 Vue / React
- ✅ 只允许 JSON UI 意图

---

### Task 1.6：MCP Server 返回值规范

所有 Tool 返回值结构必须为：

```ts
{
  data: any,
  ui?: {
    resourceId: string
  }
}
```

---

# Phase 2：实现 MCP Client（连接层）

## 🎯 目标

使用 **mcp-use** 创建 MCP Client，连接刚才的 MCP Server。

---

### Task 2.1：安装依赖

```bash
pnpm add mcp-use
```

---

### Task 2.2：创建 MCP Client

文件：`agent/mcpClient.ts`

要求：

- 使用 stdio / child_process 启动 `mcp-server`
- 自动初始化 session
- 能调用 tools

---

### Task 2.3：验证 MCP Client

编写最小脚本：

- 调用 `get_orders`
- 打印返回值
- 确保 UI Resource 信息存在

---

# Phase 3：实现 MCP Agent（核心）

## 🎯 目标

让 Agent：
- 自动决定是否调用 MCP Tool
- 使用 DeepSeek
- 返回结构化 UI Blocks

---

### Task 3.1：配置 DeepSeek LLM

使用 OpenAI 兼容模式：

```ts
import { ChatOpenAI } from "@langchain/openai"

const llm = new ChatOpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: "deepseek-chat",
  temperature: 0
})
```

---

### Task 3.2：创建 MCP Agent

文件：`agent/agent.ts`

Agent 必须使用：
- mcp-use
- MCP Client
- DeepSeek LLM

---

### Task 3.3：强制 Agent 输出协议（非常重要）

Agent **只能**返回以下结构：

```ts
type AgentResponse = {
  type: "message"
  blocks: UIBlock[]
}

type UIBlock =
  | { type: "text"; content: string }
  | { type: "ui_resource"; resourceId: string; data: any }
  | { type: "actions"; actions: any[] }
```

禁止：
- HTML
- Markdown-only
- 自定义 block 类型

---

### Task 3.4：System Prompt（必须写死）

```text
你是一个业务助手。

你可以调用 MCP 工具获取真实数据。

你必须：
- 在需要数据时调用 MCP Tool
- 使用返回的 UI Resource
- 返回 JSON 结构化结果

禁止：
- 返回 HTML
- 直接描述 UI
- 发明不存在的 UI 类型
```

---

# Phase 4：API 层（对前端，集成 Nuxt）

## 🎯 目标

使用 Nuxt 自带的 Nitro API，在 `web/server/api/chat.post.ts` 暴露统一 Chat API（同源，无需独立进程）。

---

### Task 4.1：实现 `/api/chat`

路径：`web/server/api/chat.post.ts`

- Method: POST
- 输入：

```json
{ "message": "string" }
```

- 输出：

```json
AgentResponse
```

---

### Task 4.2（可选）：支持流式

- 使用 Nitro 事件流（SSE）或 fetch stream
- 按 block 推送

---

# Phase 5：前端 Chat UI（Web）

## 🎯 目标

实现一个 **只负责渲染的 Chat UI**。

---

### Task 5.1：初始化 Nuxt 4

目录：`web/`

- 安装 Nuxt UI
- 启用 AI Chat 组件

---

### Task 5.2：实现 Chat 外壳

使用：
- `UChatPalette`
- `UChatMessages`
- `UChatPrompt`

---

### Task 5.3：实现 Message Renderer（重点）

根据 `block.type` 渲染：

| type | 渲染方式 |
|----|----|
| text | 文本组件 |
| ui_resource | 对应 Vue 组件 |
| actions | 按钮组 |

---

### Task 5.4：UI Resource → Vue 组件映射

示例：

```ts
table → OrderTable.vue
```

规则：
- ❌ 前端不推理
- ❌ 前端不猜业务
- ✅ 只按 resourceId 渲染

---

# Phase 6：联调与验证

## 🎯 必须通过的 Demo 场景

### 场景 1

用户输入：

> “查询订单列表”

系统行为：
1. Agent 调用 `get_orders`
2. 返回：
   - 文本说明
   - 订单表格 UI
   - 可点击操作

---

### 场景 2

用户点击 “查看详情”：

1. 前端发送 action
2. Agent 调用 `get_order_detail`
3. 返回详情 UI

---

## ❌ 禁止事项（任何阶段都不能做）

- AI 生成 HTML
- AI 返回 Vue / React 代码
- 前端写业务逻辑
- MCP Server 写 UI 代码

---

## ✅ 成功标准

- Demo 可启动
- 全链路跑通
- UI 完全由 UI Resource 驱动
- MCP Server / Agent / UI 职责清晰

---

## 🧠 给 Codex 的最终提醒

> **这是一个“参考实现”，不是玩具项目。  
> 请优先保证架构正确性，而不是代码最短。**
