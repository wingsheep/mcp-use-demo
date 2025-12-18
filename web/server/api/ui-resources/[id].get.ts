import { defineEventHandler, getRouterParam } from "h3"
import { getUiResourceDefinition } from "@demo/agent/uiResources"

export default defineEventHandler(async (event) => {
  const resourceId = getRouterParam(event, "id")
  if (!resourceId) {
    event.node.res.statusCode = 400
    return { error: "resourceId is required" }
  }

  try {
    const definition = await getUiResourceDefinition(resourceId)
    return definition
  } catch (error) {
    console.error("Failed to load UI resource", resourceId, error)
    event.node.res.statusCode = 500
    return { error: "Failed to load UI resource" }
  }
})
