<script setup lang="ts">
import type { AgentAction, DetailUiResource } from "@demo/shared"

const props = defineProps<{
  resource: DetailUiResource
  data?: any
}>()

const emit = defineEmits<{
  (e: "action", payload: AgentAction): void
}>()

function formatValue(value: unknown, column: any) {
  if (column?.format === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value)
  }
  return value as string
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="text-sm font-semibold text-gray-800">{{ resource.title }}</div>
      <div class="text-xs text-gray-500">{{ data?.id }}</div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div v-for="field in resource.fields" :key="field.key" class="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div class="text-xs text-gray-500">{{ field.label }}</div>
        <div class="text-sm font-semibold text-gray-900">
          <span
            v-if="field.badge"
            class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
          >
            {{ formatValue(data?.[field.key], field) }}
          </span>
          <span v-else>{{ formatValue(data?.[field.key], field) }}</span>
        </div>
      </div>
    </div>

    <div v-for="section in resource.sections" :key="section.title" class="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">{{ section.title }}</div>
      <table class="min-w-full divide-y divide-gray-100">
        <thead class="bg-gray-50">
          <tr>
            <th v-for="column in section.columns" :key="column.key" class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in data?.[section.dataKey] || []" :key="item.name" class="hover:bg-gray-50">
            <td v-for="column in section.columns" :key="column.key" class="px-4 py-3 text-sm text-gray-800">
              {{ formatValue(item[column.key], column) }}
            </td>
          </tr>
          <tr v-if="!data?.[section.dataKey]?.length">
            <td :colspan="section.columns.length" class="px-4 py-6 text-center text-sm text-gray-500">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
