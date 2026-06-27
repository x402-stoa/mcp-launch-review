# Stoa Validator MCP Server

Local stdio MCP server for two commercial evidence checks:

- `validate_mcp_listing`: checks whether a public MCP, x402, paid API, or agent-tool listing is ready for free/reversible directory submission without overclaiming demand, ranking, production readiness, or revenue.
- `check_x402_payment_evidence`: classifies x402 paid-call evidence as external-payment-ready, mechanics-only, or repair-before-claim.

This package is a validator and evidence classifier. It does not certify security, prove legal compliance, prove buyer demand, prove durable marketplace ranking, or prove external income.

## Run

```bash
node stoa-validator-mcp-server.mjs
```

The server uses newline-delimited JSON-RPC over `stdin`/`stdout` with MCP `initialize`, `tools/list`, and `tools/call`.

## MCP Client Config

```json
{
  "mcpServers": {
    "stoa-validator": {
      "command": "node",
      "args": ["stoa-validator-mcp-server.mjs"]
    }
  }
}
```

## Sample Inputs

- `sample-requests/mcp-listing-validator-github-repo-ready-request.json`
- `sample-requests/x402-payment-evidence-checker-self-pay.json`

Use the self-pay sample to confirm that settled internal mechanics proof is still guarded from being claimed as external income.
