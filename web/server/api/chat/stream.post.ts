import { defineEventHandler, readBody } from "h3"
import { runAgentStream } from "@demo/agent"
import type { AgentAction, AgentStreamEvent } from "@demo/shared"

export default defineEventHandler(async (event) => {
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

  const res = event.node.res
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders?.()

  const writeEvent = (payload: AgentStreamEvent) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  try {
    for await (const chunk of runAgentStream(userInput)) {
      writeEvent(chunk)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    writeEvent({ type: "error", message })
  } finally {
    res.end()
  }
})
