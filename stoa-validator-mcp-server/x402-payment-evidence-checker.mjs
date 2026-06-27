import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const NETWORK_RE = /^eip155:\d+$/;
const DURABLE_TEMP_HOST_RE = /\b(localhost|127\.0\.0\.1|0\.0\.0\.0|trycloudflare\.com|loca\.lt|localtunnel|ngrok|example\.com)\b/i;
const CLAIM_OVERREACH_RE = /\b(buyer demand|revenue traction|durable ranking|production[- ]ready|officially endorsed|guarantee[sd]?|certified|zero risk)\b/i;

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

function isHttpsUrl(value) {
  try {
    return new URL(String(value)).protocol === "https:";
  } catch {
    return false;
  }
}

function normalize(input) {
  const route = input.route ?? {};
  const payment = input.payment ?? {};
  const balanceDelta = input.balanceDelta ?? {};
  const buyer = input.buyer ?? {};
  const logs = input.logs ?? {};
  const claims = Array.isArray(input.claims) ? input.claims.map((claim) => String(claim)) : [];

  return {
    route: {
      method: String(route.method ?? "").toUpperCase(),
      resourceUrl: String(route.resourceUrl ?? route.resource ?? "").trim(),
      network: String(route.network ?? payment.network ?? "").trim(),
      expectedAmountAtomic: String(route.expectedAmountAtomic ?? payment.amountAtomic ?? "").trim(),
      responseSchemaValid: route.responseSchemaValid === true,
      requestSchemaValid: route.requestSchemaValid !== false,
    },
    payment: {
      status: String(payment.status ?? "").trim().toLowerCase(),
      transactionHash: String(payment.transactionHash ?? "").trim(),
      productOutputReturned: payment.productOutputReturned === true,
      charged: payment.charged === true,
      payerExternal: payment.payerExternal === true,
      selfPay: payment.selfPay === true || buyer.isSean === true,
      amountAtomic: String(payment.amountAtomic ?? "").trim(),
      maxAmountAtomic: String(payment.maxAmountAtomic ?? "").trim(),
    },
    balanceDelta: {
      status: String(balanceDelta.status ?? "").trim().toLowerCase(),
      buyerDeltaAtomic: String(balanceDelta.buyerDeltaAtomic ?? balanceDelta.deltaAtomic ?? "").trim(),
      receiverDeltaAtomic: String(balanceDelta.receiverDeltaAtomic ?? "").trim(),
    },
    buyer: {
      name: String(buyer.name ?? "").trim(),
      sourceOfFunds: String(buyer.sourceOfFunds ?? "").trim(),
      isSean: buyer.isSean === true,
    },
    logs: {
      redacted: logs.redacted === true,
      rawPaymentHeaderPresent: logs.rawPaymentHeaderPresent === true,
      rawAuthPresent: logs.rawAuthPresent === true,
      rawPrivateMaterialPresent: logs.rawPrivateMaterialPresent === true,
    },
    rollbackObserved: input.rollbackObserved === true,
    claims,
  };
}

