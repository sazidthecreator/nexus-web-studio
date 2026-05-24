/**
 * Supabase Storage RLS probe.
 *
 * Probes the `assets` bucket via the Storage REST API and prints a pass/fail
 * matrix for these cases:
 *
 *   - anon  INSERT  (deny)
 *   - anon  LIST    (allow — public bucket; accepted finding 0025)
 *   - anon  SELECT  (allow — public read)
 *   - auth  INSERT  own folder    (allow)
 *   - auth  INSERT  other folder  (deny)
 *   - auth  LIST                  (allow)
 *   - auth  UPDATE  own           (allow)
 *   - auth  DELETE  other folder  (deny)
 *   - auth  DELETE  own           (allow)
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY        (anon key)
 *   SUPABASE_SERVICE_ROLE_KEY       (used only to create+delete a throwaway test user)
 *
 * Run:    bun run scripts/storage-rls-probe.ts
 * Exits 0 when every case matches its expectation, 1 otherwise.
 */

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.PROBE_BUCKET ?? "assets";

if (!URL || !ANON) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  process.exit(2);
}

type Row = { case: string; expected: "allow" | "deny"; status: number; pass: string };
const rows: Row[] = [];
const isAllow = (s: number) => s >= 200 && s < 300;
const isDeny = (s: number) => [400, 401, 403, 404].includes(s);
const record = (c: string, expected: "allow" | "deny", status: number) => {
  const ok = expected === "allow" ? isAllow(status) : isDeny(status);
  rows.push({ case: c, expected, status, pass: ok ? "✅" : "❌" });
};

async function probeAnonOnly() {
  const path = `anon-folder/probe-${Date.now()}.txt`;
  // anon INSERT
  record("anon INSERT", "deny", (await fetch(`${URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "text/plain" },
    body: new Blob(["x"], { type: "text/plain" }),
  })).status);

  // anon LIST (public bucket → allow)
  record("anon LIST (public bucket)", "allow", (await fetch(`${URL}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 5 }),
  })).status);

  // anon SELECT — probe a known-missing public path (404 means policy allowed read, file just doesn't exist)
  const r = await fetch(`${URL}/storage/v1/object/public/${BUCKET}/__does_not_exist__.txt`);
  // For SELECT path, both 200 and 404 mean the policy let us through. Treat as allow if not 401/403.
  const ok = r.status !== 401 && r.status !== 403;
  rows.push({ case: "anon SELECT (public read reachable)", expected: "allow", status: r.status, pass: ok ? "✅" : "❌" });
}

async function probeFull() {
  const email = `probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@probe.local`;
  const password = "Probe-Password-123!";

  const create = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const created = await create.json();
  if (!create.ok) throw new Error(`admin create user failed: ${create.status} ${JSON.stringify(created)}`);
  const userId: string = created.id;

  const tokenResp = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenResp.json();
  const userToken = tokenJson.access_token as string;
  if (!userToken) throw new Error(`sign-in failed: ${JSON.stringify(tokenJson)}`);

  const ownerPath = `${userId}/probe-${Date.now()}.txt`;
  const otherPath = `00000000-0000-0000-0000-000000000000/probe-${Date.now()}.txt`;
  const anonPath = `anon-folder/probe-${Date.now()}.txt`;
  const file = () => new Blob(["hello"], { type: "text/plain" });

  // anon INSERT (deny)
  record("anon INSERT", "deny", (await fetch(`${URL}/storage/v1/object/${BUCKET}/${anonPath}`, {
    method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "text/plain" }, body: file(),
  })).status);

  // anon LIST (allow — public bucket)
  record("anon LIST (public bucket)", "allow", (await fetch(`${URL}/storage/v1/object/list/${BUCKET}`, {
    method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 5 }),
  })).status);

  // auth INSERT own (allow)
  record("auth INSERT (own folder)", "allow", (await fetch(`${URL}/storage/v1/object/${BUCKET}/${ownerPath}`, {
    method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${userToken}`, "Content-Type": "text/plain" }, body: file(),
  })).status);

  // auth INSERT other (deny)
  record("auth INSERT (other folder)", "deny", (await fetch(`${URL}/storage/v1/object/${BUCKET}/${otherPath}`, {
    method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${userToken}`, "Content-Type": "text/plain" }, body: file(),
  })).status);

  // auth LIST (allow)
  record("auth LIST", "allow", (await fetch(`${URL}/storage/v1/object/list/${BUCKET}`, {
    method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 5 }),
  })).status);

  // anon SELECT (public read of just-uploaded file)
  record("anon SELECT (public read)", "allow",
    (await fetch(`${URL}/storage/v1/object/public/${BUCKET}/${ownerPath}`)).status);

  // auth UPDATE own (allow)
  record("auth UPDATE (own)", "allow", (await fetch(`${URL}/storage/v1/object/${BUCKET}/${ownerPath}`, {
    method: "PUT", headers: { apikey: ANON, Authorization: `Bearer ${userToken}`, "Content-Type": "text/plain" },
    body: new Blob(["updated"], { type: "text/plain" }),
  })).status);

  // auth DELETE other (deny)
  record("auth DELETE (other folder)", "deny", (await fetch(`${URL}/storage/v1/object/${BUCKET}/${otherPath}`, {
    method: "DELETE", headers: { apikey: ANON, Authorization: `Bearer ${userToken}` },
  })).status);

  // auth DELETE own (allow)
  record("auth DELETE (own)", "allow", (await fetch(`${URL}/storage/v1/object/${BUCKET}/${ownerPath}`, {
    method: "DELETE", headers: { apikey: ANON, Authorization: `Bearer ${userToken}` },
  })).status);

  // Cleanup test user
  await fetch(`${URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
}

if (SERVICE) {
  console.log("Running full probe (anon + authenticated)…");
  await probeFull();
} else {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY not set — running anon-only branch.");
  await probeAnonOnly();
}

console.log(`\n=== Supabase Storage RLS probe — bucket "${BUCKET}" ===`);
console.table(rows);
const failed = rows.filter((r) => r.pass === "❌");
console.log(failed.length === 0
  ? `\n✅ All ${rows.length} cases match expectations`
  : `\n❌ ${failed.length} of ${rows.length} cases mismatched`);
process.exit(failed.length === 0 ? 0 : 1);
