import { checkX402PaymentEvidence } from "./x402-payment-evidence-checker.mjs";
import { validateMcpListing } from "./mcp-listing-validator.mjs";

const PROTOCOL_VERSION = "2025-06-18";

const tools = [
  {
    name: "validate_mcp_listing",
    title: "MCP Listing Validator",
    description:
      "Check whether a public MCP/x402/agent-tool listing is ready for free/reversible directory submission without overclaiming demand, ranking, production readiness, or revenue.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Listing name." },
        shortDescription: { type: "string", description: "One-sentence buyer-facing listing description." },
        link: { type: "string", description: "Durable public HTTPS repo, docs, or site URL." },
        category: { type: "string", description: "Marketplace category." },
        contactEmail: { type: "string", description: "Monitored public contact email." },
        claims: { type: "array", items: { type: "string" }, description: "Optional buyer-facing claims to screen." },
        publicPageQa: {
          type: "object",
          properties: {
            pageStatus: { description: "HTTP/status evidence for the public listing URL." },
            primaryAssetStatus: { description: "HTTP/status evidence for the primary asset link." }
          },
          additionalProperties: true
        },
        paidBoost: { type: "boolean", description: "True if a paid boost is requested." },
        premiumSubmit: { type: "boolean", description: "True if a premium submit path is requested." }
      },
      required: ["name", "shortDescription", "link", "category", "contactEmail"],
      additionalProperties: true
    }
  },
  {
    name: "check_x402_payment_evidence",
    title: "x402 Payment Evidence Checker",
    description:
      "Classify an x402 paid-call evidence bundle as external-payment-ready, mechanics-only, or repair-before-claim.",
    inputSchema: {
      type: "object",
      properties: {
        route: {
          type: "object",
          properties: {
            method: { type: "string" },
            resourceUrl: { type: "string" },
            network: { type: "string" },
            expectedAmountAtomic: { type: "string" },
            requestSchemaValid: { type: "boolean" },
            responseSchemaValid: { type: "boolean" }
          },
          additionalProperties: true
        },
        payment: {
          type: "object",
          properties: {
            status: { type: "string" },
            transactionHash: { type: "string" },
            charged: { type: "boolean" },
            payerExternal: { type: "boolean" },
            selfPay: { type: "boolean" },
            productOutputReturned: { type: "boolean" },
            amountAtomic: { type: "string" },
            maxAmountAtomic: { type: "string" }
          },
          additionalProperties: true
        },
        balanceDelta: { type: "object", additionalProperties: true },
        buyer: { type: "object", additionalProperties: true },
        logs: { type: "object", additionalProperties: true },
        claims: { type: "array", items: { type: "string" } }
      },
      required: ["route", "payment"],
      additionalProperties: true
    }
  }
];

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function result(id, value) {
  send({ jsonrpc: "2.0", id, result: value });
}

function error(id, code, message, data) {
  send({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } });
}

function toolResult(report) {
  return {
    content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
    structuredContent: report,
    isError: false
  };
}

async function handle(message) {
  if (!message || typeof message !== "object" || message.jsonrpc !== "2.0") {
    error(message?.id, -32600, "Invalid JSON-RPC message");
    return;
  }

  const { id, method, params = {} } = message;

  if (method === "notifications/initialized") {
    return;
  }
  if (method === "initialize") {
    result(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: {
        name: "stoa-validator-mcp-server",
        title: "Stoa Validator MCP Server",
        version: "0.1.0"
      },
      instructions:
        "Use these tools for source-grounded listing and payment-evidence checks only. Results do not prove buyer demand, income, durable ranking, production readiness, or legal/security certification."
    });
    return;
  }
  if (method === "ping") {
    result(id, {});
    return;
  }
  if (method === "tools/list") {
    result(id, { tools });
    return;
  }
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments;
    if (!name || !args || typeof args !== "object") {
      error(id, -32602, "tools/call requires params.name and params.arguments");
      return;
    }
    if (name === "validate_mcp_listing") {
      result(id, toolResult(validateMcpListing(args)));
      return;
    }
    if (name === "check_x402_payment_evidence") {
      result(id, toolResult(checkX402PaymentEvidence(args)));
      return;
    }
    error(id, -32602, `Unknown tool: ${name}`);
    return;
  }

  error(id, -32601, `Method not found: ${method}`);
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      void handle(JSON.parse(line));
    } catch (err) {
      error(null, -32700, "Parse error", String(err?.message ?? err));
    }
  }
});
