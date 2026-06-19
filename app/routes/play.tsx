import { useEffect, useRef, useState, useCallback } from "react";
import type { Route } from "./+types/play";
import "../styles/play.css";
import {
	type Prize,
	DEFAULT_PLAY_PRIZES,
	DEFAULT_HERO_IMAGE_HQ,
	GOOGLE_CLIENT_ID,
	getFullGoogleLink,
	selectPrizeWeighted,
	renderWheelCanvas,
	addReviewToHistory,
	guessIcon,
} from "../utils/state";
import { getCookie } from "../utils/cookies";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Revioza — Tentez votre chance !" },
		{
			name: "description",
			content: "Déposez votre avis Google et faites tourner la roue pour gagner un cadeau instantané !",
		},
		{ name: "apple-mobile-web-app-capable", content: "yes" },
		{ name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
	];
}

interface PlayState {
	step: number;
	restaurantName: string;
	restaurantSub: string;
	primaryColor: string;
	googleLink: string;
	heroImage: string | null;
	prizes: Prize[];
	wonPrize: Prize | null;
	isSpinning: boolean;
	rating: number;
	timerSeconds: number;
}

export default function Play() {
	const [state, setState] = useState<PlayState>({
		step: 1,
		restaurantName: "Bella Napoli",
		restaurantSub: "Pizzeria",
		primaryColor: "#e50914",
		googleLink: "ChIJN1t_tDeuEmsRUsoyG83VY24",
		heroImage: null,
		prizes: [...DEFAULT_PLAY_PRIZES],
		wonPrize: null,
		isSpinning: false,
		rating: 0,
		timerSeconds: 7200,
	});

	const [overlayRedirect, setOverlayRedirect] = useState(false);
	const [overlayRules, setOverlayRules] = useState(false);
	const [overlayProfile, setOverlayProfile] = useState(false);
	const [overlayGoogleAuth, setOverlayGoogleAuth] = useState(false);
	const [googleAuthMode, setGoogleAuthMode] = useState<"loading" | "success" | "error">("loading");
	const [googleAuthError, setGoogleAuthError] = useState({ msg: "", help: "" });
	const [googleUser, setGoogleUser] = useState<{ name: string; email: string; picture: string } | null>(null);
	const [profileEmail, setProfileEmail] = useState("Non connecté");
	const [participationStatus, setParticipationStatus] = useState("Disponible");
	const [heroSrc, setHeroSrc] = useState(DEFAULT_HERO_IMAGE_HQ);

	const canvasRef = useRef<HTMLCanvasElement>(null);

	// Parse URL params & load config
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const updates: Partial<PlayState> = {};

		if (params.has("name")) updates.restaurantName = params.get("name")!;
		if (params.has("sub")) updates.restaurantSub = params.get("sub")!;
		if (params.has("google_link")) updates.googleLink = params.get("google_link")!;
		if (params.has("image")) updates.heroImage = params.get("image")!;
		if (params.has("color")) {
			const c = `#${params.get("color")!.replace("#", "")}`;
			if (/^#[0-9A-Fa-f]{6}$/.test(c)) updates.primaryColor = c;
		}
		if (params.has("prizes")) {
			const names = params.get("prizes")!.split(",").map((s) => s.trim()).filter(Boolean);
			const weights = params.has("weights")
				? params.get("weights")!.split(",").map((s) => parseInt(s.trim()) || 0)
				: [];
			if (names.length >= 2) {
				const color = updates.primaryColor || state.primaryColor;
				const altColors = ["#111115", color, "#1b1b22", color];
				const weightPer = Math.floor(90 / names.length);
				updates.prizes = names.map((n, i) => {
					const isLost = /perdu|rien/i.test(n);
					const col = isLost ? "#22222a" : altColors[i % altColors.length];
					const txt = col === "#111115" || col === "#22222a" || col === "#1b1b22" ? "#f5f5f7" : "#ffffff";
					const icon = guessIcon(n);
					const w = weights.length > i && !isNaN(weights[i]) && weights[i] > 0 ? weights[i] : isLost ? 5 : weightPer;
					return { id: i + 1, name: n.toUpperCase(), weight: w, color: col, textStyle: txt, icon };
				});
			}
		}

		// Cookie fallbacks
		const cookieName = getCookie("merchant_rest_name") || getCookie("admin_rest_name");
		const cookieSub = getCookie("merchant_rest_sub") || getCookie("admin_rest_sub");
		const cookieGoogle = getCookie("merchant_google_link") || getCookie("admin_google_link");
		const cookieColor = getCookie("merchant_theme_color") || getCookie("admin_theme_color");

		if (!updates.restaurantName && cookieName) updates.restaurantName = cookieName;
		if (!updates.restaurantSub && cookieSub) updates.restaurantSub = cookieSub;
		if (!updates.googleLink && cookieGoogle) updates.googleLink = cookieGoogle;
		if (!updates.primaryColor && cookieColor) updates.primaryColor = cookieColor;

		setState((prev) => ({ ...prev, ...updates }));

		// Hero image priority
		let finalSrc = DEFAULT_HERO_IMAGE_HQ;
		try {
			const merchantConfig = JSON.parse(localStorage.getItem("revioza_merchant_config") || "{}");
			if (merchantConfig.imageUrl) finalSrc = merchantConfig.imageUrl;
		} catch {}
		const savedHero = localStorage.getItem("revioza_custom_hero_image");
		if (savedHero) finalSrc = savedHero;
		if (updates.heroImage) finalSrc = updates.heroImage;
		setHeroSrc(finalSrc);

		// Apply primary color
		const finalColor = updates.primaryColor || state.primaryColor;
		document.documentElement.style.setProperty("--primary", finalColor);
		const hex = finalColor.replace("#", "");
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		document.documentElement.style.setProperty("--primary-glow", `rgba(${r},${g},${b},0.35)`);
	}, []);

	// Render wheel
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		renderWheelCanvas(canvas, ctx, state.prizes, 260);
	}, [state.prizes, state.step]);

	// Timer
	useEffect(() => {
		if (state.step === 5) {
			const interval = setInterval(() => {
				setState((prev) => {
					let s = prev.timerSeconds - 1;
					if (s <= 0) s = 7200;
					return { ...prev, timerSeconds: s };
				});
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [state.step]);

	const pad = (n: number) => String(n).padStart(2, "0");
	const formatTimer = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return `${pad(h)}:${pad(m)}:${pad(s)}`;
	};

	const goTo = useCallback((step: number) => {
		if (step < 1 || step > 5) return;
		setState((prev) => ({ ...prev, step }));
	}, []);

	const handleStarClick = useCallback(
		(val: number) => {
			setState((prev) => ({ ...prev, rating: val }));
			if (val >= 4) {
				setOverlayRedirect(true);
				const fullLink = getFullGoogleLink(state.googleLink);
				if (fullLink) window.open(fullLink, "_blank");
			}
		},
		[state.googleLink]
	);

	const handleSubmitPrivate = useCallback(() => {
		const txtarea = document.getElementById("private-text") as HTMLTextAreaElement;
		const feedbackText = txtarea ? txtarea.value.trim() : "";

		if (feedbackText) {
			const savedReviews = localStorage.getItem("revioza_private_reviews");
			let list: Array<Record<string, unknown>> = [];
			if (savedReviews) {
				try { list = JSON.parse(savedReviews); } catch {}
			}
			const newId = list.length > 0 ? Math.max(...list.map((r: Record<string, unknown>) => r.id as number)) + 1 : 1;
			const dateStr = "Aujourd'hui, " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
			list.unshift({
				id: newId,
				name: "Client Anonyme",
				email: "client.anonyme@gmail.com",
				rating: state.rating || 3,
				date: dateStr,
				text: feedbackText,
			});
			localStorage.setItem("revioza_private_reviews", JSON.stringify(list));
			addReviewToHistory(state.rating || 3);
		}

		if (txtarea) txtarea.value = "";
		goTo(3);
	}, [state.rating, goTo]);

	const spinWheel = useCallback(() => {
		if (state.isSpinning) return;
		setState((prev) => ({ ...prev, isSpinning: true }));

		const won = selectPrizeWeighted(state.prizes);
		const n = state.prizes.length;
		const idx = state.prizes.findIndex((p) => p.id === won.id);
		const deg = 360 / n;
		const target = 360 - (idx * deg + deg / 2);

		const canvas = canvasRef.current;
		if (canvas) {
			const prevRot = parseFloat(canvas.style.transform?.replace(/[^0-9.-]/g, "") || "0");
			const currentBase = Math.floor(prevRot / 360) * 360;
			const nextRot = currentBase + 5 * 360 + target;
			canvas.style.transition = "transform 4.5s cubic-bezier(0.12, 0.95, 0.35, 1)";
			canvas.style.transform = `rotate(${nextRot}deg)`;
		}

		setTimeout(() => {
			setState((prev) => ({ ...prev, isSpinning: false, wonPrize: won }));
			if (!won.name.toLowerCase().includes("perdu")) {
				import("canvas-confetti").then((mod) => {
					const confetti = mod.default;
					confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 } });
					setTimeout(() => confetti({ particleCount: 70, spread: 60, origin: { y: 0.55 }, angle: 60 }), 300);
					setTimeout(() => confetti({ particleCount: 70, spread: 60, origin: { y: 0.55 }, angle: 120 }), 500);
				});
			}
			setParticipationStatus("Déjà effectuée");
			setTimeout(() => goTo(4), 1000);
		}, 4600);
	}, [state.isSpinning, state.prizes, goTo]);

	const handleGoogleSignin = useCallback(() => {
		if (typeof window === "undefined") return;

		// Check if GIS SDK is available
		if (typeof (window as unknown as Record<string, unknown>).google === "undefined") {
			// Fallback: simulate
			setProfileEmail("Connecté avec<br><strong>client@gmail.com</strong>");
			setTimeout(() => goTo(2), 900);
			return;
		}

		setOverlayGoogleAuth(true);
		setGoogleAuthMode("loading");

		try {
			const google = (window as unknown as Record<string, unknown>).google as Record<string, unknown>;
			const accounts = google.accounts as Record<string, unknown>;
			const oauth2 = accounts.oauth2 as Record<string, (...args: unknown[]) => unknown>;

			const tokenClient = oauth2.initTokenClient({
				client_id: GOOGLE_CLIENT_ID,
				scope: "openid email profile",
				callback: async (tokenResponse: Record<string, string>) => {
					if (tokenResponse.error) {
						handleGoogleError(tokenResponse.error, tokenResponse.error_description);
						return;
					}
					try {
						const resp = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenResponse.access_token}`);
						if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
						const user = (await resp.json()) as any;
						setGoogleUser({
							name: user.name || "Utilisateur Google",
							email: user.email || "",
							picture: user.picture || "",
						});
						setProfileEmail(`Connecté avec<br><strong>${user.email}</strong>`);
						setGoogleAuthMode("success");
					} catch (err) {
						handleGoogleError("network_error", (err as Error).message);
					}
				},
				error_callback: (err: Record<string, string>) => {
					handleGoogleError("network_error", err.message || JSON.stringify(err));
				},
			}) as Record<string, (...args: unknown[]) => void>;

			tokenClient.requestAccessToken({ prompt: "select_account" });
		} catch {
			setProfileEmail("Connecté avec<br><strong>client@gmail.com</strong>");
			setTimeout(() => goTo(2), 900);
		}
	}, [goTo]);

	const handleGoogleError = (errorType: string, detailedMsg: string) => {
		let friendlyError = "Une erreur d'authentification est survenue.";
		let helpText = "Veuillez réessayer ou continuer en mode démo.";

		if (errorType === "popup_closed_by_user") {
			friendlyError = "La fenêtre de connexion a été fermée.";
			helpText = "Vous devez terminer l'authentification dans la fenêtre pop-up de Google pour vous connecter, ou vous pouvez continuer en mode démo pour tester.";
		} else if (errorType === "access_denied") {
			friendlyError = "L'accès au compte a été refusé.";
			helpText = "Vous devez accorder les autorisations demandées pour vous connecter via Google.";
		} else if (errorType === "origin_mismatch" || errorType === "idpiframe_initialization_failed" || (detailedMsg && detailedMsg.toLowerCase().includes("origin"))) {
			friendlyError = "Origine JavaScript non autorisée (Localhost).";
			helpText = `Pour autoriser l'authentification Google sur <strong>${typeof window !== "undefined" ? window.location.origin : ""}</strong> :<br>1. Allez sur votre <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--primary); text-decoration:underline;">Google Cloud Console</a>.<br>2. Sélectionnez votre Client ID OAuth 2.0.<br>3. Ajoutez l'origine exacte <strong>${typeof window !== "undefined" ? window.location.origin : ""}</strong> dans la section <strong>Origines JavaScript autorisées</strong>.<br>4. Sauvegardez et patientez 5 minutes, puis réactualisez.`;
		} else if (errorType === "network_error") {
			friendlyError = "Erreur de réseau ou blocage du SDK.";
			helpText = "Vérifiez votre connexion internet ou vos extensions de navigateur (les bloqueurs de publicités bloquent souvent l'authentification Google en local).";
		} else if (detailedMsg) {
			friendlyError = detailedMsg;
		}

		setGoogleAuthError({ msg: friendlyError, help: helpText });
		setGoogleAuthMode("error");
	};

	const activeNavItem = overlayRules ? "rules" : overlayProfile ? "profile" : "home";

	return (
		<div className="page-play">
			{/* SCREEN 1 — WELCOME */}
			<div className={`app-screen ${state.step === 1 ? "active" : ""}`} id="screen-1">
				<div className="screen-scroll">
					<div className="hero-banner">
						<img
							src={heroSrc}
							alt="Restaurant"
							className="hero-img"
							onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = DEFAULT_HERO_IMAGE_HQ; }}
						/>
						<div className="hero-gradient"></div>
					</div>
					<div className="screen-body">
						<h2 className="welcome-title">DONNEZ VOTRE AVIS <span>ET TENTEZ DE GAGNER !</span></h2>
						<div className="step-checklist">
							<div className="checklist-item">
								<div className="checklist-num">1</div>
								<div className="checklist-text">
									<h4>Connectez-vous avec Google</h4>
									<p>Authentifiez-vous en un tap pour accéder à l&apos;offre.</p>
								</div>
							</div>
							<div className="checklist-item">
								<div className="checklist-num">2</div>
								<div className="checklist-text">
									<h4>Déposez votre avis sincère</h4>
									<p>Partagez votre expérience sur Google Maps.</p>
								</div>
							</div>
							<div className="checklist-item">
								<div className="checklist-num">3</div>
								<div className="checklist-text">
									<h4>Faites tourner la roulette</h4>
									<p>Tournez la roue et découvrez votre récompense.</p>
								</div>
							</div>
							<div className="checklist-item">
								<div className="checklist-num">4</div>
								<div className="checklist-text">
									<h4>Récupérez votre gain</h4>
									<p>Présentez votre écran actif au serveur.</p>
								</div>
							</div>
						</div>
						<div className="cta-block">
							<button className="btn-google-signin" id="btn-google-signin" onClick={handleGoogleSignin}>
								<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="google-btn-logo" />
								JE TENTE MA CHANCE
							</button>
							<p className="google-legal-text">Connexion sécurisée via Google OAuth</p>
						</div>
					</div>
				</div>
			</div>

			{/* SCREEN 2 — REVIEW */}
			<div className={`app-screen ${state.step === 2 ? "active" : ""}`} id="screen-2">
				<div className="app-header">
					<button className="app-back-btn" onClick={() => goTo(1)}><i className="fa-solid fa-chevron-left"></i></button>
					<div className="app-header-center"><div className="header-title">DONNEZ VOTRE AVIS</div></div>
					<div className="app-header-right"></div>
				</div>
				<div className="screen-scroll">
					<div className="screen-body">
						<div className="google-logo-wrap">
							<img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" />
						</div>
						<h3 className="review-title">Votre avis compte !</h3>
						<p className="review-sub">
							Partagez votre expérience honnête chez <strong className="restaurant-name-bind">{state.restaurantName}</strong>. Cela nous aide à nous améliorer et permet à d&apos;autres clients de nous découvrir.
						</p>
						<div className="stars-container" id="stars-container">
							{[1, 2, 3, 4, 5].map((val) => (
								<span key={val} className={`star ${state.rating >= val ? "active" : ""}`} data-value={val} onClick={() => handleStarClick(val)}>
									{state.rating >= val ? "★" : "☆"}
								</span>
							))}
						</div>
						<p className="stars-hint">Sélectionnez votre note pour continuer</p>

						{/* Positive flow */}
						<div id="positive-flow" style={{ width: "100%", display: state.rating >= 4 ? "block" : "none" }}>
							<button className="btn-primary full-width" onClick={() => {
								setOverlayRedirect(true);
								const fullLink = getFullGoogleLink(state.googleLink);
								if (fullLink) window.open(fullLink, "_blank");
							}}>
								<i className="fa-brands fa-google"></i> LAISSER UN AVIS SUR GOOGLE
								<i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.75rem", marginLeft: "auto" }}></i>
							</button>
							<span className="helper-text">Vous serez redirigé vers Google Maps. Revenez ensuite sur cette page pour tourner la roue.</span>
						</div>

						{/* Private flow */}
						<div id="private-flow" style={{ display: state.rating > 0 && state.rating < 4 ? "block" : "none", textAlign: "left", marginTop: "0.5rem", width: "100%" }}>
							<label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>Retour d&apos;expérience privé</label>
							<textarea id="private-text" placeholder="Comment pouvons-nous améliorer notre service ? Votre avis reste 100% privé et destiné uniquement à la direction." style={{ width: "100%", minHeight: "52px", background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", padding: "0.5rem 0.75rem", fontFamily: "var(--font-body)", fontSize: "0.8rem", resize: "none", outline: "none", transition: "border-color 0.2s" }}></textarea>
							<button className="btn-primary full-width" onClick={handleSubmitPrivate} style={{ marginTop: "0.75rem" }}>
								<i className="fa-solid fa-paper-plane"></i> ENVOYER MON RETOUR PRIVÉ
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* SCREEN 3 — ROULETTE */}
			<div className={`app-screen ${state.step === 3 ? "active" : ""}`} id="screen-3">
				<div className="app-header">
					<button className="app-back-btn" onClick={() => goTo(2)}><i className="fa-solid fa-chevron-left"></i></button>
					<div className="app-header-center"><div className="header-title">LA ROULETTE</div></div>
					<div className="app-header-right"></div>
				</div>
				<div className="screen-scroll">
					<div className="screen-body roulette-body">
						<p className="wheel-tagline">Bonne chance ! Faites tourner la roue pour découvrir votre lot 🎉</p>
						<div className="wheel-arena">
							<div className="wheel-pointer" id="wheel-pointer"></div>
							<div className="wheel-bezel"></div>
							<canvas id="roulette-canvas" className="wheel-canvas" ref={canvasRef}></canvas>
							<div className="wheel-center-pin">
								<img src="/assets/logo_icon.png" alt="R" id="wheel-pin-img" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
							</div>
						</div>
						<div className="wheel-cta-block">
							<button className="btn-primary full-width btn-spin" onClick={spinWheel} disabled={state.isSpinning}>
								<i className="fa-solid fa-rotate-right"></i> TOURNER LA ROUE
							</button>
							<p className="helper-text">1 lancer accordé par jour et par personne.</p>
							<p className="helper-text" style={{ marginTop: "0.5rem", fontWeight: 500, textAlign: "center", fontSize: "0.72rem", lineHeight: 1.4, color: "var(--text-muted)" }}>
								<i className="fa-solid fa-circle-exclamation" style={{ color: "var(--primary)", marginRight: "4px" }}></i>
								N&apos;oubliez pas que vous devrez présenter la preuve de votre avis pour recevoir votre gain !
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* SCREEN 4 — VERIFICATION */}
			<div className={`app-screen ${state.step === 4 ? "active" : ""}`} id="screen-4">
				<div className="app-header no-border">
					<div className="app-header-center"><div className="header-title">Vérification</div></div>
				</div>
				<div className="screen-scroll">
					<div className="screen-body" style={{ textAlign: "center", gap: "20px" }}>
						<div style={{ color: "var(--primary)", fontSize: "3rem", marginTop: "10px" }}>
							<i className="fa-solid fa-circle-exclamation"></i>
						</div>
						<h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", color: "var(--text)" }}>Comment valider votre gain ?</h3>
						<div className="info-card" style={{ display: "flex", textAlign: "left", background: "rgba(229, 9, 20, 0.05)", border: "1px solid rgba(229, 9, 20, 0.15)", borderRadius: "12px", padding: "12px 14px", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>
							<i className="fa-solid fa-shield-halved" style={{ color: "var(--primary)", marginRight: "8px", flexShrink: 0, marginTop: "1px", fontSize: "0.9rem" }}></i>
							<p>Le serveur vérifiera visuellement votre avis publié lors du retrait du gain. Merci de ne pas supprimer l&apos;avis après participation.</p>
						</div>
						<div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "18px", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
							{[
								"Présentez l'écran suivant (avec le compte à rebours actif) au personnel.",
								"Montrez votre avis Google publié pour ce restaurant.",
								"Le coupon restera valable pendant 2 heures.",
							].map((text, i) => (
								<div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
									<div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "var(--primary)", color: "white", fontWeight: 700, fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>{i + 1}</div>
									<p style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.4 }}>{text}</p>
								</div>
							))}
						</div>
						<button className="btn-primary full-width" onClick={() => goTo(5)} style={{ marginTop: "10px" }}>
							<i className="fa-solid fa-ticket"></i> OBTENIR MON COUPON
						</button>
					</div>
				</div>
			</div>

			{/* SCREEN 5 — CONGRATULATIONS */}
			<div className={`app-screen ${state.step === 5 ? "active" : ""}`} id="screen-5">
				<div className="app-header no-border">
					<div className="app-header-center"><div className="header-title">FÉLICITATIONS ! 🎊</div></div>
				</div>
				<div className="screen-scroll">
					<div className="screen-body">
						<div className="confetti-header">
							<div className="trophy-icon"><i className="fa-solid fa-trophy"></i></div>
							<h3 className="celeb-title">C&apos;est gagné !</h3>
							<p className="celeb-sub">Bravo ! Voici votre récompense :</p>
						</div>
						<div className="prize-box">
							<div className="prize-emoji">{state.wonPrize?.icon || "☕"}</div>
							<div className="prize-label">{state.wonPrize?.name || "CAFÉ OFFERT"}</div>
						</div>
						<div className="timer-block">
							<div className="timer-label"><i className="fa-regular fa-clock"></i> Valable encore pendant</div>
							<div className="countdown-digits">{formatTimer(state.timerSeconds)}</div>
							<div className="countdown-labels">
								<span>heures</span><span>minutes</span><span>secondes</span>
							</div>
						</div>
						<div className="merchant-row">
							<div className="merchant-icon"><i className="fa-solid fa-store"></i></div>
							<div className="merchant-info">
								<span className="restaurant-name-bind merchant-name">{state.restaurantName}</span>
								<span className="restaurant-sub-bind merchant-sub">{state.restaurantSub}</span>
							</div>
						</div>
						<a href={getFullGoogleLink(state.googleLink) || "https://maps.google.com"} target="_blank" className="btn-secondary full-width" rel="noreferrer">
							<i className="fa-brands fa-google"></i> Accéder à Google Maps
							<i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.7rem", marginLeft: "auto" }}></i>
						</a>
						<div className="redemption-notice">
							<i className="fa-solid fa-circle-exclamation"></i>
							<p>Montrez cet <strong>écran actif</strong> (avec le compte à rebours défilant) ainsi que votre <strong>avis publié</strong> sur Google Maps au serveur pour recevoir votre gain !</p>
						</div>
					</div>
				</div>
			</div>

			{/* BOTTOM NAV */}
			<nav className="bottom-nav" id="bottom-nav">
				<div className={`nav-item ${activeNavItem === "home" ? "active" : ""}`} onClick={() => { if (state.step < 5) goTo(1); setOverlayRules(false); setOverlayProfile(false); }}>
					<i className="fa-solid fa-house"></i><span>Accueil</span>
				</div>
				<div className={`nav-item ${activeNavItem === "rules" ? "active" : ""}`} onClick={() => { setOverlayRules(true); setOverlayProfile(false); }}>
					<i className="fa-solid fa-circle-info"></i><span>Règles</span>
				</div>
				<div className={`nav-item ${activeNavItem === "profile" ? "active" : ""}`} onClick={() => { setOverlayProfile(true); setOverlayRules(false); }}>
					<i className="fa-solid fa-user"></i><span>Profil</span>
				</div>
			</nav>

			{/* REDIRECT OVERLAY */}
			<div className={`overlay ${overlayRedirect ? "active" : ""}`} id="overlay-redirect">
				<div className="overlay-card">
					<div className="overlay-icon google"><i className="fa-solid fa-map-location-dot"></i></div>
					<h4 className="overlay-title">Redirection vers Google Maps</h4>
					<p className="overlay-desc">
						Vous allez être redirigé vers la fiche Google de l&apos;établissement.<br /><br />
						<em>Déposez votre avis, puis revenez sur cette page pour lancer la roue.</em>
					</p>
					<button className="btn-primary full-width" onClick={() => { addReviewToHistory(state.rating || 5); setOverlayRedirect(false); goTo(3); }}>
						<i className="fa-solid fa-check"></i> J&apos;ai déposé mon avis !
					</button>
				</div>
			</div>

			{/* PROFILE OVERLAY */}
			<div className={`overlay ${overlayProfile ? "active" : ""}`} id="overlay-profile">
				<div className="overlay-card">
					<button className="overlay-close" onClick={() => setOverlayProfile(false)}><i className="fa-solid fa-xmark"></i></button>
					<div className="overlay-icon" style={{ background: "rgba(229, 9, 20, 0.1)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<i className="fa-solid fa-circle-user" style={{ fontSize: "2rem" }}></i>
					</div>
					<h4 className="overlay-title">Mon Profil Client</h4>
					<p className="overlay-desc" dangerouslySetInnerHTML={{ __html: profileEmail }}></p>
					<div style={{ width: "100%", background: "#1a1a24", borderRadius: "12px", padding: "0.75rem", marginTop: "0.5rem", textAlign: "left", border: "1px solid rgba(255,255,255,0.05)" }}>
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.75rem" }}>
							<span style={{ color: "var(--muted)" }}>Statut du jour :</span>
							<span style={{ fontWeight: 700, color: participationStatus === "Disponible" ? "var(--green)" : "var(--primary)" }}>{participationStatus}</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
							<span style={{ color: "var(--muted)" }}>Nombre de lancers :</span>
							<span style={{ fontWeight: 700, color: "#fff" }}>1 aujourd&apos;hui</span>
						</div>
					</div>
					<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
						<button className="btn-primary full-width" onClick={() => setOverlayProfile(false)} style={{ width: "100%" }}>Retour au jeu</button>
					</div>
				</div>
			</div>

			{/* RULES OVERLAY */}
			<div className={`overlay ${overlayRules ? "active" : ""}`} id="overlay-rules">
				<div className="overlay-card">
					<button className="overlay-close" onClick={() => setOverlayRules(false)}><i className="fa-solid fa-xmark"></i></button>
					<div className="overlay-icon primary"><i className="fa-solid fa-scroll"></i></div>
					<h4 className="overlay-title">Règles du jeu</h4>
					<div className="rules-list">
						{[
							<>Réservé aux <strong>clients physiques</strong> de l&apos;établissement.</>,
							<>Limité à <strong>1 participation par jour</strong> et par personne.</>,
							<>Le gain est <strong>valable 2 heures</strong> après le tirage.</>,
							<>L&apos;avis Google doit rester <strong>publié</strong> pour valider le gain.</>,
							<>Le serveur vérifiera votre avis <strong>visuellement</strong> lors du retrait.</>,
						].map((text, i) => (
							<div key={i} className="rule-item">
								<div className="rule-num">{i + 1}</div>
								<p>{text}</p>
							</div>
						))}
					</div>
					<button className="btn-primary full-width" onClick={() => setOverlayRules(false)}>Compris !</button>
				</div>
			</div>

			{/* GOOGLE AUTH OVERLAY */}
			<div className={`overlay ${overlayGoogleAuth ? "active" : ""}`} id="overlay-google-auth">
				<div className="overlay-card" style={{ textAlign: "center" }}>
					{googleAuthMode === "loading" && (
						<>
							<div className="google-auth-spinner">
								<svg viewBox="0 0 48 48" width="40" height="40">
									<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
									<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
									<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
									<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
								</svg>
							</div>
							<div className="google-auth-loading"><span></span><span></span><span></span></div>
						</>
					)}
					<h4 className="overlay-title">
						{googleAuthMode === "loading" ? "Connexion avec Google" : googleAuthMode === "success" ? "Compte vérifié ✓" : "⚠️ Échec de connexion"}
					</h4>
					<p className="overlay-desc">
						{googleAuthMode === "loading" ? "Authentification en cours…" : googleAuthMode === "success" ? "Vous êtes connecté avec votre compte Google." : "Nous n'avons pas pu valider votre identité Google."}
					</p>
					{googleAuthMode === "success" && googleUser && (
						<div style={{ width: "100%" }}>
							<div className="google-user-avatar">
								{googleUser.picture ? (
									<img src={googleUser.picture} alt={googleUser.name} style={{ width: "56px", height: "56px", borderRadius: "50%", border: "3px solid var(--primary)", objectFit: "cover" }} />
								) : (
									<div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 800, margin: "0 auto" }}>
										{googleUser.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
									</div>
								)}
							</div>
							<p className="google-user-name">{googleUser.name}</p>
							<p className="google-user-email">{googleUser.email}</p>
							<button className="btn-primary full-width" onClick={() => { setOverlayGoogleAuth(false); goTo(2); }} style={{ marginTop: "1rem" }}>
								<i className="fa-solid fa-check"></i> Continuer
							</button>
						</div>
					)}
					{googleAuthMode === "error" && (
						<div style={{ width: "100%" }}>
							<p style={{ color: "var(--primary)", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.6rem" }}>{googleAuthError.msg}</p>
							<div style={{ color: "var(--muted)", fontSize: "0.75rem", lineHeight: 1.4, marginBottom: "1rem", textAlign: "left", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }} dangerouslySetInnerHTML={{ __html: googleAuthError.help }}></div>
							<button className="btn-primary full-width" onClick={() => {
								setOverlayGoogleAuth(false);
								setProfileEmail("Connecté avec<br><strong>demo.user@gmail.com (Mode Démo)</strong>");
								goTo(2);
							}} style={{ marginTop: "0.5rem", background: "var(--green)", borderColor: "var(--green)", boxShadow: "0 4px 16px rgba(52, 199, 89, 0.25)" }}>
								<i className="fa-solid fa-circle-play"></i> Continuer en mode Démo
							</button>
						</div>
					)}
					<button className="btn-secondary full-width" onClick={() => setOverlayGoogleAuth(false)} style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}>Annuler</button>
				</div>
			</div>

			{/* Google Identity Services Script */}
			<script src="https://accounts.google.com/gsi/client" async defer></script>
		</div>
	);
}
