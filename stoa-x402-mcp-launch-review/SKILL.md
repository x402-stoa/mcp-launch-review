---
name: stoa-x402-mcp-launch-review
description: Create source-grounded launch review packets for x402, MCP, paid API, and agent-tool listings. Use when a user provides public launch material such as a README, docs page, endpoint description, MCP server listing, x402 payment route, pricing note, or marketplace draft and wants buyer-safe listing copy, a claim/evidence matrix, blocked claims, first-call risks, payment/listing risks, and the next concrete launch test.
---

# Stoa x402/MCP Launch Review

## Purpose

Turn public source material for an agent-callable tool into a concise launch-risk packet. The output should help a builder publish clearer claims, safer listing copy, and a better first-call/payment path before asking agents or humans to pay.

Use public sources only. Do not request or inspect private credentials, wallet material, auth headers, payment signatures, private repos, private docs, or full env files.

## Workflow

1. Identify the launch surface: product name, buyer, public source URL or pasted text, intended paid action, current price, supported clients, auth model, and payment or MCP route.
2. Extract claims exactly from the source. Separate capability claims, safety claims, payment claims, buyer-value claims, support claims, pricing claims, and distribution claims.
3. Build a claim/evidence matrix:
   - `supported`: directly backed by source text, examples, tests, or public docs.
   - `weak`: plausible but missing proof, example, schema, or first-call evidence.
   - `unsupported`: not proven by the supplied source.
   - `blocked`: should not be published because it overclaims legal, security, compliance, production readiness, demand, revenue, ranking, or guaranteed outcomes.
4. Review first-call and payment risk. For x402 routes, check for route/resource binding, network, amount, idempotency, invalid-input no-charge behavior, missing/invalid-payment no-charge behavior, body or query discoverability, output contract, logs/redaction, kill switch, cap, rollback, and buyer instructions. For MCP listings, check tool schema clarity, auth/setup burden, data access boundaries, destructive action labels, examples, and client compatibility.
5. Rewrite the listing in buyer-safe language. Keep the value proposition concrete and avoid unsupported proof words.
6. Recommend one next test that can falsify the launch assumption, such as a no-pay first-call probe, a capped paid canary, one direct-buyer feedback ask, or one directory submission.
7. If the user asks for a paid or public action, state the required cap, rollback, no-secret logging, and confirmation boundary before execution.

## Output Format

Return a compact packet with these sections:

1. `Verdict`: one paragraph with a confidence label: `high`, `moderate`, `low`, or `unknown`.
2. `Buyer-Safe Listing`: title, one-line promise, buyer job, input, output, price note, and exclusions.
3. `Claim/Evidence Matrix`: table with claim, evidence, status, and fix.
4. `Blocked Claims`: bullets that should not ship.
5. `First-Call And Payment Risks`: checklist with pass/fail/unknown and next fix.
6. `x402/MCP Metadata Fixes`: concise schema, examples, or listing edits.
7. `Next Test`: one concrete action, success evidence, and stop condition.
8. `Buyer Message`: optional short email/DM when the user asks for outreach copy.

## Non-Claims

Never claim buyer demand, external revenue, Bazaar ranking, production readiness, legal/compliance approval, security certification, guaranteed indexing, guaranteed sales, or autonomous-agent usage unless the user supplies direct evidence and asks you to cite it precisely.

Do not turn a self-paid test into revenue. Label it as mechanics evidence.

## Reference

For stricter review criteria and status definitions, read `references/review-rubric.md`.

Use `assets/review-input-example.json` and `assets/review-output-template.json` when the user wants JSON-shaped intake or output.
