<script setup lang="ts">
import { nextTick, ref, watch } from "vue"
import type { AgentAction, UiResourceDefinition } from "@demo/shared"
import { fetchUiResource } from "../utils/uiResources"
import OrderTable from "./OrderTable.vue"
import OrderDetail from "./OrderDetail.vue"

const props = defineProps<{
  resourceId: string
  data?: any
}>()

const emit = defineEmits<{
  (e: "action", payload: AgentAction): void
  (e: "content-resized", source?: string): void
}>()

const runtimeConfig = useRuntimeConfig()
const resource = ref<UiResourceDefinition | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const emitContentResized = async () => {
  await nextTick()
  console.debug('[ui-resource] content resized', { resourceId: props.resourceId })
  emit("content-resized", 'ui_resource')
}

const loadResource = async () => {
  if (!props.resourceId) return
  loading.value = true
  errorMessage.value = null
  try {
    resource.value = await fetchUiResource(
      props.resourceId,
      runtimeConfig.public.apiBase || ""
    )
  } catch (err) {
    console.error("Failed to load UI resource", err)
    errorMessage.value =
      err instanceof Error ? err.message : "无法加载 UI 资源描述"
    resource.value = null
  } finally {
    loading.value = false
    await emitContentResized()
  }
}

watch(
  () => props.resourceId,
  () => {
    loadResource()
  },
  { immediate: true }
)
</script>

<template>
  <div>
    <div
      v-if="loading"
      class="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-500"
    >
      UI 资源加载中……
    </div>
    <UAlert v-else-if="errorMessage" title="缺少 UI 资源" color="error" variant="subtle">
      {{ errorMessage }}
    </UAlert>
    <template v-else-if="resource">
      <OrderTable
        v-if="resource.type === 'table'"
        :resource="resource"
        :data="data"
        @action="emit('action', $event)"
      />
      <OrderDetail
        v-else-if="resource.type === 'detail'"
        :resource="resource"
        :data="data"
        @action="emit('action', $event)"
      />
      <UAlert v-else title="无法渲染" color="warning" variant="subtle">
        暂不支持的 UI 资源类型：{{ resource.type }}
      </UAlert>
    </template>
  </div>
</template>
