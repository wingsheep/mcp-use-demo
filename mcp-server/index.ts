import { StdioServerTransport } from "@mcp-use/modelcontextprotocol-sdk/server/stdio.js"
import { MCPServer } from "mcp-use/server"
import { z } from "zod"
import { ToolResponse, UiResourceDefinition, buildUiResourceUri } from "@demo/shared"
import { orders } from "./data/orders.js"
import orderTableResource from "./ui-resources/order_table.json" assert { type: "json" }
import orderDetailResource from "./ui-resources/order_detail.json" assert { type: "json" }

const ORDER_TABLE_RESOURCE_ID = "order_table"
const ORDER_DETAIL_RESOURCE_ID = "order_detail"
const uiResourceDefinitions: Record<string, UiResourceDefinition> = {
  [ORDER_TABLE_RESOURCE_ID]: orderTableResource as UiResourceDefinition,
  [ORDER_DETAIL_RESOURCE_ID]: orderDetailResource as UiResourceDefinition
}

const server = new MCPServer({
  name: "orders-mcp-server",
  version: "0.1.0",
  description: "Orders MCP Server"
})

for (const [id, definition] of Object.entries(uiResourceDefinitions)) {
  const uri = buildUiResourceUri(id)
  server.resource({
    name: id,
    description: `UI schema for ${id}`,
    uri,
    mimeType: "application/json",
    readCallback: async () => ({
      contents: [
        {
          uri,
          text: JSON.stringify(definition),
          mimeType: "application/json"
        }
      ]
    })
  })
}

const orderListOutputSchema = z.object({
  data: z.object({
    orders: z.array(
      z.object({
        id: z.string(),
        status: z.string(),
        amount: z.number()
      })
    )
  }),
  ui: z
    .object({
      resourceId: z.string()
    })
    .optional()
})

const orderDetailOutputSchema = z.object({
  data: z.union([
    z.object({
      id: z.string(),
      status: z.string(),
      amount: z.number(),
      items: z.array(
        z.object({
          name: z.string(),
          price: z.number(),
          quantity: z.number()
        })
      )
    }),
    z.null()
  ]),
  ui: z
    .object({
      resourceId: z.string()
    })
    .optional()
})

server.tool(
  {
    name: "get_orders",
    title: "Get Orders",
    description: "Return order summaries for the current user",
    schema: z.object({
      userId: z.string().optional()
    }),
    outputSchema: orderListOutputSchema
  },
  async ({ userId }) => {
    const orderSummaries = orders.map(({ id, status, amount }) => ({ id, status, amount }))
    const response: ToolResponse<{ orders: typeof orderSummaries }> = {
      data: {
        orders: orderSummaries
      },
      ui: {
        resourceId: ORDER_TABLE_RESOURCE_ID
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Found ${orderSummaries.length} orders for user ${userId || "unknown"}.`
        }
      ],
      structuredContent: response
    }
  }
)

server.tool(
  {
    name: "get_order_detail",
    title: "Get Order Detail",
    description: "Return detail for a specific order",
    schema: z.object({
      orderId: z.string()
    }),
    outputSchema: orderDetailOutputSchema
  },
  async ({ orderId }) => {
    const order = orders.find((item) => item.id === orderId)

    if (!order) {
      return {
        content: [
          {
            type: "text",
            text: `Order ${orderId} not found.`
          }
        ],
        structuredContent: {
          data: null
        },
        isError: true
      }
    }

    const response: ToolResponse<typeof order> = {
      data: order,
      ui: {
        resourceId: ORDER_DETAIL_RESOURCE_ID
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Order ${orderId} loaded.`
        }
      ],
      structuredContent: response
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  const sessionServer = server.getServerForSession()
  await sessionServer.connect(transport)
}

main().catch((err) => {
  console.error("MCP server failed", err)
  process.exit(1)
})
