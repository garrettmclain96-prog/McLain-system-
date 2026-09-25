import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const VERIFY_URL = "https://mclain-system.vercel.app/api/session/verify";
const MAX_BODY = 300_000;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

async function authorized(req: Request) {
  const token = req.headers.get("x-mclain-session") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return false;
  try {
    const r = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!r.ok) return false;
    const data = await r.json().catch(() => null);
    return data?.valid === true;
  } catch {
    return false;
  }
}

function cleanWeights(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const out: Record<string, number> = {};
  for (const key of ["speed", "cash", "stability", "deadline", "meaning", "blockers"]) {
    const n = Number((input as Record<string, unknown>)[key]);
    if (!Number.isFinite(n) || n < 0 || n > 2) return null;
    out[key] = Math.round(n * 10) / 10;
  }
  return out;
}

async function readCurrent(admin: any) {
  const { data, error } = await admin
    .from("mclain_system_state")
    .select("id,version,state,updated_at,updated_by")
    .eq("id", "primary")
    .single();
  if (error) throw error;
  return data;
}

async function commitState(admin: any, current: any, nextState: any, actor: string, reason: string, eventType: string, eventPayload: any = {}) {
  const nextVersion = Number(current.version) + 1;
  const { error: snapErr } = await admin.from("mclain_system_snapshots").insert({
    version: current.version,
    state: current.state,
    reason,
  });
  if (snapErr) throw snapErr;

  const { data: updated, error: updateErr } = await admin
    .from("mclain_system_state")
    .update({
      version: nextVersion,
      state: nextState,
      updated_at: new Date().toISOString(),
      updated_by: actor.slice(0, 120),
    })
    .eq("id", "primary")
    .eq("version", current.version)
    .select("id,version,state,updated_at,updated_by")
    .maybeSingle();

  if (updateErr) throw updateErr;
  if (!updated) return { conflict: true };

  const { error: eventErr } = await admin.from("mclain_system_events").insert({
    event_type: eventType,
    source: actor.slice(0, 120),
    payload: { ...eventPayload, fromVersion: current.version, toVersion: nextVersion },
  });
  if (eventErr) throw eventErr;

  return { conflict: false, updated };
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (!(await authorized(req))) return json({ error: "unauthorized" }, 401);
    const admin = ctx.supabaseAdmin;

    if (req.method === "GET") {
      try {
        const state = await readCurrent(admin);
        const { data: events, error } = await admin
          .from("mclain_system_events")
          .select("id,event_type,venture_id,source,payload,created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return json({ ok: true, ...state, events: events || [] });
      } catch (e) {
        console.error("state-read", e);
        return json({ error: "state_read_failed" }, 500);
      }
    }

    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "payload_too_large" }, 413);

    let body: any;
    try { body = JSON.parse(raw || "{}"); }
    catch { return json({ error: "invalid_json" }, 400); }

    const action = String(body?.action || "");
    const actor = String(body?.actor || "mclain-system");

    try {
      if (action === "event") {
        const eventType = String(body?.event_type || "").trim();
        if (!eventType || eventType.length > 120) return json({ error: "invalid_event_type" }, 400);
        const { data, error } = await admin.from("mclain_system_events").insert({
          event_type: eventType,
          venture_id: body?.venture_id ? String(body.venture_id).slice(0, 120) : null,
          source: actor.slice(0, 120),
          payload: body?.payload && typeof body.payload === "object" ? body.payload : {},
        }).select().single();
        if (error) throw error;
        return json({ ok: true, event: data });
      }

      const current = await readCurrent(admin);
      if (body?.expectedVersion != null && Number(body.expectedVersion) !== Number(current.version)) {
        return json({ error: "version_conflict", currentVersion: current.version }, 409);
      }

      if (action === "replace_state") {
        if (!body?.state || typeof body.state !== "object" || Array.isArray(body.state)) return json({ error: "invalid_state" }, 400);
        const r = await commitState(admin, current, body.state, actor, "replace_state", "state.replaced");
        if (r.conflict) return json({ error: "version_conflict" }, 409);
        return json({ ok: true, ...r.updated });
      }

      if (action === "weights") {
        const weights = cleanWeights(body?.weights);
        if (!weights) return json({ error: "invalid_weights" }, 400);
        const next = structuredClone(current.state || {});
        next.weights = weights;
        const r = await commitState(admin, current, next, actor, "weights", "weights.updated", { weights });
        if (r.conflict) return json({ error: "version_conflict" }, 409);
        return json({ ok: true, ...r.updated });
      }

      if (action === "venture_patch") {
        const id = String(body?.id || "");
        const patch = body?.patch;
        if (!id || !patch || typeof patch !== "object" || Array.isArray(patch)) return json({ error: "invalid_patch" }, 400);
        const next = structuredClone(current.state || {});
        if (!Array.isArray(next.ventures)) return json({ error: "state_invalid" }, 500);
        const idx = next.ventures.findIndex((v: any) => v?.id === id);
        if (idx < 0) return json({ error: "venture_not_found" }, 404);
        const allowed = new Set(["name","tag","what","s","why","deadline","next","palette","style","ring","unlocks","sealed","active"]);
        const safe: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(patch)) if (allowed.has(k)) safe[k] = v;
        if (safe.s && typeof safe.s === "object") safe.s = { ...(next.ventures[idx].s || {}), ...(safe.s as object) };
        if (safe.why && typeof safe.why === "object") safe.why = { ...(next.ventures[idx].why || {}), ...(safe.why as object) };
        next.ventures[idx] = { ...next.ventures[idx], ...safe };
        const r = await commitState(admin, current, next, actor, "venture_patch", "venture.updated", { id, fields: Object.keys(safe) });
        if (r.conflict) return json({ error: "version_conflict" }, 409);
        return json({ ok: true, ...r.updated });
      }

      if (action === "brief") {
        if (!body?.brief || typeof body.brief !== "object") return json({ error: "invalid_brief" }, 400);
        const next = structuredClone(current.state || {});
        next.brief = body.brief;
        const r = await commitState(admin, current, next, actor, "brief", "brief.updated");
        if (r.conflict) return json({ error: "version_conflict" }, 409);
        return json({ ok: true, ...r.updated });
      }

      return json({ error: "unknown_action" }, 400);
    } catch (e) {
      console.error("state-write", e);
      return json({ error: "state_write_failed" }, 500);
    }
  }),
};
