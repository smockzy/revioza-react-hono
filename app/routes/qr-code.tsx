import { useEffect, useState } from "react";
import type { Route } from "./+types/qr-code";
import "../styles/style.css";
import { supabase } from "../utils/supabase-client";

// Génère un identifiant public court, lisible et difficile à deviner (base36).
function generateQrId(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	let out = "";
	for (const b of bytes) out += b.toString(36).padStart(2, "0");
	return out.slice(0, 12);
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Revioza - Votre QR Code Unique" },
		{
			name: "description",
			content:
				"Générez et imprimez votre QR code unique pour permettre à vos clients de laisser un avis et de faire tourner la roue.",
		},
	];
}

export default function QRCode() {
	const [qrUrl, setQrUrl] = useState("");
	const [badgeText, setBadgeText] = useState("Chargement…");
	const [targetUrl, setTargetUrl] = useState("");
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	// Abonnement actif ? Le QR n'est imprimable (net) que si oui ; sinon il est
	// flouté + verrouillé avec un CTA vers les tarifs.
	const [subscribed, setSubscribed] = useState(false);

	useEffect(() => {
		let cancelled = false;

		// Texte du badge depuis la config locale (affichage immédiat).
		try {
			const savedConfig = localStorage.getItem("revioza_merchant_config");
			if (savedConfig) {
				const cfg = JSON.parse(savedConfig);
				if (cfg.restaurantName) setBadgeText(`${cfg.restaurantName}${cfg.restaurantSub ? ` (${cfg.restaurantSub})` : ""}`);
			}
		} catch { /* ignore */ }

		(async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) {
				// Non connecté → on ouvre l'interface connexion/inscription (modale
				// de l'accueil) au lieu d'une redirection muette.
				window.location.href = "/?login=required";
				return;
			}
			const userId = session.user.id;

			// 1) Récupère le QR code existant du commerçant, sinon en crée un.
			let qrId: string | null = null;
			const { data: existing } = await supabase
				.from("qr_codes")
				.select("id")
				.eq("user_id", userId)
				.eq("active", true)
				.limit(1)
				.maybeSingle();

			if (existing?.id) {
				qrId = existing.id;
			} else {
				const newId = generateQrId();
				const { data: inserted, error: insErr } = await supabase
					.from("qr_codes")
					.insert({ id: newId, user_id: userId })
					.select("id")
					.single();
				if (insErr) {
					if (!cancelled) setStatus("error");
					console.error("Création QR code échouée", insErr);
					return;
				}
				qrId = inserted.id;
			}

			if (cancelled || !qrId) return;

			// 2) URL stable du QR : ne change jamais, la roue reste modifiable.
			const clientUrl = new URL("/play", window.location.origin);
			clientUrl.searchParams.set("q", qrId);
			const url = clientUrl.toString();

			setTargetUrl(url);
			setQrUrl(
				`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
			);

			// Statut d'abonnement : débloque (ou non) l'impression du QR.
			const { data: merchantRow } = await supabase
				.from("merchants")
				.select("subscription_active")
				.eq("user_id", userId)
				.maybeSingle();
			if (!cancelled) setSubscribed(Boolean(merchantRow?.subscription_active));

			setStatus("ready");
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="page-qrcode">
			<header>
				<div className="header-container">
					<a href="/" className="logo" style={{ textDecoration: "none" }}>
						<div className="logo-text">
							RE<span className="v-accent">V</span>IOZA
						</div>
						<span className="logo-tagline">L&apos;avis qui vous rapporte</span>
					</a>
				</div>
			</header>

			<main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div className="qr-container">
					<div className="merchant-badge" id="merchant-name-badge">
						{badgeText}
					</div>
					<h1 className="qr-title">
						Votre <span>QR Code</span> unique
					</h1>
					<p className="qr-desc">
						Ce QR code est associé à votre compte de commerce. Imprimez-le et placez-le sur vos tables. En
						le scannant, vos clients accèdent à <strong>votre roue personnalisée</strong> et peuvent laisser
						un avis. Vous pouvez modifier votre roue à tout moment&nbsp;: ce QR reste valable, pas besoin de
						le réimprimer.
					</p>

					<div className={`qr-box${status === "ready" && !subscribed ? " qr-locked" : ""}`}>
						{status === "ready" && qrUrl && <img id="qr-img" src={qrUrl} alt="QR Code Unique" />}
						{status === "ready" && !subscribed && (
							<div className="qr-lock-overlay" aria-hidden="true">
								<i className="fa-solid fa-lock"></i>
							</div>
						)}
						{status === "loading" && (
							<span style={{ color: "#8e8e93", fontSize: "0.85rem" }}>Génération…</span>
						)}
						{status === "error" && (
							<span style={{ color: "#e50914", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>
								Impossible de générer le QR code.<br />Vérifiez votre connexion puis réessayez.
							</span>
						)}
					</div>

					{/* URL visible uniquement quand le QR est débloqué */}
					{status === "ready" && subscribed && targetUrl && (
						<p style={{ fontSize: "0.72rem", color: "#8e8e93", wordBreak: "break-all", margin: 0 }}>
							{targetUrl}
						</p>
					)}

					{status === "ready" && !subscribed ? (
						<div className="qr-lock-notice">
							<p className="qr-lock-text">
								Pour débloquer veuillez souscrire à l&apos;abonnement
							</p>
							<a href="/pricing" className="btn-qr btn-qr-print">
								<i className="fa-solid fa-tags"></i> Voir les tarifs
							</a>
							<a href="/" className="btn-qr btn-qr-back">
								<i className="fa-solid fa-house"></i> Retour Admin
							</a>
						</div>
					) : (
						<div className="action-buttons">
							<button className="btn-qr btn-qr-print" id="btn-print" onClick={() => window.print()} disabled={status !== "ready"} style={status !== "ready" ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
								<i className="fa-solid fa-print"></i> Imprimer le QR Code
							</button>
							<a href="/" className="btn-qr btn-qr-back">
								<i className="fa-solid fa-house"></i> Retour Admin
							</a>
						</div>
					)}
				</div>
			</main>

			<footer>
				<div className="footer-container">
					<div style={{ fontSize: "0.8rem", color: "#8e8e93", textAlign: "center", width: "100%" }}>
						&copy; 2026 Revioza. Version Démo Interactive.
					</div>
				</div>
			</footer>

			<style>{`
				.page-qrcode {
					background: #060608;
					color: #f5f5f7;
					font-family: 'Plus Jakarta Sans', sans-serif;
					display: flex;
					flex-direction: column;
					min-height: 100vh;
					margin: 0;
				}

				.page-qrcode .qr-container {
					flex: 1;
					max-width: 600px;
					width: 90%;
					margin: 3rem auto;
					text-align: center;
					background: #111115;
					border: 1px solid #22222a;
					border-radius: 24px;
					padding: 3rem 2rem;
					box-shadow: 0 20px 40px rgba(0,0,0,0.5);
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 1.5rem;
				}

				.page-qrcode .qr-title {
					font-family: 'Outfit', sans-serif;
					font-size: 2.2rem;
					font-weight: 850;
					margin: 0;
				}

				.page-qrcode .qr-title span {
					color: #e50914;
				}

				.page-qrcode .qr-desc {
					font-size: 0.9rem;
					color: #8e8e93;
					line-height: 1.5;
					max-width: 450px;
				}

				.page-qrcode .qr-box {
					background: white;
					padding: 1.5rem;
					border-radius: 20px;
					display: flex;
					align-items: center;
					justify-content: center;
					box-shadow: 0 10px 30px rgba(0,0,0,0.3);
					width: 260px;
					height: 260px;
					margin: 1rem 0;
					transition: transform 0.3s;
					position: relative;
				}

				.page-qrcode .qr-box:hover {
					transform: scale(1.02);
				}

				.page-qrcode .qr-box.qr-locked:hover {
					transform: none;
				}

				.page-qrcode .qr-box img {
					width: 100%;
					height: 100%;
					object-fit: contain;
				}

				/* QR verrouillé : flouté + cadenas par-dessus */
				.page-qrcode .qr-box.qr-locked img {
					filter: blur(8px);
					opacity: 0.55;
				}

				.page-qrcode .qr-lock-overlay {
					position: absolute;
					inset: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					pointer-events: none;
				}

				.page-qrcode .qr-lock-overlay i {
					font-size: 2.6rem;
					color: #111115;
					background: rgba(255,255,255,0.92);
					width: 72px;
					height: 72px;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					box-shadow: 0 6px 18px rgba(0,0,0,0.35);
				}

				.page-qrcode .qr-lock-notice {
					display: flex;
					flex-direction: column;
					gap: 0.75rem;
					width: 100%;
					max-width: 450px;
					margin-top: 1rem;
					align-items: stretch;
					text-align: center;
				}

				.page-qrcode .qr-lock-text {
					font-family: 'Outfit', sans-serif;
					font-weight: 700;
					font-size: 1rem;
					color: #f5f5f7;
					margin: 0 0 0.25rem;
				}

				.page-qrcode .qr-lock-notice .btn-qr {
					flex: 0 0 auto;
				}

				.page-qrcode .action-buttons {
					display: flex;
					gap: 1rem;
					width: 100%;
					max-width: 450px;
					margin-top: 1rem;
				}

				.page-qrcode .btn-qr {
					flex: 1;
					padding: 1rem 1.5rem;
					border-radius: 14px;
					font-family: 'Outfit', sans-serif;
					font-weight: 700;
					font-size: 0.95rem;
					cursor: pointer;
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 0.5rem;
					transition: background 0.2s, transform 0.15s;
					text-decoration: none;
					border: none;
				}

				.page-qrcode .btn-qr-print {
					background: linear-gradient(135deg, #e50914, #ff2e3b);
					color: white;
					box-shadow: 0 4px 15px rgba(229, 9, 20, 0.4);
				}

				.page-qrcode .btn-qr-print:hover {
					transform: translateY(-2px);
					box-shadow: 0 6px 20px rgba(229, 9, 20, 0.5);
				}

				.page-qrcode .btn-qr-back {
					background: #1b1b22;
					border: 1px solid #22222a;
					color: #f5f5f7;
				}

				.page-qrcode .btn-qr-back:hover {
					background: #22222a;
				}

				.page-qrcode .merchant-badge {
					background: rgba(229, 9, 20, 0.1);
					border: 1px solid rgba(229, 9, 20, 0.2);
					padding: 6px 16px;
					border-radius: 99px;
					color: #e50914;
					font-size: 0.78rem;
					font-weight: 700;
					text-transform: uppercase;
					letter-spacing: 0.05em;
				}

				@media print {
					html, body {
						background: white !important;
						color: black !important;
						height: auto !important;
						min-height: 0 !important;
						overflow: visible !important;
					}
					/* Hide unnecessary page wrapper elements */
					#root, header, footer, .action-buttons, .qr-desc, .merchant-badge, .header-container {
						display: none !important;
					}
					.page-qrcode {
						background: white !important;
						color: black !important;
						min-height: 0 !important;
						height: auto !important;
						display: block !important;
						padding: 0 !important;
						margin: 0 !important;
					}
					.page-qrcode .qr-container {
						background: white !important;
						border: none !important;
						box-shadow: none !important;
						margin: 0 !important;
						padding: 2cm !important;
						width: 100% !important;
						max-width: 100% !important;
						height: auto !important;
						display: flex !important;
						flex-direction: column !important;
						align-items: center !important;
						justify-content: center !important;
					}
					.page-qrcode .qr-title {
						color: black !important;
						font-size: 3rem !important;
						margin-bottom: 1.5cm !important;
						display: block !important;
					}
					.page-qrcode .qr-title span {
						color: black !important;
					}
					.page-qrcode .qr-box {
						box-shadow: none !important;
						border: 2px solid #000 !important;
						width: 12cm !important;
						height: 12cm !important;
						padding: 0.5cm !important;
						background: white !important;
						display: flex !important;
						align-items: center !important;
						justify-content: center !important;
					}
					.page-qrcode .qr-box img {
						width: 11cm !important;
						height: 11cm !important;
						display: block !important;
					}
				}
			`}</style>
		</div>
	);
}
