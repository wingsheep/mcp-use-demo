import type { UiResourceDefinition } from "@demo/shared"

const resourceCache = new Map<string, UiResourceDefinition>()
const inflight = new Map<string, Promise<UiResourceDefinition>>()

export function clearUiResourceCache() {
  resourceCache.clear()
  inflight.clear()
}

export async function fetchUiResource(resourceId: string, apiBase = "") {
  if (resourceCache.has(resourceId)) {
    return resourceCache.get(resourceId)!
  }
  if (inflight.has(resourceId)) {
    return inflight.get(resourceId)!
  }

  const prefix = apiBase.replace(/\/$/, "")
  const promise = fetch(`${prefix}/api/ui-resources/${resourceId}`)
    .then(async (response) => {
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Failed to load UI resource")
      }
      return (await response.json()) as UiResourceDefinition
    })
    .then((definition) => {
      resourceCache.set(resourceId, definition)
      inflight.delete(resourceId)
      return definition
    })
    .catch((error) => {
      inflight.delete(resourceId)
      throw error
    })

  inflight.set(resourceId, promise)
  return promise
}
