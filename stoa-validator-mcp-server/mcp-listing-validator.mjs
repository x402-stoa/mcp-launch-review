import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DURABLE_BLOCKLIST = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "trycloudflare.com",
  "loca.lt",
  "localtunnel",
  "ngrok",
  "example.com",
  "stoa.local",
];
const HYPE_OR_OVERCLAIM_RE = /\b(guarantee[sd]?|certified|officially endorsed|production[- ]ready|best[- ]in[- ]class|revenue|ranking|compliance approved|secure by default|zero risk)\b/i;
const X402_RE = /\bx402\b/i;
const MCP_RE = /\bmcp\b/i;

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function addCheck(checks, id, status, severity, evidence, fix) {
  checks.push({ id, status, severity, evidence, fix });
}

function normalizeListing(input) {
  return {
    name: String(input.name ?? input.serverName ?? input.title ?? "").trim(),
    shortDescription: String(input.shortDescription ?? input.description ?? "").trim(),
    link: String(input.link ?? input.url ?? input.publicUrl ?? "").trim(),
    category: String(input.category ?? "").trim(),
    contactEmail: String(input.contactEmail ?? input.email ?? "").trim(),
    claims: Array.isArray(input.claims) ? input.claims.map((claim) => String(claim).trim()).filter(Boolean) : [],
    publicPageQa: input.publicPageQa && typeof input.publicPageQa === "object" ? input.publicPageQa : {},
  };
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isDurableUrl(url) {
  const hostAndHref = `${url.hostname} ${url.href}`.toLowerCase();
  return !DURABLE_BLOCKLIST.some((term) => hostAndHref.includes(term));
}

function qaStatusOk(value) {
  return value === 200 || value === "200" || value === true || value === "ok" || value === "pass";
}

export function validateMcpListing(input) {
  const listing = normalizeListing(input);
  const checks = [];
  const textForClaims = `${listing.name}\n${listing.shortDescription}\n${listing.claims.join("\n")}`;

  addCheck(
    checks,
    "name",
    listing.name.length >= 4 && listing.name.length <= 80 ? "pass" : "fix",
    "P1",
    listing.name || "missing",
    "Use a specific listing name between 4 and 80 characters."
  );

  addCheck(
    checks,
    "short_description",
    listing.shortDescription.length >= 40 && listing.shortDescription.length <= 180 ? "pass" : "fix",
    "P1",
    `${listing.shortDescription.length} characters`,
    "Use a concrete one-sentence description between 40 and 180 characters."
  );

  const parsedUrl = parseUrl(listing.link);
  addCheck(
    checks,
    "link_https",
    parsedUrl?.protocol === "https:" ? "pass" : "fix",
    "P0",
    listing.link || "missing",
    "Use a public https URL."
  );
  addCheck(
    checks,
    "link_durable",
    parsedUrl && parsedUrl.protocol === "https:" && isDurableUrl(parsedUrl) ? "pass" : "fix",
    "P0",
    parsedUrl?.hostname || "missing",
    "Use a durable public repo/docs/site URL, not localhost, temporary tunnel, example, or test host."
  );

  addCheck(
    checks,
    "category",
    listing.category.length >= 3 ? "pass" : "fix",
    "P2",
    listing.category || "missing",
    "Choose the closest marketplace category, usually Development, Developer Tools, API, or MCP."
  );

  addCheck(
    checks,
    "contact_email",
    EMAIL_RE.test(listing.contactEmail) ? "pass" : "fix",
    "P1",
    listing.contactEmail || "missing",
    "Use a monitored contact email for replies, bounces, and buyer follow-up."
  );

  addCheck(
    checks,
    "mcp_or_x402_positioning",
    MCP_RE.test(textForClaims) || X402_RE.test(textForClaims) ? "pass" : "fix",
    "P2",
    listing.shortDescription,
    "Name MCP, x402, paid API, or agent-tool context so the listing is searchable and commercially legible."
  );

  const overclaim = HYPE_OR_OVERCLAIM_RE.exec(textForClaims);
  addCheck(
    checks,
    "blocked_overclaims",
    overclaim ? "guard" : "pass",
    "P0",
    overclaim?.[0] || "none detected",
    "Remove unsupported demand, revenue, ranking, production-readiness, certification, endorsement, guarantee, and compliance claims."
  );

  addCheck(
    checks,
    "public_page_reachable",
    qaStatusOk(listing.publicPageQa.pageStatus) ? "pass" : "fix",
    "P1",
    String(listing.publicPageQa.pageStatus ?? "not supplied"),
    "Verify the public listing URL returns HTTP 200 before submitting."
  );

  addCheck(
    checks,
    "primary_asset_link",
    qaStatusOk(listing.publicPageQa.primaryAssetStatus) ? "pass" : "fix",
    "P1",
    String(listing.publicPageQa.primaryAssetStatus ?? "not supplied"),
    "Verify the primary buyer-facing asset link, such as SKILL.md or docs, returns HTTP 200 before submitting."
  );

  addCheck(
    checks,
    "no_paid_boost",
    input.paidBoost === true || input.premiumSubmit === true ? "guard" : "pass",
    "P0",
    input.paidBoost === true || input.premiumSubmit === true ? "paid option requested" : "free path",
    "Use free/reversible submission only unless Sean explicitly approves paid boost or seller commitment."
  );

  const summary = {
    pass: checks.filter((check) => check.status === "pass").length,
    fix: checks.filter((check) => check.status === "fix").length,
    guard: checks.filter((check) => check.status === "guard").length,
  };
  const submissionReady = summary.fix === 0 && summary.guard === 0;

  return {
    productSurface: "stoa_mcp_listing_validator_v0",
    generatedAt: new Date().toISOString(),
    decision: submissionReady ? "READY_FOR_FREE_DIRECTORY_SUBMISSION" : "REPAIR_BEFORE_SUBMISSION",
    submissionReady,
    listing,
    summary,
    checks,
    nonClaims: [
      "No external income, buyer demand, durable ranking, or production readiness is claimed.",
      "This validator checks listing readiness only; it does not prove marketplace acceptance or buyer willingness to pay.",
      "Paid boosts, seller commitments, wallet actions, and outbound messages remain confirmation-gated.",
    ],
    nextAction: submissionReady
      ? "Submit only the exact free/reversible fields after Sean confirms the marketplace action."
      : "Fix all P0/P1 listing issues, then re-run the validator before submission.",
  };
}

function renderHtml(report) {
  const rows = report.checks.map((check) => `<tr>
    <td>${escapeHtml(check.id)}</td>
    <td><strong>${escapeHtml(check.status)}</strong></td>
    <td>${escapeHtml(check.severity)}</td>
    <td>${escapeHtml(check.evidence)}</td>
    <td>${escapeHtml(check.fix)}</td>
  </tr>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stoa MCP Listing Validator</title>
  <style>
    body{margin:0;background:#f7faf7;color:#18211d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{max-width:1080px;margin:0 auto;padding:28px 18px 48px}
    header{border-bottom:1px solid #dce4dd;margin-bottom:18px;padding-bottom:16px}
    h1{font-size:clamp(28px,4vw,44px);line-height:1.05;margin:0 0 10px}
    p,li{color:#5d675f;line-height:1.5}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:18px 0}
    .card{background:white;border:1px solid #dce4dd;border-radius:8px;padding:12px}
    .label{font-size:12px;text-transform:uppercase;color:#5d675f;font-weight:800}
    .value{font-size:24px;font-weight:850;margin-top:4px}
    table{width:100%;border-collapse:collapse;background:white;border:1px solid #dce4dd;border-radius:8px;overflow:hidden}
    th,td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #dce4dd}
    th{background:#eef4ef}
    tr:last-child td{border-bottom:0}
  </style>
</head>
<body><main>
  <header>
    <h1>MCP Listing Validator</h1>
    <p>Deterministic readiness check for a free/reversible MCP directory listing. This is not buyer demand, marketplace acceptance, or revenue evidence.</p>
  </header>
  <section class="grid">
    <div class="card"><div class="label">Decision</div><div class="value">${escapeHtml(report.decision)}</div></div>
    <div class="card"><div class="label">Pass</div><div class="value">${report.summary.pass}</div></div>
    <div class="card"><div class="label">Fix</div><div class="value">${report.summary.fix}</div></div>
    <div class="card"><div class="label">Guard</div><div class="value">${report.summary.guard}</div></div>
  </section>
  <table><thead><tr><th>Check</th><th>Status</th><th>Severity</th><th>Evidence</th><th>Fix</th></tr></thead><tbody>${rows}</tbody></table>
</main></body></html>`;
}

export async function runMcpListingValidatorCli({ inputPath, outPath } = {}) {
  const input = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const report = validateMcpListing(input);
  if (outPath) {
    const resolvedOut = resolve(outPath);
    await mkdir(dirname(resolvedOut), { recursive: true });
    await writeFile(resolvedOut, `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(resolvedOut.replace(/\.json$/i, ".html"), renderHtml(report));
  }
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputPath = readArg("input");
  const outPath = readArg("out");
  if (!inputPath) {
    throw new Error("Usage: node mcp-listing-validator.mjs --input <listing.json> [--out <report.json>]");
  }
  const report = await runMcpListingValidatorCli({ inputPath, outPath });
  console.log(JSON.stringify(report, null, 2));
}
