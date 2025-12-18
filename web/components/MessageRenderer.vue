<script setup lang="ts">
import type { UIMessage, UIMessagePart } from "ai"
import type { AgentAction, UIBlock } from "@demo/shared"
import UiResourceRenderer from "./UiResourceRenderer.vue"
import { computed } from "vue"

const props = defineProps<{
  message: UIMessage<any>
}>()

const emit = defineEmits<{
  (e: "action", payload: AgentAction): void
}>()

const blocks = computed<UIBlock[]>(() => props.message.metadata?.blocks ?? [])

const fallbackText = computed(() => {
    const textPart = props.message.parts.find(
      (part): part is Extract<UIMessagePart, { type: "text" }> => part.type === "text"
    )
    return textPart?.text ?? ""
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="!blocks.length">
      <p class="text-sm text-gray-800 whitespace-pre-line">{{ fallbackText }}</p>
    </div>
    <template v-else>
      <template v-for="(block, index) in blocks" :key="index">
        <p v-if="block.type === 'text'" class="text-sm text-gray-900 whitespace-pre-line">
          {{ block.content }}
        </p>
        <UiResourceRenderer
          v-else-if="block.type === 'ui_resource'"
          :resource-id="block.resourceId"
          :data="block.data"
          @action="emit('action', $event)"
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
