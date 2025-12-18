import { OrdersMcpClient } from "./mcpClient.js"
import { buildUiResourceUri, UiResourceDefinition } from "@demo/shared"

export async function getUiResourceDefinition(resourceId: string): Promise<UiResourceDefinition> {
  const client = new OrdersMcpClient()
  try {
    const session = await client.init()
    const uri = buildUiResourceUri(resourceId)
    const result = await session.readResource(uri)
    const firstContent = result.contents?.[0]
    const text = firstContent && "text" in firstContent ? firstContent.text : null
    if (!text) {
      throw new Error(`UI resource ${resourceId} has no textual content`)
    }
    const parsed = JSON.parse(text) as UiResourceDefinition
    return parsed
  } finally {
    await client.close()
  }
}
