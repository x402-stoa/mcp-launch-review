# Review Rubric

Use this reference when producing a Stoa x402/MCP Launch Review.

## Status Labels

- `supported`: directly backed by supplied public source text, examples, schemas, test evidence, or official docs.
- `weak`: directionally plausible but missing a proof point, example, schema, result, or first-call trace.
- `unsupported`: not proven by the supplied material.
- `blocked`: should not be published without a material rewrite because it implies legal, security, compliance, revenue, buyer demand, production readiness, ranking, guaranteed outcomes, or private access that is not proven.
- `unknown`: cannot be determined from supplied public material.

## Severity

- `P0`: could charge incorrectly, leak secrets, mislead buyers, make illegal/deceptive claims, or create irreversible risk.
- `P1`: likely to reduce buyer trust, first-call success, listing approval, or paid conversion.
- `P2`: clarity, packaging, example, or positioning issue that is useful but not launch-blocking.

## x402 Checklist

Check these items when the launch includes a paid x402 route:

- Valid input fails schema validation before payment.
- Missing or invalid payment does not charge.
- `402 PAYMENT-REQUIRED` binds to the exact public route/resource.
- Network, asset, amount, and payee are explicit.
- Buyer examples include method, body or query params, headers, max amount, and idempotency key.
- Body-required POST routes have a buyer-client discovery plan or a GET/query alternative.
- Payment attempt idempotency binds route, body/query, amount, and payment intent.
- Transaction count and USD caps exist for public tests.
- Logs redact request bodies, auth headers, payment signatures, private keys, wallet material, and env values.
- Kill switch and rollback path are documented.
- Output contract includes success, payment-required, invalid-payment, and no-charge input errors.

## MCP Listing Checklist

Check these items when the launch includes an MCP server or agent-tool listing:

- Tool names and descriptions are concrete, not broad marketing copy.
- Input and output schemas match examples.
- Auth requirements and required API keys are explicit.
- Destructive/write/open-world actions are labeled clearly.
- Setup steps are short enough for a first user.
- Examples show realistic buyer jobs and expected outputs.
- Data access, PII, retention, rate limits, and costs are stated when relevant.
- Claims about official status, security, compliance, ranking, usage, or revenue are directly proven.

## Output Quality Bar

The final review should be useful to a buyer or builder without reading Stoa's internal files. Prefer tables, exact rewrites, and stop conditions over general advice. Every important criticism should include a concrete fix.
