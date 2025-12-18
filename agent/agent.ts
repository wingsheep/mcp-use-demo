import { ChatOpenAI } from "@langchain/openai"
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages"
import { OrdersMcpClient } from "./mcpClient.js"
import { AgentResponse, AgentStreamEvent, UIBlock } from "@demo/shared"

const SYSTEM_PROMPT = `你是一个业务助手。

你可以调用 MCP 工具获取真实数据。

你必须：
- 在需要数据时调用 MCP Tool
- 使用返回的 UI Resource
- 返回 JSON 结构化结果

禁止：
- 返回 HTML
- 直接描述 UI
- 发明不存在的 UI 类型`

const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_orders",
      description: "获取用户的订单列表",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "用户唯一标识（可选）"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_order_detail",
      description: "获取指定订单的详情",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "订单号"
          }
        },
        required: ["orderId"]
      }
    }
  }
]

function extractTextContent(content: AIMessage["content"] | AIMessageChunk["content"]): string {
  if (typeof content === "string") {
    return content
  }

  return content
    .map((chunk) => {
      if (typeof chunk === "string") return chunk
      if (chunk.type === "text" && "text" in chunk) return chunk.text
      return ""
    })
    .filter(Boolean)
    .join("\n")
}

function createModel() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY")
  }

  return new ChatOpenAI({
    configuration: {
      baseURL: "https://api.deepseek.com"
    },
    apiKey,
    model: "deepseek-chat",
    temperature: 0
  })
}

export async function* runAgentStream(
  userMessage: string
): AsyncGenerator<AgentStreamEvent, void, void> {
  const llm = createModel()
  const client = new OrdersMcpClient()
  const baseMessages = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(userMessage)]
  const toolAwareModel = llm.bindTools(TOOL_DEFINITIONS)
  let fullText = ""

  try {
    const firstResponse = await toolAwareModel.invoke(baseMessages)
    const messages = [...baseMessages, firstResponse]
    const toolMessages: ToolMessage[] = []

    if (firstResponse.tool_calls?.length) {
      const session = await client.init()

      for (const call of firstResponse.tool_calls) {
        const result = await session.callTool(call.name, call.args ?? {})
        const structured = (result as any).structuredContent
        const contentForModel = structured ?? result

        if (structured?.ui?.resourceId) {
          const block: UIBlock = {
            type: "ui_resource",
            resourceId: structured.ui.resourceId,
            data: structured.data
          }
          yield { type: "block", block }
        }

        toolMessages.push(
          new ToolMessage({
            tool_call_id: call.id,
            name: call.name,
            content: JSON.stringify({ tool: call.name, result: contentForModel })
          })
        )
      }
    }

    messages.push(...toolMessages)
    messages.push(
      new SystemMessage(
        "根据可用的工具结果，用简洁中文说明当前状态。只回复纯文本描述，避免 HTML 和 Markdown 格式。"
      )
    )

    const stream = await llm.stream(messages)
    for await (const chunk of stream) {
      const delta = extractTextContent(chunk.content)
      if (delta) {
        fullText += delta
        yield { type: "text_delta", delta }
      }
    }

    const text = fullText.trim()
    if (text) {
      yield {
        type: "block",
        block: {
          type: "text",
          content: text
        }
      }
    }

    yield { type: "done" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    yield { type: "error", message }
  } finally {
    await client.close()
  }
}

export async function runAgent(userMessage: string): Promise<AgentResponse> {
  const blocks: UIBlock[] = []
  let text = ""
  let hasTextBlock = false

  for await (const event of runAgentStream(userMessage)) {
    if (event.type === "text_delta") {
      text += event.delta
    } else if (event.type === "block") {
      blocks.push(event.block)
      if (event.block.type === "text") {
        hasTextBlock = true
      }
    } else if (event.type === "error") {
      throw new Error(event.message)
    }
  }

  if (!hasTextBlock && text.trim()) {
    blocks.unshift({
      type: "text",
      content: text.trim()
    })
  }

  return {
    type: "message",
    blocks
  }
}
