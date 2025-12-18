<script setup lang="ts">
import { onMounted, ref, watch } from "vue"
import type { UIMessage, ChatStatus } from "ai"
import type { AgentAction, AgentStreamEvent, UIBlock } from "@demo/shared"
import MessageRenderer from "./components/MessageRenderer.vue"
const colorMode = useColorMode()

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || ""
type ChatMessage = UIMessage<{ blocks?: UIBlock[] }>
const messages = ref<ChatMessage[]>([])

const createId = () =>
  globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`

const input = ref("")
const loading = ref(false)
const chatStatus = ref<ChatStatus>("ready")
const errorMessage = ref<string | null>(null)
const theme = ref<"light" | "dark">("light")
const suggestions = ref<string[]>([
  "帮我看看我的订单",
  "查看订单 A001 详情",
  "有哪些待支付订单？",
  "订单列表按金额排序",
  "刷新最新订单数据"
])
const abortController = ref<AbortController | null>(null)

const applyTheme = (value: "light" | "dark") => {
  const root = document.documentElement
  root.setAttribute("data-theme", value)
  localStorage.setItem("chat-theme", value)
}

onMounted(() => {
  colorMode.preference = "light"
  colorMode.value = "light"
  theme.value = "light"
  applyTheme("light")
})

watch(theme, (value) => {
  applyTheme(value)
})

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light"
}

const sendMessage = async ({ message, action }: { message?: string; action?: AgentAction }) => {
  if (loading.value) return

  const userContent = message ?? (action ? `触发操作：${action.name}` : null)
  if (userContent) {
    messages.value.push({
      id: createId(),
      role: "user",
      parts: [{ type: "text", text: userContent }]
    })
    chatStatus.value = "submitted"
  }

  loading.value = true
  errorMessage.value = null
  chatStatus.value = "streaming"

  const assistantMessage: ChatMessage = {
    id: createId(),
    role: "assistant",
    metadata: { blocks: [] },
    parts: []
  }
  messages.value.push(assistantMessage)
  const updateAssistant = (blocks: UIBlock[]) => {
    assistantMessage.metadata = { ...assistantMessage.metadata, blocks }
    messages.value = messages.value.map((msg) =>
      msg.id === assistantMessage.id ? { ...assistantMessage } : msg
    )
  }
  const url = `${apiBase}/api/chat/stream`
  const controller = new AbortController()
  abortController.value = controller

  const handleStreamEvent = (event: AgentStreamEvent) => {
    const blocks = (assistantMessage.metadata?.blocks ?? []).slice()

    const pushTextToEnd = (content: string) => {
      const idx = blocks.findIndex((b) => b.type === "text")
      if (idx === -1) {
        blocks.push({ type: "text", content })
        return
      }
      const existing = blocks[idx] as any
      blocks.splice(idx, 1)
      blocks.push({ ...existing, content: (existing.content as string) + content })
    }

    const replaceTextAtEnd = (newContent: string) => {
      const idx = blocks.findIndex((b) => b.type === "text")
      if (idx !== -1) {
        blocks.splice(idx, 1)
      }
      blocks.push({ type: "text", content: newContent })
    }

    if (event.type === "text_delta") {
      pushTextToEnd(event.delta)
      updateAssistant(blocks)
      return
    }

    if (event.type === "block") {
      if (event.block.type === "text") {
        replaceTextAtEnd(event.block.content)
      } else {
        blocks.push(event.block)
      }
      updateAssistant(blocks)
      return
    }

    if (event.type === "error") {
      errorMessage.value = event.message || "请求失败，请稍后再试"
      return
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ message, action }),
      headers: { "Content-Type": "application/json" },
      signal: controller.signal
    })

    if (!response.ok || !response.body) {
      throw new Error("请求失败")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let done = false

    const processBuffer = () => {
      const events = buffer.split("\n\n")
      buffer = events.pop() ?? ""

      for (const raw of events) {
        const dataLine = raw
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line.startsWith("data:"))
        if (!dataLine) continue

        const payload = dataLine.replace(/^data:/, "").trim()
        if (!payload) continue

        const evt = JSON.parse(payload) as AgentStreamEvent
        if (evt.type === "done") {
          done = true
          chatStatus.value = "ready"
          break
        }
        handleStreamEvent(evt)
      }
    }

    while (!done) {
      const { value, done: streamDone } = await reader.read()
      if (streamDone) break
      buffer += decoder.decode(value, { stream: true })
      processBuffer()
    }

    buffer += decoder.decode()
    if (buffer.trim() && !done) {
      processBuffer()
    }
  } catch (err) {
    console.error(err)
    errorMessage.value = "请求失败，请稍后再试"
    chatStatus.value = "error"
  } finally {
    loading.value = false
    if (chatStatus.value === "streaming") {
      chatStatus.value = "ready"
    }
    abortController.value = null
  }
}

const onSubmit = async (event: Event) => {
  event.preventDefault()
  const text = input.value.trim()
  if (!text) return
  await sendMessage({ message: text })
  input.value = ""
}

const handleAction = async (action: AgentAction) => {
  await sendMessage({ action })
}

const useSuggestion = async (text: string) => {
  input.value = ""
  await sendMessage({ message: text })
}

const triggerSubmit = () => onSubmit(new Event("submit"))
</script>

<template>
  <UApp>
    <UPage class="chat-shell">
      <div class="theme-toggle">
        <!-- <UButton icon="i-heroicons-sun" variant="ghost" size="sm" color="primary" @click="toggleTheme">
          {{ theme === "light" ? "暗色模式" : "亮色模式" }}
        </UButton> -->
      </div>

      <UContainer class="py-12">
        <template v-if="!messages.length">
          <div class="chat-hero">
            <h1 class="hero-title">我能帮你做什么？</h1>
            <p class="hero-subtitle">订单助手 · MCP × DeepSeek · UI Resource 驱动</p>
          </div>

          <div class="prompt-card">
            <div class="flex items-center gap-3">
              <UChatPrompt
                v-model="input"
                :loading="loading"
                :submit-button="false"
                placeholder="输入你的问题，例如：帮我看看我的订单"
                class="prompt-input flex-1"
                @submit="onSubmit"
              />
              <UChatPromptSubmit
                class="absolute right-8"
                :status="chatStatus"
                color="neutral"
                variant="soft"
                @click="triggerSubmit"
              />
            </div>
          </div>

         
        </template>

        <div v-else class="chat-history">
          <UChatPalette class="chat-card mx-auto max-w-4xl overflow-hidden rounded-2xl">
            <div class="chat-messages max-h-[65vh] overflow-y-auto p-4">
              <UChatMessages
                :messages="messages"
                :status="chatStatus"
                :should-auto-scroll="true"
                :should-scroll-to-bottom="true"
                :assistant="{ variant: 'naked' }"
                :user="{ variant: 'soft' }"
                class="space-y-3"
              >
                <template #content="{ message }">
                  <MessageRenderer :message="message" @action="handleAction" />
                </template>
              </UChatMessages>
            </div>

            <template #prompt>
              <div class="chat-input border-t">
                <div class="flex items-center gap-3">
                  <UChatPrompt
                    v-model="input"
                    :loading="loading"
                    :submit-button="false"
                    placeholder="继续提问或点击快捷问题"
                    class="flex-1"
                    @submit="onSubmit"
                  />
                  <UChatPromptSubmit
                    class="absolute right-8"
                    :status="chatStatus"
                    color="neutral"
                    variant="soft"
                    @click="triggerSubmit"
                  />
                </div>
                <p v-if="errorMessage" class="mt-2 text-xs text-red-500">{{ errorMessage }}</p>
              </div>
            </template>
          </UChatPalette>
        </div>
        <div class="suggestions" v-if="suggestions.length">
          <UButton
            v-for="item in suggestions"
            :key="item"
            variant="ghost"
            size="sm"
            color="info"
            class="suggestion-chip"
            @click="useSuggestion(item)"
          >
            {{ item }}
          </UButton>
        </div>
      </UContainer>
    </UPage>
  </UApp>
</template>
