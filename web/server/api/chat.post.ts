import { defineEventHandler, readBody } from "h3"
import { runAgent } from "@demo/agent"
import type { AgentAction, AgentResponse } from "@demo/shared"

export default defineEventHandler(async event => {
  const body = (await readBody<{ message?: string; action?: AgentAction }>(event)) || {}
  const { message, action } = body

  if (!message && !action) {
    event.node.res.statusCode = 400
    return { error: "`message` or `action` is required" }
  }

  const userInput =
    typeof message === "string" && message
      ? message
      : action
        ? `用户点击操作 ${action.name}，参数：${JSON.stringify(action.params ?? {})}`
        : ""

  try {
    const result: AgentResponse = await runAgent(userInput)
    return result
  } catch (error) {
    console.error("/api/chat error", error)
    event.node.res.statusCode = 500
    return { error: "Failed to handle chat" }
  }
})
