import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../app/utils/supabase-config";

const app = new Hono();

// ───────────────────────────────────────────────────────────────
//  Supabase (clé anon — l'écriture passe par des fonctions RPC
//  SECURITY DEFINER, la lecture publique aussi). Pas de persistance
//  de session côté Worker.
// ───────────────────────────────────────────────────────────────
function getSupabase() {
	return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

// Extrait les données de l'appareil / réseau visibles uniquement côté serveur.
function getDeviceData(req: Request) {
	const cf = (req as unknown as { cf?: Record<string, unknown> }).cf || {};
	return {
		ip:
			req.headers.get("cf-connecting-ip") ||
			req.headers.get("x-forwarded-for") ||
			null,
		country: (cf.country as string) || null,
		city: (cf.city as string) || null,
		region: (cf.region as string) || null,
		userAgent: req.headers.get("user-agent") || null,
		language: req.headers.get("accept-language") || null,
	};
}

// ───────────────────────────────────────────────────────────────
//  POST /api/scan
//  Appelé au chargement de /play?q=<qrId>. Capture les données de
//  l'appareil/réseau, crée la session de scan, et renvoie la config
//  de la roue personnalisée du commerçant + l'id de scan.
// ───────────────────────────────────────────────────────────────
app.post("/api/scan", async (c) => {
	let body: { q?: string };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "invalid_body" }, 400);
	}

	const qrId = (body.q || "").trim();
	if (!qrId) return c.json({ error: "missing_qr" }, 400);

	const supabase = getSupabase();

	// 1) Config publique de la roue (fonction SECURITY DEFINER)
	const { data: wheelRows, error: wheelErr } = await supabase.rpc(
		"get_public_wheel",
		{ p_qr: qrId },
	);
	if (wheelErr) return c.json({ error: "lookup_failed" }, 500);
	const wheel = Array.isArray(wheelRows) ? wheelRows[0] : wheelRows;
	if (!wheel) return c.json({ error: "qr_not_found" }, 404);

	// 2) Enregistrement de la session de scan (device data côté serveur)
	const d = getDeviceData(c.req.raw);
	const { data: scanId, error: scanErr } = await supabase.rpc("record_scan", {
		p_qr: qrId,
		p_ip: d.ip,
		p_country: d.country,
		p_city: d.city,
		p_region: d.region,
		p_user_agent: d.userAgent,
		p_language: d.language,
	});
	if (scanErr) {
		// On renvoie quand même la config : le jeu ne doit pas casser si le log échoue.
		return c.json({ scanId: null, wheel });
	}

	return c.json({ scanId, wheel });
});

// ───────────────────────────────────────────────────────────────
//  POST /api/scan/complete
//  Enrichit la session de scan avec le compte Google du joueur,
//  le consentement RGPD, la note donnée et le lot gagné.
// ───────────────────────────────────────────────────────────────
app.post("/api/scan/complete", async (c) => {
	let body: {
		scanId?: string;
		consent?: boolean;
		google?: { email?: string; name?: string; sub?: string; picture?: string };
		rating?: number;
		prizeName?: string;
		played?: boolean;
		feedbackText?: string;
	};
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "invalid_body" }, 400);
	}

	if (!body.scanId) return c.json({ error: "missing_scan" }, 400);

	const supabase = getSupabase();
	const g = body.google || {};
	const { error } = await supabase.rpc("update_scan", {
		p_scan: body.scanId,
		p_consent: body.consent ?? null,
		p_email: g.email ?? null,
		p_name: g.name ?? null,
		p_sub: g.sub ?? null,
		p_picture: g.picture ?? null,
		p_rating: typeof body.rating === "number" ? body.rating : null,
		p_prize: body.prizeName ?? null,
		p_played: body.played ?? null,
		p_feedback: body.feedbackText ?? null,
	});
	if (error) return c.json({ error: "update_failed" }, 500);

	return c.json({ ok: true });
});

// ───────────────────────────────────────────────────────────────
//  React Router (SSR) — catch-all
// ───────────────────────────────────────────────────────────────
app.all("*", (c) => {
	const requestHandler = createRequestHandler(
		() => import("virtual:react-router/server-build"),
		import.meta.env.MODE,
	);

	return requestHandler(c.req.raw, {
		cloudflare: { env: c.env, ctx: c.executionCtx },
	});
});

export default app;
