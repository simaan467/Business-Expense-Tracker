const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const root = __dirname;
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const port = Number(process.env.PORT) || 4173;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };
const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const jwtSecret = process.env.JWT_SECRET;

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id text PRIMARY KEY,
      project text NOT NULL,
      member_type text NOT NULL,
      member_name text NOT NULL,
      investor text,
      supervisor text,
      receiver text NOT NULL,
      amount numeric(14,2) NOT NULL,
      bill_name text,
      bill_type text,
      bill_data_url text,
      created_at timestamptz NOT NULL
    )
  `);

  // Draft expenses stay here until the project's investors approve them.
  // Keeping them separate ensures pending amounts never affect the ledger total.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_transactions (
      id text PRIMARY KEY,
      project text NOT NULL,
      member_type text NOT NULL,
      member_name text NOT NULL,
      investor text,
      supervisor text,
      receiver text NOT NULL,
      amount numeric(14,2) NOT NULL,
      bill_name text,
      bill_type text,
      bill_data_url text,
      created_at timestamptz NOT NULL,
      proposer_name text NOT NULL,
      eligible_approvers jsonb NOT NULL DEFAULT '[]'::jsonb,
      approved_by jsonb NOT NULL DEFAULT '[]'::jsonb,
      required_approvals integer NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      approved_at timestamptz
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'Investor',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_members (
      mobile text PRIMARY KEY,
      name text NOT NULL,
      role text NOT NULL CHECK (role IN ('Investor', 'Supervisor')),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id text PRIMARY KEY,
      name text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_assignments (
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      member_mobile text NOT NULL,
      member_name text NOT NULL,
      role text NOT NULL CHECK (role IN ('Investor', 'Supervisor')),
      PRIMARY KEY (project_id, member_mobile)
    )
  `);
  // A deletion is a separate, auditable approval workflow.  The project is
  // removed only once N - 1 of its assigned investors have approved it.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_project_deletions (
      project_id text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      requested_by_mobile text NOT NULL,
      requested_by_name text NOT NULL,
      approved_by jsonb NOT NULL DEFAULT '[]'::jsonb,
      required_approvals integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      email text PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
      otp_hash text NOT NULL,
      expires_at timestamptz NOT NULL
    )
  `);

  // `project_members` is the central investor/supervisor directory. Backfill
  // accounts created before that directory was introduced, so existing users
  // show up without needing to create a new project first.
  await pool.query(`
    INSERT INTO project_members (mobile, name, role)
    SELECT mobile, name, role
    FROM users
    WHERE role IN ('Investor', 'Supervisor')
    ON CONFLICT (mobile) DO UPDATE
      SET name = EXCLUDED.name, role = EXCLUDED.role
  `);

  // Earlier versions stored expense entries but not their parent projects.
  // Recreate those project records from transaction history on startup.
  await pool.query(`
    INSERT INTO projects (id, name, created_at)
    SELECT 'legacy-' || md5(project), project, min(created_at)
    FROM transactions
    WHERE btrim(project) <> ''
    GROUP BY project
    ON CONFLICT (name) DO NOTHING
  `);

  // Recover safely if an earlier request was marked approved just before a
  // process restart. The primary-key conflict makes this promotion idempotent.
  await pool.query(`
    INSERT INTO transactions
      (id, project, member_type, member_name, investor, supervisor, receiver,
       amount, bill_name, bill_type, bill_data_url, created_at)
    SELECT id, project, member_type, member_name, investor, supervisor, receiver,
           amount, bill_name, bill_type, bill_data_url, created_at
    FROM pending_transactions
    WHERE status = 'approved'
    ON CONFLICT (id) DO NOTHING
  `);
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function sendJson(res, status, body) { setCorsHeaders(res); res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(body)); }
function getAuthenticatedUser(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token || !jwtSecret) return null;
  try { return jwt.verify(token, jwtSecret); } catch { return null; }
}
function canAccessProject(user, projectId) {
  return pool.query("select 1 from project_assignments where project_id=$1 and member_mobile=$2", [projectId, user.mobile]);
}
function createMailTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
function readBody(req) { return new Promise((resolve, reject) => { let body = ""; req.on("data", chunk => { body += chunk; if (body.length > 25 * 1024 * 1024) { reject(new Error("The bill image is too large for upload. Please use a smaller photo.")); req.destroy(); } }); req.on("end", () => resolve(body)); req.on("error", reject); }); }
function toClient(row) { return { id: row.id, project: row.project, memberType: row.member_type, memberName: row.member_name, investor: row.investor || "", supervisor: row.supervisor || "", receiver: row.receiver, amount: Number(row.amount), billImage: row.bill_data_url ? { name: row.bill_name || "bill.jpg", type: row.bill_type || "image/jpeg", dataUrl: row.bill_data_url } : null, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at }; }
function toPendingClient(row) {
  return {
    ...toClient(row), proposerName: row.proposer_name,
    eligibleApprovers: Array.isArray(row.eligible_approvers) ? row.eligible_approvers : [],
    approvedBy: Array.isArray(row.approved_by) ? row.approved_by : [],
    requiredApprovals: Number(row.required_approvals), status: row.status,
    approvedAt: row.approved_at instanceof Date ? row.approved_at.toISOString() : row.approved_at || null
  };
}
async function saveTransaction(tx, update) {
  const sql = update ? "insert into transactions (id, project, member_type, member_name, investor, supervisor, receiver, amount, bill_name, bill_type, bill_data_url, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (id) do update set project=excluded.project, member_type=excluded.member_type, member_name=excluded.member_name, investor=excluded.investor, supervisor=excluded.supervisor, receiver=excluded.receiver, amount=excluded.amount, bill_name=excluded.bill_name, bill_type=excluded.bill_type, bill_data_url=excluded.bill_data_url, created_at=excluded.created_at" : "insert into transactions (id, project, member_type, member_name, investor, supervisor, receiver, amount, bill_name, bill_type, bill_data_url, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (id) do nothing";
  await pool.query(sql, [tx.id, tx.project, tx.memberType, tx.memberName, tx.investor || "", tx.supervisor || "", tx.receiver, tx.amount, tx.billImage?.name || null, tx.billImage?.type || null, tx.billImage?.dataUrl || null, tx.createdAt || new Date().toISOString()]);
}
async function finalizePendingTransaction(client, row) {
  await client.query(
    "insert into transactions (id, project, member_type, member_name, investor, supervisor, receiver, amount, bill_name, bill_type, bill_data_url, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (id) do nothing",
    [row.id, row.project, row.member_type, row.member_name, row.investor || "", row.supervisor || "", row.receiver, row.amount, row.bill_name, row.bill_type, row.bill_data_url, row.created_at]
  );
}
async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    await ensureSchema();
    const result = await pool.query("select now() as now");
    sendJson(res, 200, { ok: true, databaseTime: result.rows[0].now });
    return;
  }
  await ensureSchema();
  const isPublicAuthRoute = req.method === "POST" && ["/api/auth/register", "/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password"].includes(url.pathname);
  const currentUser = isPublicAuthRoute ? null : getAuthenticatedUser(req);
  if (!isPublicAuthRoute && !currentUser) { sendJson(res, 401, { error: "Please sign in again." }); return; }
  if (req.method === "GET" && url.pathname === "/api/pending-transactions") {
    const project = url.searchParams.get("project");
    if (project) {
      const access = await pool.query("select 1 from projects p join project_assignments a on a.project_id=p.id where p.name=$1 and a.member_mobile=$2", [project, currentUser.mobile]);
      if (!access.rows.length) { sendJson(res, 403, { error: "You are not assigned to this project." }); return; }
    }
    const result = await pool.query(
      project ? "select * from pending_transactions where project=$1 and status='pending' order by created_at asc" : "select pt.* from pending_transactions pt join projects p on p.name=pt.project join project_assignments a on a.project_id=p.id where a.member_mobile=$1 and pt.status='pending' order by pt.created_at asc",
      project ? [project] : [currentUser.mobile]
    );
    sendJson(res, 200, result.rows.map(toPendingClient));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/project-members") {
    const { name, mobile, role } = JSON.parse(await readBody(req));
    const memberName = String(name || "").trim();
    const memberMobile = String(mobile || "").trim();
    if (!memberName || !memberMobile || !["Investor", "Supervisor"].includes(role)) {
      sendJson(res, 400, { error: "Name, mobile number, and role are required." }); return;
    }
    const existing = await pool.query("select name, role from project_members where mobile=$1", [memberMobile]);
    if (existing.rows.length && (existing.rows[0].name !== memberName || existing.rows[0].role !== role)) {
      sendJson(res, 409, { error: "This mobile number is already assigned to a different member." }); return;
    }
    await pool.query(
      "insert into project_members (mobile, name, role) values ($1,$2,$3) on conflict (mobile) do nothing",
      [memberMobile, memberName, role]
    );
    sendJson(res, 201, { ok: true, member: { name: memberName, mobile: memberMobile, role } });
    return;
  }
  if (req.method === "POST" && /^\/api\/projects\/[^/]+\/members$/.test(url.pathname)) {
    const projectId = decodeURIComponent(url.pathname.split("/")[3]);
    const { name, mobile, role } = JSON.parse(await readBody(req));
    const access = await pool.query("select 1 from project_assignments where project_id=$1 and member_mobile=$2", [projectId, currentUser.mobile]);
    if (!access.rows.length) { sendJson(res, 403, { error: "You are not assigned to this project." }); return; }
    if (!name || !mobile || !["Investor", "Supervisor"].includes(role)) { sendJson(res, 400, { error: "Member name, mobile number, and role are required." }); return; }
    await pool.query("insert into project_members (mobile,name,role) values ($1,$2,$3) on conflict (mobile) do update set name=excluded.name, role=excluded.role", [mobile, name, role]);
    await pool.query("insert into project_assignments (project_id,member_mobile,member_name,role) values ($1,$2,$3,$4) on conflict (project_id,member_mobile) do update set member_name=excluded.member_name, role=excluded.role", [projectId, mobile, name, role]);
    sendJson(res, 201, { ok: true });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/projects") {
    const result = await pool.query(`
      select p.id, p.name, p.created_at,
        coalesce(json_agg(json_build_object('name', a.member_name, 'mobile', a.member_mobile, 'role', a.role)) filter (where a.member_mobile is not null), '[]'::json) as members
      from projects p join project_assignments mine on mine.project_id=p.id and mine.member_mobile=$1
      left join project_assignments a on a.project_id=p.id
      group by p.id order by p.created_at asc
    `, [currentUser.mobile]);
    sendJson(res, 200, result.rows.map(row => ({
      id: row.id, name: row.name,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      investorNames: row.members.filter(member => member.role === "Investor").map(member => member.name),
      supervisorNames: row.members.filter(member => member.role === "Supervisor").map(member => member.name),
      members: row.members
    })));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/projects") {
    const { project, members } = JSON.parse(await readBody(req));
    if (!project?.id || !project?.name || !Array.isArray(members) || !members.length) {
      sendJson(res, 400, { error: "Project details and at least one member are required." }); return;
    }
    const assignedMembers = members.some(member => member?.mobile === currentUser.mobile)
      ? members : [...members, { name: currentUser.name, mobile: currentUser.mobile, role: currentUser.role }];
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("insert into projects (id,name,created_at) values ($1,$2,$3) on conflict (id) do update set name=excluded.name", [project.id, project.name, project.createdAt || new Date().toISOString()]);
      for (const member of assignedMembers) {
        if (!member?.name || !member?.mobile || !["Investor", "Supervisor"].includes(member.role)) throw new Error("Every project member needs name, mobile number, and role.");
        await client.query("insert into project_members (mobile,name,role) values ($1,$2,$3) on conflict (mobile) do update set name=excluded.name, role=excluded.role", [member.mobile, member.name, member.role]);
        await client.query("insert into project_assignments (project_id,member_mobile,member_name,role) values ($1,$2,$3,$4) on conflict (project_id,member_mobile) do update set member_name=excluded.member_name, role=excluded.role", [project.id, member.mobile, member.name, member.role]);
      }
      await client.query("COMMIT");
      sendJson(res, 201, { ok: true });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/project-deletion-requests") {
    const result = await pool.query(`
      select d.*, p.name as project_name
      from pending_project_deletions d
      join projects p on p.id=d.project_id
      join project_assignments a on a.project_id=p.id and a.member_mobile=$1
      order by d.created_at asc
    `, [currentUser.mobile]);
    sendJson(res, 200, result.rows.map(row => ({
      projectId: row.project_id, projectName: row.project_name,
      requestedByName: row.requested_by_name, requestedByMobile: row.requested_by_mobile,
      approvedBy: Array.isArray(row.approved_by) ? row.approved_by : [],
      requiredApprovals: Number(row.required_approvals), createdAt: row.created_at
    })));
    return;
  }
  if (req.method === "POST" && /^\/api\/projects\/[^/]+\/deletion-request$/.test(url.pathname)) {
    const projectId = decodeURIComponent(url.pathname.split("/")[3]);
    const access = await pool.query("select 1 from project_assignments where project_id=$1 and member_mobile=$2", [projectId, currentUser.mobile]);
    if (!access.rows.length || !["Investor", "Supervisor"].includes(currentUser.role)) { sendJson(res, 403, { error: "Only an assigned investor or supervisor can request project deletion." }); return; }
    const investorsResult = await pool.query("select member_mobile from project_assignments where project_id=$1 and role='Investor'", [projectId]);
    const requiredApprovals = Math.max(investorsResult.rows.length - 1, 0);
    await pool.query(
      "insert into pending_project_deletions (project_id,requested_by_mobile,requested_by_name,required_approvals) values ($1,$2,$3,$4) on conflict (project_id) do nothing",
      [projectId, currentUser.mobile, currentUser.name, requiredApprovals]
    );
    // With one assigned investor, N - 1 is zero, so no outside approval is
    // required after the requester has completed the countdown confirmation.
    if (requiredApprovals === 0) {
      const project = await pool.query("select name from projects where id=$1", [projectId]);
      if (project.rows.length) {
        await pool.query("delete from transactions where project=$1", [project.rows[0].name]);
        await pool.query("delete from pending_transactions where project=$1", [project.rows[0].name]);
        await pool.query("delete from projects where id=$1", [projectId]);
      }
      sendJson(res, 201, { ok: true, deleted: true });
      return;
    }
    const request = await pool.query("select * from pending_project_deletions where project_id=$1", [projectId]);
    sendJson(res, 201, { ok: true, request: { projectId, approvedBy: request.rows[0].approved_by, requiredApprovals: Number(request.rows[0].required_approvals) } });
    return;
  }
  if (req.method === "POST" && /^\/api\/projects\/[^/]+\/deletion-request\/approve$/.test(url.pathname)) {
    const projectId = decodeURIComponent(url.pathname.split("/")[3]);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const requestResult = await client.query("select * from pending_project_deletions where project_id=$1 for update", [projectId]);
      const request = requestResult.rows[0];
      if (!request) { sendJson(res, 404, { error: "Deletion request not found." }); await client.query("ROLLBACK"); return; }
      const investorAccess = await client.query("select 1 from project_assignments where project_id=$1 and member_mobile=$2 and role='Investor'", [projectId, currentUser.mobile]);
      if (!investorAccess.rows.length) { sendJson(res, 403, { error: "Only an assigned project investor can approve deletion." }); await client.query("ROLLBACK"); return; }
      const approvedBy = Array.isArray(request.approved_by) ? request.approved_by : [];
      if (approvedBy.some(mobile => mobile === currentUser.mobile)) { sendJson(res, 409, { error: "You have already approved this deletion." }); await client.query("ROLLBACK"); return; }
      approvedBy.push(currentUser.mobile);
      if (approvedBy.length >= request.required_approvals) {
        const project = await client.query("select name from projects where id=$1", [projectId]);
        if (!project.rows.length) { sendJson(res, 404, { error: "Project not found." }); await client.query("ROLLBACK"); return; }
        await client.query("delete from transactions where project=$1", [project.rows[0].name]);
        await client.query("delete from pending_transactions where project=$1", [project.rows[0].name]);
        await client.query("delete from projects where id=$1", [projectId]);
        await client.query("COMMIT");
        sendJson(res, 200, { ok: true, deleted: true });
        return;
      }
      const updated = await client.query("update pending_project_deletions set approved_by=$2::jsonb where project_id=$1 returning *", [projectId, JSON.stringify(approvedBy)]);
      await client.query("COMMIT");
      sendJson(res, 200, { ok: true, deleted: false, request: { projectId, approvedBy: updated.rows[0].approved_by, requiredApprovals: Number(updated.rows[0].required_approvals) } });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/pending-transactions") {
    const body = JSON.parse(await readBody(req));
    const tx = body.transaction || {};
    const projectAccess = await pool.query("select p.id from projects p join project_assignments a on a.project_id=p.id where p.name=$1 and a.member_mobile=$2", [tx.project, currentUser.mobile]);
    if (!projectAccess.rows.length) { sendJson(res, 403, { error: "You are not assigned to this project." }); return; }
    const approverResult = await pool.query("select member_name from project_assignments where project_id=$1 and role='Investor' and member_mobile<>$2", [projectAccess.rows[0].id, currentUser.mobile]);
    const investorNames = approverResult.rows.map(row => row.member_name);
    const proposerName = currentUser.name;
    if (!tx.id || !tx.project || !tx.memberType || !tx.memberName || !tx.receiver || !Number.isFinite(Number(tx.amount)) || Number(tx.amount) <= 0 || !proposerName) {
      sendJson(res, 400, { error: "A complete transaction and proposer are required." }); return;
    }
    const eligibleApprovers = investorNames;
    const requiredApprovals = Math.min(Math.ceil(investorNames.length / 2), eligibleApprovers.length);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "insert into pending_transactions (id,project,member_type,member_name,investor,supervisor,receiver,amount,bill_name,bill_type,bill_data_url,created_at,proposer_name,eligible_approvers,approved_by,required_approvals,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,'[]'::jsonb,$15,$16) on conflict (id) do nothing",
        [tx.id, tx.project, tx.memberType, tx.memberName, tx.investor || "", tx.supervisor || "", tx.receiver, tx.amount, tx.billImage?.name || null, tx.billImage?.type || null, tx.billImage?.dataUrl || null, tx.createdAt || new Date().toISOString(), proposerName, JSON.stringify(eligibleApprovers), requiredApprovals, requiredApprovals === 0 ? "approved" : "pending"]
      );
      const result = await client.query("select * from pending_transactions where id=$1 for update", [tx.id]);
      if (result.rows[0]?.status === "approved") await finalizePendingTransaction(client, result.rows[0]);
      await client.query("COMMIT");
      sendJson(res, 201, { ok: true, transaction: toPendingClient(result.rows[0]) });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    return;
  }
  if (req.method === "POST" && /^\/api\/pending-transactions\/[^/]+\/approve$/.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split("/")[3]);
    const approver = currentUser.name;
    if (!approver) { sendJson(res, 400, { error: "Approver name is required." }); return; }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("select * from pending_transactions where id=$1 for update", [id]);
      const row = result.rows[0];
      if (!row) { sendJson(res, 404, { error: "Pending transaction not found." }); await client.query("ROLLBACK"); return; }
      if (row.status !== "pending") { sendJson(res, 409, { error: "This transaction has already been approved." }); await client.query("ROLLBACK"); return; }
      const eligible = Array.isArray(row.eligible_approvers) ? row.eligible_approvers : [];
      const approvedBy = Array.isArray(row.approved_by) ? row.approved_by : [];
      const projectAccess = await client.query("select 1 from projects p join project_assignments a on a.project_id=p.id where p.name=$1 and a.member_mobile=$2 and a.role='Investor'", [row.project, currentUser.mobile]);
      if (!projectAccess.rows.length || !eligible.some(name => name.toLocaleLowerCase() === approver.toLocaleLowerCase())) { sendJson(res, 403, { error: "Only an assigned project investor can approve this transaction." }); await client.query("ROLLBACK"); return; }
      if (approvedBy.some(name => name.toLocaleLowerCase() === approver.toLocaleLowerCase())) { sendJson(res, 409, { error: "You have already approved this transaction." }); await client.query("ROLLBACK"); return; }
      approvedBy.push(approver);
      const approved = approvedBy.length >= row.required_approvals;
      const updated = await client.query("update pending_transactions set approved_by=$2::jsonb, status=$3, approved_at=case when $3='approved' then now() else null end where id=$1 returning *", [id, JSON.stringify(approvedBy), approved ? "approved" : "pending"]);
      if (approved) await finalizePendingTransaction(client, updated.rows[0]);
      await client.query("COMMIT");
      sendJson(res, 200, { ok: true, transaction: toPendingClient(updated.rows[0]) });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/transactions") { const result = await pool.query("select t.* from transactions t join projects p on p.name=t.project join project_assignments a on a.project_id=p.id where a.member_mobile=$1 order by t.created_at asc", [currentUser.mobile]); sendJson(res, 200, result.rows.map(toClient)); return; }
  if (req.method === "POST" && (url.pathname === "/api/transactions" || url.pathname === "/api/transactions/sync")) { sendJson(res, 405, { error: "Transactions must be submitted through the approval workflow." }); return; }
  if (req.method === "POST" && url.pathname === "/api/auth/register") {

  const body = JSON.parse(await readBody(req));

  const { name, email, mobile, password, role } = body;

  if (!name || !email || !mobile || !password || !["Investor", "Supervisor"].includes(role)) {
    sendJson(res, 400, {
      error: "All fields are required."
    });
    return;
  }

  const existing = await pool.query(
    `SELECT id
     FROM users
     WHERE email=$1
        OR mobile=$2`,
    [email, mobile]
  );

  if (existing.rows.length > 0) {
    sendJson(res, 400, {
      error: "Email or Mobile already exists."
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users
    (id,name,email,mobile,password_hash,role)
    VALUES($1,$2,$3,$4,$5,$6)`,
    [
      randomUUID(),
      name,
      email,
      mobile,
      passwordHash,
      role
    ]
  );

  // Keep the investor/supervisor directory in sync immediately at signup.
  await pool.query(
    `INSERT INTO project_members (mobile, name, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (mobile) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role`,
    [mobile, name, role]
  );

  sendJson(res, 200, {
    success: true,
    message: "Registration Successful"
  });

  return;
}
if (req.method === "GET" && url.pathname === "/api/users/lookup") {
  const identifier = String(url.searchParams.get("identifier") || "").trim();
  if (!identifier) { sendJson(res, 400, { error: "Enter an email address or mobile number." }); return; }
  const result = await pool.query(
    "select id, name, email, mobile, role from users where lower(email)=lower($1) or mobile=$1",
    [identifier]
  );
  if (!result.rows.length) { sendJson(res, 404, { error: "No registered user matches that email or mobile number." }); return; }
  sendJson(res, 200, result.rows[0]);
  return;
}
  if (req.method === "POST" && url.pathname === "/api/auth/login") {

  const body = JSON.parse(await readBody(req));

  const { mobile, password } = body;

  if (!mobile || !password) {
    sendJson(res, 400, {
      error: "Mobile and Password are required."
    });
    return;
  }

  const result = await pool.query(
    `SELECT * FROM users WHERE mobile=$1`,
    [mobile]
  );

  if (result.rows.length === 0) {
    sendJson(res, 401, {
      error: "Invalid Mobile or Password."
    });
    return;
  }

  const user = result.rows[0];

  const validPassword = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!validPassword) {
    sendJson(res, 401, {
      error: "Invalid Mobile or Password."
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    message: "Login Successful",
    token: jwt.sign({ id: user.id, name: user.name, role: user.role, mobile: user.mobile, email: user.email }, jwtSecret, { expiresIn: "8h" }),
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      mobile: user.mobile,
      email: user.email
    }
  });

  return;
}
if (req.method === "POST" && url.pathname === "/api/auth/forgot-password") {
  const { email } = JSON.parse(await readBody(req));
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const result = await pool.query("select email from users where lower(email)=lower($1)", [normalizedEmail]);
  if (!result.rows.length) { sendJson(res, 404, { error: "No account exists for this email address." }); return; }
  const transport = createMailTransport();
  if (!transport) { sendJson(res, 503, { error: "Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM on the server." }); return; }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await pool.query("insert into password_reset_otps (email,otp_hash,expires_at) values ($1,$2,now() + interval '10 minutes') on conflict (email) do update set otp_hash=excluded.otp_hash, expires_at=excluded.expires_at", [normalizedEmail, await bcrypt.hash(otp, 10)]);
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: normalizedEmail, subject: "Steel Arts Ledger password reset code", text: `Your password reset OTP is ${otp}. It expires in 10 minutes.` });
  sendJson(res, 200, { message: "OTP sent. Check your inbox." });
  return;
}
if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
  const { email, otp, password } = JSON.parse(await readBody(req));
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !otp || !password || String(password).length < 8) { sendJson(res, 400, { error: "Enter your email, OTP, and a password of at least 8 characters." }); return; }
  const result = await pool.query("select otp_hash, expires_at from password_reset_otps where email=$1", [normalizedEmail]);
  const reset = result.rows[0];
  if (!reset || new Date(reset.expires_at) < new Date() || !(await bcrypt.compare(String(otp), reset.otp_hash))) { sendJson(res, 400, { error: "The OTP is invalid or has expired." }); return; }
  await pool.query("update users set password_hash=$2 where lower(email)=lower($1)", [normalizedEmail, await bcrypt.hash(password, 10)]);
  await pool.query("delete from password_reset_otps where email=$1", [normalizedEmail]);
  sendJson(res, 200, { message: "Password reset successfully. You can now sign in." });
  return;
}
  sendJson(res, 404, { error: "Not found" });
}

function serveStatic(req, res, url) { const pathname = decodeURIComponent(url.pathname === "/" ? "/welcome.html" : url.pathname); const fullPath = path.normalize(path.join(root, pathname)); if (!fullPath.startsWith(root)) { res.writeHead(403); res.end("Forbidden"); return; } fs.readFile(fullPath, (error, body) => { if (error) { res.writeHead(404); res.end("Not found"); return; } res.writeHead(200, { "Content-Type": types[path.extname(fullPath)] || "application/octet-stream" }); res.end(body); }); }
const server = http.createServer(async (req, res) => { const url = new URL(req.url, "http://" + (req.headers.host || "127.0.0.1")); try { if (url.pathname.startsWith("/api/")) console.log(req.method, url.pathname); if (req.method === "OPTIONS") { setCorsHeaders(res); res.writeHead(204); res.end(); return; } if (url.pathname.startsWith("/api/")) { await handleApi(req, res, url); return; } serveStatic(req, res, url); } catch (error) { console.error(error); sendJson(res, 500, { error: error.message || "Server error" }); } });
ensureSchema().then(() => server.listen(port, "0.0.0.0", () => console.log("Steel Arts app running on port " + port))).catch(error => { console.error("Database setup failed:", error); process.exit(1); });
