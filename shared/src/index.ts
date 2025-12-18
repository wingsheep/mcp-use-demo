export const UI_RESOURCE_URI_SCHEME = "ui-resource://"
export const buildUiResourceUri = (resourceId: string) => `${UI_RESOURCE_URI_SCHEME}${resourceId}`

export type ToolResponse<T = unknown> = {
  data: T
  ui?: {
    resourceId: string
  }
}

export type TableColumn = {
  key: string
  label: string
  badge?: boolean
  format?: string
}

export type TableAction = {
  label: string
  action: string
  params?: string[]
}

export type TableUiResource = {
  id: string
  type: "table"
  title: string
  columns: TableColumn[]
  actions?: TableAction[]
}

export type DetailField = {
  key: string
  label: string
  badge?: boolean
  format?: string
}

export type DetailSection = {
  title: string
  type: "table"
  columns: TableColumn[]
  dataKey: string
}

export type DetailUiResource = {
  id: string
  type: "detail"
  title: string
  fields: DetailField[]
  sections: DetailSection[]
}

export type UiResourceDefinition = TableUiResource | DetailUiResource

export type TextBlock = { type: "text"; content: string }
export type UIResourceBlock = {
  type: "ui_resource"
  resourceId: string
  data: unknown
}
export type ActionItem = {
  label: string
  action: string
  params?: Record<string, unknown> | string[]
}
export type ActionsBlock = { type: "actions"; actions: ActionItem[] }

export type UIBlock = TextBlock | UIResourceBlock | ActionsBlock

export type AgentResponse = {
  type: "message"
  blocks: UIBlock[]
}

export type AgentAction = {
  name: string
  params?: Record<string, unknown>
}

export type AgentStreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "block"; block: UIBlock }
  | { type: "error"; message: string }
  | { type: "done" }