export function checkX402PaymentEvidence(input) {
  const evidence = normalize(input);
  const checks = [];

  addCheck(
    checks,
    "resource_https",
    isHttpsUrl(evidence.route.resourceUrl) ? "pass" : "fix",
    "P0",
    evidence.route.resourceUrl || "missing",
    "Use the exact public HTTPS resource URL that the payment requirement bound."
  );
  addCheck(
    checks,
    "resource_not_temporary",
    evidence.route.resourceUrl && !DURABLE_TEMP_HOST_RE.test(evidence.route.resourceUrl) ? "pass" : "fix",
    "P1",
    evidence.route.resourceUrl || "missing",
    "Use a durable public URL for buyer-facing payment evidence; temporary tunnels can prove mechanics but are weak for a listing claim."
  );
  addCheck(
    checks,
    "network_valid",
    NETWORK_RE.test(evidence.route.network) ? "pass" : "fix",
    "P0",
    evidence.route.network || "missing",
    "Record the exact x402 network such as eip155:8453."
  );
  addCheck(
    checks,
    "transaction_hash",
    HASH_RE.test(evidence.payment.transactionHash) ? "pass" : "fix",
    "P0",
    evidence.payment.transactionHash || "missing",
    "Capture a public settlement transaction hash for paid evidence."
  );
  addCheck(
    checks,
    "payment_settled_or_received",
    ["settled", "received", "paid"].includes(evidence.payment.status) && evidence.payment.charged ? "pass" : "fix",
    "P0",
    evidence.payment.status || "missing",
    "Only settled/paid/received charged calls can be payment evidence."
  );
  addCheck(
    checks,
    "non_sean_external_payer",
    evidence.payment.payerExternal && !evidence.payment.selfPay && !evidence.buyer.isSean && /external|non[-_ ]?sean/i.test(evidence.buyer.sourceOfFunds) ? "pass" : "guard",
    "P0",
    evidence.buyer.sourceOfFunds || (evidence.payment.selfPay ? "self-pay" : "missing"),
    "Separate mechanics proof from external buyer evidence; Sean-funded self-pay cannot count as external income or demand."
  );
  addCheck(
    checks,
    "product_output_returned",
    evidence.payment.productOutputReturned ? "pass" : "fix",
    "P0",
    String(evidence.payment.productOutputReturned),
    "Link the payment to a real product response or paid entitlement."
  );
  addCheck(
    checks,
    "balance_delta",
    evidence.balanceDelta.status === "balance-delta-observed" && Boolean(evidence.balanceDelta.buyerDeltaAtomic) ? "pass" : "fix",
    "P1",
    evidence.balanceDelta.status || "missing",
    "Record redacted before/after balance-delta evidence or equivalent receipt evidence."
  );
  addCheck(
    checks,
    "schema_valid",
    evidence.route.requestSchemaValid && evidence.route.responseSchemaValid ? "pass" : "fix",
    "P1",
    `request=${evidence.route.requestSchemaValid} response=${evidence.route.responseSchemaValid}`,
    "Verify the paid call used the intended request and returned schema-valid output."
  );
  addCheck(
    checks,
    "logs_redacted",
    evidence.logs.redacted && !evidence.logs.rawPaymentHeaderPresent && !evidence.logs.rawAuthPresent && !evidence.logs.rawPrivateMaterialPresent ? "pass" : "guard",
    "P0",
    `redacted=${evidence.logs.redacted}`,
    "Redact payment headers, signatures, auth material, private keys, and wallet secrets before sharing evidence."
  );
  addCheck(
    checks,
    "no_claim_overreach",
    evidence.claims.some((claim) => CLAIM_OVERREACH_RE.test(claim)) ? "guard" : "pass",
    "P0",
    evidence.claims.find((claim) => CLAIM_OVERREACH_RE.test(claim)) || "none detected",
    "Do not convert one payment proof into unsupported demand, ranking, production, endorsement, guarantee, or revenue-traction claims."
  );

  const summary = {
    pass: checks.filter((check) => check.status === "pass").length,
    fix: checks.filter((check) => check.status === "fix").length,
    guard: checks.filter((check) => check.status === "guard").length,
  };
  const externalPaymentEvidenceReady = summary.fix === 0 && summary.guard === 0;
  const mechanicsProofOnly = summary.fix === 0 && checks.some((check) => check.id === "non_sean_external_payer" && check.status === "guard");

  return {
    productSurface: "stoa_x402_payment_evidence_checker_v0",
    generatedAt: new Date().toISOString(),
    decision: externalPaymentEvidenceReady
      ? "EXTERNAL_PAYMENT_EVIDENCE_READY"
      : mechanicsProofOnly
        ? "MECHANICS_PROOF_NOT_EXTERNAL_PAYMENT"
        : "REPAIR_BEFORE_PAYMENT_EVIDENCE_CLAIM",
    externalPaymentEvidenceReady,
    evidence,
    summary,
    checks,
    nonClaims: [
      "This checker validates x402 payment-evidence claim readiness only.",
      "It does not prove buyer demand, durable ranking, production readiness, or future revenue.",
      "Sean self-pay, tests, temporary tunnels, and missing product output remain invalid external-income evidence."
    ],
    nextAction: externalPaymentEvidenceReady
      ? "Use the report as support for a narrow external-payment proof claim and run the first external income verifier if net income is >= $1."
      : "Fix all P0/P1 issues or keep the evidence labeled as mechanics-only before using it in buyer-facing copy.",
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
  <title>Stoa x402 Payment Evidence Checker</title>
  <style>
    body{margin:0;background:#f7faf7;color:#18211d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{max-width:1080px;margin:0 auto;padding:28px 18px 48px}
    h1{font-size:clamp(28px,4vw,44px);line-height:1.05;margin:0 0 10px}
    p,td{color:#5d675f;line-height:1.5}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:18px 0}
    .card{background:white;border:1px solid #dce4dd;border-radius:8px;padding:12px}
    .label{font-size:12px;text-transform:uppercase;color:#5d675f;font-weight:800}
    .value{font-size:22px;font-weight:850;margin-top:4px;word-break:break-word}
    table{width:100%;border-collapse:collapse;background:white;border:1px solid #dce4dd;border-radius:8px;overflow:hidden}
    th,td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #dce4dd}
    th{background:#eef4ef}
    tr:last-child td{border-bottom:0}
  </style>
</head>
<body><main>
  <h1>x402 Payment Evidence Checker</h1>
  <p>Deterministic claim-readiness check for x402 paid-call evidence. This is not buyer demand, ranking, production-readiness, or income proof by itself.</p>
  <section class="grid">
    <div class="card"><div class="label">Decision</div><div class="value">${escapeHtml(report.decision)}</div></div>
    <div class="card"><div class="label">Pass</div><div class="value">${report.summary.pass}</div></div>
    <div class="card"><div class="label">Fix</div><div class="value">${report.summary.fix}</div></div>
    <div class="card"><div class="label">Guard</div><div class="value">${report.summary.guard}</div></div>
  </section>
  <table><thead><tr><th>Check</th><th>Status</th><th>Severity</th><th>Evidence</th><th>Fix</th></tr></thead><tbody>${rows}</tbody></table>
</main></body></html>`;
}

export async function runX402PaymentEvidenceCheckerCli({ inputPath, outPath } = {}) {
  const input = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const report = checkX402PaymentEvidence(input);
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
    throw new Error("Usage: node x402-payment-evidence-checker.mjs --input <evidence.json> [--out <report.json>]");
  }
  const report = await runX402PaymentEvidenceCheckerCli({ inputPath, outPath });
  console.log(JSON.stringify(report, null, 2));
}
