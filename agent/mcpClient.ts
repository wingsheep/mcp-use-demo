import { MCPClient, MCPSession } from "mcp-use/client"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type McpClientOptions = {
  command?: string
  args?: string[]
  env?: NodeJS.ProcessEnv
}

const ensureLocalStorage = () => {
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).localStorage = storage
  }
}

export class OrdersMcpClient {
  private session: MCPSession | null = null
  private client: MCPClient | null = null
  private readonly serverEntry: string
  private readonly command: string
  private readonly args: string[]
  private readonly env: NodeJS.ProcessEnv

  constructor(options: McpClientOptions = {}) {
    this.serverEntry = resolveServerEntry()

    this.command = options.command ?? process.env.MCP_SERVER_COMMAND ?? "pnpm"
    this.args =
      options.args ?? process.env.MCP_SERVER_ARGS?.split(" ") ?? ["exec", "tsx", this.serverEntry]
    this.env = {
      ...process.env,
      ...options.env
    }
  }

  async init() {
    if (this.session) return this.session

    ensureLocalStorage()
    if (!process.env.MCP_USE_ANONYMIZED_TELEMETRY) {
      process.env.MCP_USE_ANONYMIZED_TELEMETRY = "false"
    }

    this.client = new MCPClient()
    this.client.addServer("orders", {
      command: this.command,
      args: this.args,
      env: this.env
    })

    this.session = await this.client.createSession("orders", true)
    return this.session
  }

  requireSession() {
    if (!this.session) {
      throw new Error("MCP session not initialized. Call init() first.")
    }
    return this.session
  }

  async callTool(name: string, args: Record<string, unknown>) {
    const session = await this.init()
    return session.callTool(name, args)
  }

  async close() {
    await this.client?.closeAllSessions()
    this.session = null
    this.client = null
  }
}

function resolveServerEntry() {
  if (process.env.MCP_SERVER_ENTRY) {
    return process.env.MCP_SERVER_ENTRY
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const candidates = [
    path.resolve(__dirname, "../mcp-server/index.ts"),
    // When bundled into .nuxt, __dirname points to .nuxt/...; climb from current working directory.
    path.resolve(process.cwd(), "../mcp-server/index.ts"),
    path.resolve(process.cwd(), "mcp-server/index.ts")
  ]

  const hit = candidates.find((p) => fs.existsSync(p))
  if (!hit) {
    throw new Error(`MCP server entry not found. Tried: ${candidates.join(", ")}`)
  }
  return hit
}
