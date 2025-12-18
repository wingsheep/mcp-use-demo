import { OrdersMcpClient } from "../mcpClient.js"

async function main() {
  const client = new OrdersMcpClient()
  const session = await client.init()

  const result = await session.callTool("get_orders", { userId: "demo-user" })

  console.log("Tool call result:")
  console.dir(result.structuredContent ?? result.content, { depth: null })

  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
