<script setup lang="ts">
import type { UIMessage, UIMessagePart } from "ai"
import type { AgentAction, UIBlock } from "@demo/shared"
import UiResourceRenderer from "./UiResourceRenderer.vue"
import { computed, watch } from "vue"
import MarkdownRender from "markstream-vue"

const props = defineProps<{
  message: UIMessage<any>
}>()

const emit = defineEmits<{
  (e: "action", payload: AgentAction): void
  (e: "content-resized", source?: string): void
}>()

const blocks = computed<UIBlock[]>(() => props.message.metadata?.blocks ?? [])

const fallbackText = computed(() => {
  const textPart = props.message.parts.find(
    (part): part is Extract<UIMessagePart, { type: "text" }> => part.type === "text"
  )
  return textPart?.text ?? ""
})

const markdownSignature = computed(() => {
  if (!blocks.value.length) {
    return fallbackText.value ?? ""
  }
  return blocks.value
    .filter((block) => block.type === "text")
    .map((block) => (block as Extract<UIBlock, { type: "text" }>).content ?? "")
    .join("\n")
})

watch(markdownSignature, () => {
  emit("content-resized", "markdown")
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="!blocks.length && fallbackText">
      {{ fallbackText }}
    </div>
    <template v-else>
      <template v-for="(block, index) in blocks" :key="index">
        <MarkdownRender
          v-if="block.type === 'text'"
          :content="block.content || ''"
          class="text-sm text-gray-900 markstream-content"
        />
        <UiResourceRenderer
          v-else-if="block.type === 'ui_resource'"
          :resource-id="block.resourceId"
          :data="block.data"
          @action="emit('action', $event)"
          @content-resized="emit('content-resized', 'ui_resource')"
        />
        <div v-else-if="block.type === 'actions'" class="flex flex-wrap gap-2">
          <UButton
            v-for="action in block.actions"
            :key="action.label"
            size="xs"
            color="primary"
            variant="ghost"
            @click="emit('action', { name: action.action, params: action.params as any })"
          >
            {{ action.label }}
          </UButton>
        </div>
      </template>
    </template>
  </div>
</template>
