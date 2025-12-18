<script setup lang="ts">
import { computed } from "vue"
import type { AgentAction, TableUiResource } from "@demo/shared"

const props = defineProps<{
  resource: TableUiResource
  data?: { orders?: any[] }
}>()

const emit = defineEmits<{
  (e: "action", payload: AgentAction): void
}>()

const rows = computed(() => props.data?.orders ?? [])

function formatValue(value: unknown, column: any) {
  if (column?.format === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value)
  }
  return value as string
}

function handleAction(action: any, row: any) {
  if (!action) return
  const params: Record<string, unknown> = {}
  ;(action.params as string[] | undefined)?.forEach((key: string) => {
    params[key] = row[key]
  })
  if (action.action === "get_order_detail" && params.id) {
    params.orderId = params.id
  }
  emit("action", { name: action.action, params })
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-sm font-semibold text-gray-800">{{ resource.title }}</div>
      <div class="text-xs text-gray-500">{{ rows.length }} 条记录</div>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-gray-100">
        <thead class="bg-gray-50">
          <tr>
            <th v-for="column in resource.columns" :key="column.key" class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
              {{ column.label }}
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="row in rows" :key="row.id" class="hover:bg-gray-50">
            <td v-for="column in resource.columns" :key="column.key" class="px-4 py-3 text-sm text-gray-800">
              <span
                v-if="column.badge"
                class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {{ formatValue(row[column.key], column) }}
              </span>
              <span v-else>
                {{ formatValue(row[column.key], column) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <UButton
                  v-for="action in resource.actions"
                  :key="action.label"
                  size="xs"
                  color="primary"
                  variant="ghost"
                  @click="handleAction(action, row)"
                >
                  {{ action.label }}
                </UButton>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="resource.columns.length + 1" class="px-4 py-6 text-center text-sm text-gray-500">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
