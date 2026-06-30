import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Route } from "./+types/demo";
import "../styles/style.css";
import "../styles/pricing.css";
import {
	type Prize,
	type AppState,
	DEFAULT_PRIZES,
	DEFAULT_HERO_IMAGE,
	IMGBB_API_KEY,
	GOOGLE_CLIENT_ID,
	getFullGoogleLink,
	selectPrizeWeighted,
	adjustWeights,
	handlePrizeDeleted,
	renderWheelCanvas,
	addReviewToHistory,
	saveConfigToStorage,
	loadConfigFromStorage,
} from "../utils/state";
import {
	setCookie,
	getCookie,
} from "../utils/cookies";
import { supabase } from "../utils/supabase-client";
import { useMerchantSession } from "../utils/useMerchantSession";

export function meta({ }: Route.MetaArgs) {
	return [
		{ title: "Revioza - Personnalisez votre Roue | Démo Interactive" },
		{
			name: "description",
			content:
				"Personnalisez l'apparence, les lots et le fonctionnement de votre roulette interactive en direct.",
		},
	];
}

const DEFAULT_APP_STATE: AppState = {
	currentStep: 1,
	restaurantName: "Bella Napoli",
	restaurantSub: "Pizzeria",
	primaryColor: "#e50914",
	googleLink: "ChIJN1t_tDeuEmsRUsoyG83VY24",
	imageUrl: "",
	prizes: [...DEFAULT_PRIZES],
	selectedPrize: null,
	isSpinning: false,
	rating: 0,
	timerInterval: null,
	timerSeconds: 7183,
};

const getGlowColor = (hexColor: string) => {
	const hex = hexColor.replace("#", "");
	if (hex.length === 3) {
		const r = parseInt(hex[0] + hex[0], 16);
		const g = parseInt(hex[1] + hex[1], 16);
		const b = parseInt(hex[2] + hex[2], 16);
		return `rgba(${r},${g},${b},0.35)`;
	} else if (hex.length === 6) {
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		return `rgba(${r},${g},${b},0.35)`;
	}
	return "rgba(229,9,20,0.35)";
};

export default function Demo() {
	const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
	const [heroSrc, setHeroSrc] = useState(DEFAULT_HERO_IMAGE);
	const [uploadPreview, setUploadPreview] = useState<string | null>(null);
	const [uploadStatus, setUploadStatus] = useState<{ msg: string; isError: boolean } | null>(null);
	const [overlayRegister, setOverlayRegister] = useState(false);
	const [activeTab, setActiveTab] = useState<"login" | "register">("login");
	const [overlayGoogleAuth, setOverlayGoogleAuth] = useState(false);
	const [googleAuthMode, setGoogleAuthMode] = useState<"loading" | "success" | "error">("loading");
	const [googleAuthError, setGoogleAuthError] = useState({ msg: "", help: "" });
	const [googleUser, setGoogleUser] = useState<{ name: string; email: string; picture: string } | null>(null);
	const [alertOverlay, setAlertOverlay] = useState(false);
	const [placeIdHelp, setPlaceIdHelp] = useState(false);
	const [overlayRules, setOverlayRules] = useState(false);
	const [overlayProfile, setOverlayProfile] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const prefersReducedMotion = useReducedMotion();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => setIsMounted(true), []);

	useEffect(() => {
		if (typeof document !== "undefined") {
			document.documentElement.style.removeProperty("--primary");
			document.documentElement.style.removeProperty("--primary-glow");
		}

		const saved = loadConfigFromStorage(DEFAULT_APP_STATE);
		saved.timerInterval = null;
		saved.selectedPrize = null;
		saved.isSpinning = false;
		setAppState(saved);

		const savedHero = localStorage.getItem("revioza_custom_hero_image");
		if (savedHero) {
			setHeroSrc(savedHero);
			setUploadPreview(savedHero);
		} else if (saved.imageUrl) {
			setHeroSrc(saved.imageUrl);
		}

		const cookieName = getCookie("admin_rest_name");
		const cookieSub = getCookie("admin_rest_sub");
		const cookieGoogle = getCookie("admin_google_link");
		const cookieColor = getCookie("admin_theme_color");
		const cookieImage = getCookie("admin_image_url");

		if (cookieName || cookieSub || cookieGoogle || cookieColor || cookieImage) {
			setAppState((prev) => ({
				...prev,
				restaurantName: cookieName || prev.restaurantName,
				restaurantSub: cookieSub || prev.restaurantSub,
				googleLink: cookieGoogle || prev.googleLink,
				primaryColor: cookieColor || prev.primaryColor,
				imageUrl: cookieImage || prev.imageUrl,
			}));
		}

		// URL parameter check for registration / login popup
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get("register") === "true") {
			setActiveTab("register");
			setOverlayRegister(true);
			window.history.replaceState({}, document.title, window.location.pathname);
		} else if (urlParams.get("login") === "true" || urlParams.get("login") === "required") {
			setActiveTab("login");
			setOverlayRegister(true);
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}, []);

	useEffect(() => {
		const revealEls = document.querySelectorAll(".reveal");
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add("in-view");
					}
				});
			},
			{ threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
		);
		revealEls.forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	}, [isMounted]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		renderWheelCanvas(canvas, ctx, appState.prizes, 270);
	}, [appState.prizes, appState.currentStep]);

	useEffect(() => {
		if (appState.currentStep === 4) {
			const interval = setInterval(() => {
				setAppState((prev) => {
					let newSeconds = prev.timerSeconds - 1;
					if (newSeconds <= 0) newSeconds = 7200;
					return { ...prev, timerSeconds: newSeconds };
				});
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [appState.currentStep]);

	const formatTimer = useCallback((seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	}, []);

	const updateAndSave = useCallback(
		(updates: Partial<AppState>) => {
			setAppState((prev) => {
				const next = { ...prev, ...updates };
				saveConfigToStorage(next);
				return next;
			});
		},
		[]
	);

	const goToStep = useCallback(
		(step: number) => {
			if (step < 1 || step > 4) return;
			setAppState((prev) => ({ ...prev, currentStep: step }));
		},
		[]
	);

	const handleStarClick = useCallback(
		(val: number) => {
			// /demo = simulation brève : on garde l'effet visuel (étoiles qui se
			// remplissent), puis on affiche le popup « J'ai déposé mon avis » et on
			// passe à la roue. AUCUNE redirection (pas de Place ID sur /demo).
			setAppState((prev) => ({ ...prev, rating: val }));
			addReviewToHistory(val);
			// petit délai pour laisser voir le remplissage des étoiles avant le popup
			setTimeout(() => setAlertOverlay(true), 350);
		},
		[]
	);

	const { loggedIn, signOut } = useMerchantSession();

	const openRegisterModal = useCallback(() => {
		setActiveTab("register");
		setOverlayRegister(true);
	}, []);

	const openLoginModal = useCallback(() => {
		setActiveTab("login");
		setOverlayRegister(true);
	}, []);

	const handleGoogleSignin = useCallback(() => {
		goToStep(2);
	}, [goToStep]);

	const spinWheel = useCallback(() => {
		if (appState.isSpinning) return;

		setAppState((prev) => ({ ...prev, isSpinning: true }));

		const won = selectPrizeWeighted(appState.prizes);
		const numSectors = appState.prizes.length;
		const selectedIndex = appState.prizes.findIndex((p) => p.id === won.id);
		const anglePerSector = 360 / numSectors;
		const targetAngle = 360 - selectedIndex * anglePerSector;

		const canvas = canvasRef.current;
		if (canvas) {
			const currentRotation = parseFloat(canvas.style.transform?.replace(/[^0-9.-]/g, "") || "0");
			const spinRotations = 5 * 360;
			const currentBase = Math.floor(currentRotation / 360) * 360;
			const finalRotation = currentBase + spinRotations + targetAngle;

			canvas.style.transition = "transform 4.5s cubic-bezier(0.15, 0.95, 0.35, 1)";
			canvas.style.transform = `rotate(${finalRotation}deg)`;
		}

		setTimeout(() => {
			setAppState((prev) => ({
				...prev,
				isSpinning: false,
				selectedPrize: won,
			}));

			if (!won.name.toLowerCase().includes("perdu")) {
				import("canvas-confetti").then((mod) => {
					const confetti = mod.default;
					const confCanvas = confettiCanvasRef.current;
					if (confCanvas) {
						const myConfetti = confetti.create(confCanvas, {
							resize: true,
							useWorker: true,
						});
						myConfetti({
							particleCount: 80,
							spread: 60,
							origin: { x: 0.5, y: 0.5 },
						});
					}
				});
			}

			setTimeout(() => goToStep(4), 1200);
		}, 4500);
	}, [appState.isSpinning, appState.prizes, goToStep]);

	const handleColorChange = useCallback(
		(color: string) => {
			updateAndSave({ primaryColor: color });
			setCookie("admin_theme_color", color);
			const canvas = canvasRef.current;
			if (canvas) {
				const ctx = canvas.getContext("2d");
				if (ctx) renderWheelCanvas(canvas, ctx, appState.prizes, 270);
			}
		},
		[appState.prizes, updateAndSave]
	);

	const handleAddPrize = useCallback(() => {
		setAppState((prev) => {
			const newId = prev.prizes.length > 0 ? Math.max(...prev.prizes.map((p) => p.id)) + 1 : 1;
			const colors = ["#111115", "#e50914", "#22222a", "#34c759", "#4285f4"];
			const nextColor = colors[prev.prizes.length % colors.length];
			const newPrizes = [
				...prev.prizes,
				{
					id: newId,
					name: "NOUVEAU LOT",
					weight: 10,
					color: nextColor,
					textStyle: "#ffffff",
					icon: "🎁",
				},
			];
			adjustWeights(newPrizes, newId, 10);
			const next = { ...prev, prizes: newPrizes };
			saveConfigToStorage(next);
			return next;
		});
	}, []);

	const handleDeletePrize = useCallback((prizeId: number) => {
		setAppState((prev) => {
			if (prev.prizes.length <= 2) {
				alert("Il faut au moins 2 lots sur la roue !");
				return prev;
			}
			const newPrizes = prev.prizes.filter((p) => p.id !== prizeId);
			handlePrizeDeleted(newPrizes);
			const next = { ...prev, prizes: newPrizes };
			saveConfigToStorage(next);
			return next;
		});
	}, []);

	const handlePrizeFieldChange = useCallback(
		(prizeId: number, field: string, value: string) => {
			setAppState((prev) => {
				const newPrizes = [...prev.prizes];
				const idx = newPrizes.findIndex((p) => p.id === prizeId);
				if (idx === -1) return prev;

				if (field === "weight") {
					const numVal = parseInt(value) || 1;
					adjustWeights(newPrizes, prizeId, numVal);
				} else if (field === "name") {
					newPrizes[idx] = { ...newPrizes[idx], name: value };
				} else if (field === "color") {
					newPrizes[idx] = { ...newPrizes[idx], color: value };
				}

				const next = { ...prev, prizes: newPrizes };
				saveConfigToStorage(next);
				return next;
			});
		},
		[]
	);

	const handleFileUpload = useCallback(
		async (file: File) => {
			if (!file || !file.type.startsWith("image/")) return;

			const reader = new FileReader();
			reader.onload = async (e) => {
				const base64 = e.target?.result as string;
				setHeroSrc(base64);
				setUploadPreview(base64);
				setUploadStatus({ msg: "⏳ Hébergement de l'image en cours…", isError: false });

				try {
					const base64Clean = base64.split(",")[1];
					const formData = new FormData();
					formData.append("key", IMGBB_API_KEY);
					formData.append("image", base64Clean);

					const response = await fetch("https://api.imgbb.com/1/upload", {
						method: "POST",
						body: formData,
					});

					if (!response.ok) throw new Error("Échec de l'upload");
					const data = (await response.json()) as any;
					if (!data.success) throw new Error(data.error?.message || "Erreur inconnue");

					const publicUrl = data.data.url;
					setHeroSrc(publicUrl);
					updateAndSave({ imageUrl: publicUrl });
					localStorage.setItem("revioza_custom_hero_image", publicUrl);
					setCookie("admin_image_url", publicUrl);
					setUploadStatus({ msg: "✓ Image hébergée — visible sur tous les appareils !", isError: false });
					setTimeout(() => setUploadStatus(null), 5000);
				} catch (err) {
					console.warn("Upload ImgBB échoué:", err);
					localStorage.setItem("revioza_custom_hero_image", base64);
					setUploadStatus({
						msg: "📱 Image enregistrée sur cet appareil. Pour la rendre visible sur tous les appareils, collez son URL dans le champ ci-dessous.",
						isError: true,
					});
				}
			};
			reader.readAsDataURL(file);
		},
		[updateAndSave]
	);

	const handleRemoveImage = useCallback(() => {
		setHeroSrc(DEFAULT_HERO_IMAGE);
		setUploadPreview(null);
		updateAndSave({ imageUrl: "" });
		localStorage.removeItem("revioza_custom_hero_image");
		setCookie("admin_image_url", "");
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, [updateAndSave]);

	const handleGenerateQr = useCallback(() => {
		saveConfigToStorage(appState);
		const url = new URL("/qr-code", window.location.origin);
		window.location.href = url.toString();
	}, [appState]);

	const handleOpenClient = useCallback(() => {
		const url = new URL("/play", window.location.origin);
		url.searchParams.set("name", appState.restaurantName);
		url.searchParams.set("sub", appState.restaurantSub);
		url.searchParams.set("color", appState.primaryColor);
		url.searchParams.set("google_link", getFullGoogleLink(appState.googleLink));
		if (appState.imageUrl) url.searchParams.set("image", appState.imageUrl);
		const prizeNames = appState.prizes.map((p) => p.name).join(",");
		const prizeWeights = appState.prizes.map((p) => p.weight).join(",");
		url.searchParams.set("prizes", prizeNames);
		url.searchParams.set("weights", prizeWeights);
		window.open(url.toString(), "_blank");
	}, [appState]);

	const handleFormLogin = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const email = (document.getElementById("login-email") as HTMLInputElement)?.value;
			if (email) localStorage.setItem("revioza_merchant_email", email);
			window.location.href = "/merchant";
		},
		[]
	);

	const handleFormRegister = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const restName = (document.getElementById("register-rest-name") as HTMLInputElement)?.value;
			const restSub = (document.getElementById("register-rest-sub") as HTMLInputElement)?.value;
			const email = (document.getElementById("register-email") as HTMLInputElement)?.value;

			const updates: Partial<AppState> = {};
			if (restName) updates.restaurantName = restName;
			if (restSub) updates.restaurantSub = restSub;
			if (email) localStorage.setItem("revioza_merchant_email", email);
			updateAndSave(updates);

			window.location.href = "/merchant";
		},
		[updateAndSave]
	);

	const handleGoogleError = useCallback((errorType: string, detailedMsg: string) => {
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
	}, []);

	const handleGoogleLogin = useCallback(async () => {
		setOverlayGoogleAuth(true);
		setGoogleAuthMode("loading");
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: `${window.location.origin}/auth/callback` },
		});
		if (error) {
			handleGoogleError("network_error", error.message);
		}
	}, [handleGoogleError]);

	const stepTitles = [
		"1. Connexion Client",
		"2. Avis sur Google",
		"3. Lancer de la Roue",
		"4. Félicitations !",
	];

	const renderPhoneSimulator = (isHero: boolean) => {
		const displayHeroSrc = isHero ? DEFAULT_HERO_IMAGE : heroSrc;
		const displayName = isHero ? "Bella Napoli" : appState.restaurantName;
		const displaySub = isHero ? "Pizzeria" : appState.restaurantSub;

		return (
			<div
				className={`phone-simulator-wrapper${isHero ? " hero-phone" : " demo-phone-scope"}`}
				style={{
					"--primary": isHero ? "#e50914" : appState.primaryColor,
					"--primary-glow": isHero ? "rgba(229, 9, 20, 0.35)" : getGlowColor(appState.primaryColor),
				} as React.CSSProperties}
			>
				<div className="phone-container">
					<div className="phone-notch">
						<div className="phone-notch-camera"></div>
						<div className="phone-notch-speaker"></div>
					</div>

					<div className="phone-status-bar">
						<span>9:41</span>
						<div className="phone-status-icons">
							<i className="fa-solid fa-signal"></i>
							<i className="fa-solid fa-wifi"></i>
							<i className="fa-solid fa-battery-full"></i>
						</div>
					</div>

					<div className="phone-content">
						{!isHero && (
							<canvas
								ref={confettiCanvasRef}
								style={{
									position: "absolute",
									inset: 0,
									pointerEvents: "none",
									zIndex: 98,
									width: "100%",
									height: "100%",
								}}
							/>
						)}
						{/* STEP 1: WELCOME */}
						<div
							className={`app-screen ${isHero || appState.currentStep === 1 ? "active" : ""}`}
							id={isHero ? "hero-screen-1" : "screen-1"}
						>
							<div className="app-screen-content">
								<div className="hero-pizza-image">
									<img
										id={isHero ? "hero-display-img" : "hero-simulator-img"}
										src={displayHeroSrc}
										alt={displayName}
									/>
									<div className="hero-pizza-overlay"></div>
								</div>
								<h2 className="app-title-large">
									DONNEZ VOTRE AVIS <span>ET TENTEZ DE GAGNER !</span>
								</h2>
								<div className="step-checklist">
									<div className="checklist-item">
										<div className="checklist-icon">1</div>
										<div className="checklist-text">
											<h4>Donnez votre avis</h4>
											<p>Partagez votre expérience sur Google.</p>
										</div>
									</div>
									<div className="checklist-item">
										<div className="checklist-icon">2</div>
										<div className="checklist-text">
											<h4>Faites tourner la roulette</h4>
											<p>Tournez la roue et tentez de gagner.</p>
										</div>
									</div>
									<div className="checklist-item">
										<div className="checklist-icon">3</div>
										<div className="checklist-text">
											<h4>Récupérez votre lot</h4>
											<p>Montrez votre ticket en caisse pour en profiter.</p>
										</div>
									</div>
								</div>
								<button className="btn-google-signin" onClick={handleGoogleSignin}>
									<img
										src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
										alt="Google"
									/>
									JE TENTE MA CHANCE
								</button>
							</div>
						</div>

						{/* Interactive screens */}
						{!isHero && (
							<>
								{/* STEP 2: LEAVE REVIEW */}
								<div className={`app-screen ${appState.currentStep === 2 ? "active" : ""}`} id="screen-2">
									<div className="app-header">
										<button className="app-back-btn" onClick={() => goToStep(1)}>
											<i className="fa-solid fa-chevron-left"></i>
										</button>
										<div className="app-brand-center">DONNEZ VOTRE AVIS</div>
										<div className="app-header-right"></div>
									</div>
									<div className="app-screen-content">
										<div className="google-logo-wrapper">
											<img
												src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg"
												alt="Google"
											/>
										</div>
										<h3 className="review-headline">Votre avis compte !</h3>
										<p className="review-subtext">
											Partagez votre expérience sur Google et aidez-nous à nous améliorer.
										</p>
										<div className="stars-container">
											{[1, 2, 3, 4, 5].map((val) => (
												<span
													key={val}
													className={`star-interactive ${appState.rating >= val ? "active" : ""}`}
													data-value={val}
													onClick={() => handleStarClick(val)}
												>
													{appState.rating >= val ? "★" : "☆"}
												</span>
											))}
										</div>

										{/* Positive flow */}
										<div
											id="positive-review-flow"
											style={{ width: "100%", display: appState.rating >= 4 ? "block" : "none" }}
										>
											<button
												className="btn-google-action"
												onClick={() => setAlertOverlay(true)}
											>
												LAISSER UN AVIS SUR GOOGLE{" "}
												<i className="fa-solid fa-arrow-up-right-from-square"></i>
											</button>
											<span className="google-redirect-info">
												Laissez votre avis puis revenez ici pour lancer la roue.
											</span>
										</div>

										{/* Private flow */}
										<div
											id="private-feedback-flow"
											style={{
												display: appState.rating > 0 && appState.rating < 4 ? "block" : "none",
												width: "100%",
												textAlign: "left",
												marginTop: "0.5rem",
												marginBottom: "0.5rem",
											}}
										>
											<label
												style={{
													fontSize: "0.65rem",
													fontWeight: 700,
													color: "var(--text-muted)",
													textTransform: "uppercase",
													letterSpacing: "0.05em",
												}}
											>
												Avis privé constructif
											</label>
											<textarea
												id="private-feedback-text"
												placeholder="Dites-nous ce qui n'a pas été pour que nous puissions nous améliorer..."
												style={{
													width: "100%",
													minHeight: "70px",
													marginTop: "0.4rem",
													background: "var(--bg-input)",
													border: "1px solid var(--border-color)",
													borderRadius: "8px",
													color: "var(--text-main)",
													padding: "0.5rem 0.75rem",
													fontFamily: "var(--font-body)",
													fontSize: "0.8rem",
													resize: "none",
													outline: "none",
												}}
											></textarea>
											<button
												className="btn-google-action"
												style={{ marginTop: "0.6rem", background: "var(--primary)" }}
												onClick={() => {
													const txtarea = document.getElementById("private-feedback-text") as HTMLTextAreaElement;
													if (txtarea) txtarea.value = "";
													addReviewToHistory(appState.rating || 3);
													goToStep(3);
												}}
											>
												ENVOYER MON RETOUR PRIVÉ{" "}
												<i className="fa-solid fa-paper-plane" style={{ marginLeft: "0.4rem" }}></i>
											</button>
										</div>

										<div
											className="review-safety-lock"
											style={{ display: appState.rating >= 4 ? "flex" : "none" }}
										>
											<i className="fa-solid fa-eye"></i>
											<span>Le serveur validera visuellement l&apos;avis lors du retrait du lot.</span>
										</div>
									</div>
								</div>

								{/* STEP 3: ROULETTE */}
								<div className={`app-screen ${appState.currentStep === 3 ? "active" : ""}`} id="screen-3">
									<div className="app-header">
										<button className="app-back-btn" onClick={() => goToStep(2)}>
											<i className="fa-solid fa-chevron-left"></i>
										</button>
										<div className="app-brand-center">LA ROUE</div>
										<div className="app-header-right"></div>
									</div>
									<div className="app-screen-content">
										<p className="wheel-instructions">Faites tourner la roue et tentez votre chance !</p>
										<div className="wheel-outer-container">
											<div className="wheel-pointer" id="wheel-pointer"></div>
											<div className="wheel-bezel"></div>
											<canvas className="wheel-canvas" id="roulette-canvas" ref={canvasRef}></canvas>
											<div className="wheel-center-pin">
												<img
													src="/assets/logo_icon.png"
													alt="R"
													style={{
														width: "100%",
														height: "100%",
														objectFit: "cover",
														borderRadius: "50%",
													}}
												/>
											</div>
										</div>
										<button
											className="btn-spin-wheel"
											onClick={spinWheel}
											disabled={appState.isSpinning}
										>
											TOURNER LA ROUE
										</button>
										<span className="spin-limit-info">1 lancer par jour et par personne.</span>
										<span
											className="spin-limit-info"
											style={{
												marginTop: "0.4rem",
												fontWeight: 500,
												textAlign: "center",
												maxWidth: "90%",
												lineHeight: 1.3,
											}}
										>
											<i
												className="fa-solid fa-circle-exclamation"
												style={{ color: "var(--primary)", marginRight: "3px" }}
											></i>
											N&apos;oubliez pas que vous devrez présenter la preuve de votre avis pour recevoir
											votre gain !
										</span>
									</div>
								</div>

								{/* STEP 4: CONGRATULATIONS */}
								<div className={`app-screen ${appState.currentStep === 4 ? "active" : ""}`} id="screen-4">
									<div className="app-header">
										<div className="app-brand-center">FÉLICITATIONS !</div>
									</div>
									<div className="app-screen-content">
										<h3 className="celeb-title">Vous avez gagné !</h3>
										<p className="celeb-subtitle">Bravo ! Voici votre récompense :</p>
										<div className="prize-showcase-box">
											<div className="prize-visual-icon">{appState.selectedPrize?.icon || "☕"}</div>
											<div className="prize-name-won">
												{appState.selectedPrize?.name || "Café offert"}
											</div>
										</div>
										<div className="timer-box">
											<span className="timer-title">Valable encore pendant</span>
											<div className="countdown-digits">{formatTimer(appState.timerSeconds)}</div>
											<div className="countdown-labels">
												<span>heures</span>
												<span>minutes</span>
												<span>secondes</span>
											</div>
										</div>
										<div className="coupon-merchant-info">
											<div className="merchant-avatar">
												<i className="fa-solid fa-store" style={{ color: "var(--primary)" }}></i>
											</div>
											<div>
												<span className="restaurant-name-bind" style={{ fontWeight: 700 }}>
													{appState.restaurantName}
												</span>{" "}
												- <span className="restaurant-sub-bind">{appState.restaurantSub}</span>
											</div>
										</div>
										<a href="https://maps.google.com" target="_blank" className="btn-review-google-link" rel="noreferrer">
											LIEN VERS LES AVIS <i className="fa-solid fa-arrow-up-right-from-square"></i>
										</a>
										<p className="ticket-redeem-notice">
											Montrez cet <strong>écran actif</strong> (compte à rebours défilant) ainsi que
											votre <strong>avis publié</strong> au serveur pour recevoir votre gain !
										</p>
									</div>
								</div>

								{/* Bottom Nav */}
								<div className="app-bottom-nav">
									<div
										className={`nav-item ${appState.currentStep === 3 && !overlayRules && !overlayProfile ? "active" : ""}`}
										onClick={() => {
											setOverlayRules(false);
											setOverlayProfile(false);
											goToStep(3);
										}}
									>
										<i className="fa-solid fa-house"></i>
										Accueil
									</div>
									<div
										className={`nav-item ${overlayRules ? "active" : ""}`}
										onClick={() => {
											setOverlayRules(true);
											setOverlayProfile(false);
										}}
									>
										<i className="fa-solid fa-circle-info"></i>
										Règles
									</div>
									<div
										className={`nav-item ${overlayProfile ? "active" : ""}`}
										onClick={() => {
											setOverlayProfile(true);
											setOverlayRules(false);
										}}
									>
										<i className="fa-solid fa-user"></i>
										Profil
									</div>
								</div>

								{/* Alert Overlay */}
								<div
									className={`phone-alert-overlay ${alertOverlay ? "active" : ""}`}
									id="phone-alert-overlay"
								>
									<div className="phone-alert-card">
										<div className="phone-alert-icon" style={{ backgroundColor: "rgba(52, 199, 89, 0.12)", color: "var(--accent-green)" }}>
											<i className="fa-solid fa-circle-check"></i>
										</div>
										<h4 className="phone-alert-title">J&apos;ai déposé mon avis</h4>
										<p className="phone-alert-desc">
											Merci&nbsp;! Votre avis a bien été pris en compte.
											<br />
											Lancez la roue pour découvrir votre récompense.
										</p>
										<button
											className="btn-alert-action"
											onClick={() => {
												setAlertOverlay(false);
												goToStep(3);
											}}
										>
											Lancer la roue 🎡
										</button>
									</div>
								</div>

								{/* Rules Overlay */}
								<div className={`phone-alert-overlay ${overlayRules ? "active" : ""}`}>
									<div className="phone-alert-card">
										<div className="phone-alert-icon" style={{ backgroundColor: "rgba(52, 199, 89, 0.1)", color: "var(--accent-green)" }}>
											<i className="fa-solid fa-circle-info"></i>
										</div>
										<h4 className="phone-alert-title">Règles du Jeu</h4>
										<div className="phone-alert-desc" style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
											<p>• <strong>1 participation</strong> par jour et par personne maximum.</p>
											<p>• Réservé exclusivement aux clients de l&apos;établissement.</p>
											<p>• Présentation de l&apos;avis publié obligatoire pour retirer le lot.</p>
											<p>• Aucun lot ne peut être converti en espèces.</p>
											<h5 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)", marginTop: "0.5rem", width: "100%" }}>
												Probabilités des gains
											</h5>
											<div style={{ width: "100%", maxHeight: "100px", overflowY: "auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "0.4rem 0.6rem" }}>
												<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
													<tbody>
														{appState.prizes.map((p) => (
															<tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
																<td style={{ padding: "3px 0", color: "var(--text-main)", textAlign: "left" }}>
																	{p.icon} {p.name}
																</td>
																<td style={{ padding: "3px 0", color: "var(--primary)", fontWeight: 700, textAlign: "right" }}>
																	{p.weight}%
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
										<button
											className="btn-alert-action"
											style={{ backgroundColor: "var(--primary)" }}
											onClick={() => setOverlayRules(false)}
										>
											Fermer
										</button>
									</div>
								</div>

								{/* Profile Overlay */}
								<div className={`phone-alert-overlay ${overlayProfile ? "active" : ""}`}>
									<div className="phone-alert-card">
										<div className="phone-alert-icon">
											<i className="fa-solid fa-user"></i>
										</div>
										<h4 className="phone-alert-title">Mon Profil</h4>
										<div className="phone-alert-desc" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", width: "100%" }}>
											<div style={{
												width: "50px",
												height: "50px",
												borderRadius: "50%",
												background: "rgba(255, 255, 255, 0.1)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "1.5rem",
												marginBottom: "0.25rem"
											}}>
												👤
											</div>
											<p style={{ fontWeight: 600, color: "var(--text-main)" }}>Client Démo</p>
											<p style={{ fontSize: "0.7rem", color: "var(--text-muted)", wordBreak: "break-all" }}>client.demo@gmail.com</p>
											<div style={{
												marginTop: "0.5rem",
												padding: "4px 8px",
												borderRadius: "9999px",
												backgroundColor: "rgba(52, 199, 89, 0.1)",
												color: "var(--accent-green)",
												fontSize: "0.65rem",
												fontWeight: 600
											}}>
												<i className="fa-solid fa-circle-check" style={{ marginRight: "3px" }}></i> Connecté via Google
											</div>
										</div>
										<button
											className="btn-alert-action"
											style={{ backgroundColor: "var(--primary)" }}
											onClick={() => setOverlayProfile(false)}
										>
											Fermer
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				</div>

				{/* Step navigation footer */}
				{!isHero && (
					<div className="preview-step-footer">
						<button
							className="btn-nav-prev"
							title="Étape précédente"
							onClick={() => goToStep(appState.currentStep - 1)}
						>
							<i className="fa-solid fa-chevron-left"></i>
						</button>
						<div className="preview-footer-center">
							<span className="preview-step-title">{stepTitles[appState.currentStep - 1]}</span>
							<div className="simulator-step-dots">
								{[1, 2, 3, 4].map((step) => (
									<span
										key={step}
										className={`step-dot ${appState.currentStep === step ? "active" : ""}`}
										data-step={step}
										title={`Étape ${step}`}
										onClick={() => goToStep(step)}
									></span>
								))}
							</div>
						</div>
						<button
							className="btn-nav-next"
							title="Étape suivante"
							onClick={() => goToStep(appState.currentStep + 1)}
						>
							<i className="fa-solid fa-chevron-right"></i>
						</button>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="page-landing" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
			<header>
				<div className="header-container">
					<a href="/" className="logo" style={{ textDecoration: "none" }}>
						<div className="logo-text">
							RE<span className="v-accent">V</span>IOZA
						</div>
						<span className="logo-tagline">L&apos;avis qui vous rapporte</span>
					</a>
					<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
						{loggedIn ? (
							<>
								<a
									href="/merchant"
									className="btn-primary"
									style={{
										fontSize: "0.85rem",
										padding: "0.55rem 1.2rem",
										borderRadius: "9999px",
										cursor: "pointer",
										border: "none",
										height: "38px",
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
										fontWeight: 600,
										textDecoration: "none",
										boxShadow: "0 4px 12px var(--primary-glow)",
									}}
								>
									<i className="fa-solid fa-gauge-high"></i> Mon espace gérant
								</a>
								<button
									id="btn-header-logout"
									className="btn-secondary"
									style={{
										fontSize: "0.85rem",
										padding: "0.55rem 1.1rem",
										borderRadius: "9999px",
										cursor: "pointer",
										border: "1px solid var(--border-color)",
										height: "38px",
									}}
									onClick={signOut}
								>
									Se déconnecter
								</button>
							</>
						) : (
							<>
								<button
									id="btn-header-login"
									className="btn-secondary"
									style={{
										fontSize: "0.85rem",
										padding: "0.55rem 1.1rem",
										borderRadius: "9999px",
										cursor: "pointer",
										border: "1px solid var(--border-color)",
										height: "38px",
									}}
									onClick={openLoginModal}
								>
									Je suis déjà client
								</button>
								<button
									id="btn-header-register"
									className="btn-primary"
									style={{
										fontSize: "0.85rem",
										padding: "0.55rem 1.2rem",
										borderRadius: "9999px",
										cursor: "pointer",
										border: "none",
										height: "38px",
										fontWeight: 600,
										boxShadow: "0 4px 12px var(--primary-glow)",
										transition: "transform 0.2s"
									}}
									onClick={openRegisterModal}
								>
									S&apos;inscrire
								</button>
							</>
						)}
					</div>
				</div>
			</header>

			<main style={{ flex: 1, padding: "5rem 2rem" }}>
				<div className="section-inner">
					<div style={{ textAlign: "center", marginBottom: "3rem" }}>
						<h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase" }}>
							Personnalisez votre Roue
						</h1>
						<p style={{ color: "var(--text-muted)", fontSize: "1rem", marginTop: "0.5rem" }}>
							Prévisualisez le rendu avant de vous lancer
						</p>
					</div>

					<div className="demo-layout">
						{/* Colonne gauche : Le smartphone simulator */}
						<div className="demo-right">
							{renderPhoneSimulator(false)}
						</div>

						{/* Colonne droite : Le panneau de personnalisation */}
						<div className="demo-left">
							<section className="panel-card" id="admin-panel" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "20px", padding: "1.75rem" }}>
								<h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<i className="fa-solid fa-sliders" style={{ color: "var(--primary)" }}></i> Configuration
								</h2>
								<p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.4 }}>
									Modifiez les options ci-dessous pour personnaliser le simulateur de smartphone à gauche en temps réel.
								</p>

								{/* Section Apparence */}
								<div className="admin-group" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1.25rem", marginBottom: "1.25rem" }}>
									<div className="admin-group-label" style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
										<i className="fa-solid fa-palette" style={{ color: "var(--primary)" }}></i> Apparence
									</div>
									
									<div className="form-grid" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
										<div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
											<label htmlFor="admin-rest-name" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Nom du commerce</label>
											<input
												type="text"
												id="admin-rest-name"
												value={appState.restaurantName}
												onChange={(e) => {
													updateAndSave({ restaurantName: e.target.value });
													setCookie("admin_rest_name", e.target.value);
												}}
												style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none" }}
											/>
										</div>

										<div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
											<label htmlFor="admin-rest-sub" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Type d&apos;établissement</label>
											<input
												type="text"
												id="admin-rest-sub"
												value={appState.restaurantSub}
												onChange={(e) => {
													updateAndSave({ restaurantSub: e.target.value });
													setCookie("admin_rest_sub", e.target.value);
												}}
												style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none" }}
											/>
										</div>

										<div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
											<label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Couleur principale</label>
											<div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
												<input
													type="color"
													id="admin-theme-color"
													value={appState.primaryColor}
													onChange={(e) => handleColorChange(e.target.value)}
													style={{ width: "42px", height: "42px", padding: "3px", cursor: "pointer", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "var(--bg-input)" }}
												/>
												<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
													<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "monospace" }}>
														{appState.primaryColor.toUpperCase()}
													</span>
													<span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
														Boutons · Roue · Accents
													</span>
												</div>
												<div style={{
													flex: 1,
													height: "28px",
													borderRadius: "6px",
													background: `linear-gradient(90deg, ${appState.primaryColor}, ${appState.primaryColor}99)`,
													border: "1px solid rgba(255,255,255,0.06)",
												}} />
											</div>
										</div>

										<div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
											<label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Image d&apos;accueil</label>
											<div
												className="upload-drop-zone"
												style={{ position: "relative", border: "2px dashed var(--border-color)", borderRadius: "10px", padding: "1rem", textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100px" }}
												onDragOver={(e) => {
													e.preventDefault();
													e.currentTarget.classList.add("drag-over");
												}}
												onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
												onDrop={(e) => {
													e.preventDefault();
													e.currentTarget.classList.remove("drag-over");
													const file = e.dataTransfer.files[0];
													if (file) handleFileUpload(file);
												}}
											>
												{uploadPreview ? (
													<div className="upload-preview-wrap" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
														<img src={uploadPreview} alt="Aperçu" style={{ maxHeight: "70px", borderRadius: "6px", objectFit: "cover" }} />
														<button
															type="button"
															className="upload-remove-btn"
															title="Supprimer l'image"
															onClick={(e) => {
																e.stopPropagation();
																handleRemoveImage();
															}}
															style={{ background: "rgba(229,9,20,0.15)", border: "none", color: "#e50914", width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
														>
															<i className="fa-solid fa-xmark"></i>
														</button>
													</div>
												) : (
													<div className="upload-placeholder" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
														<i className="fa-solid fa-image" style={{ fontSize: "1.25rem", color: "var(--text-muted)", marginBottom: "4px" }}></i>
														<span style={{ fontSize: "0.75rem", color: "var(--text-main)" }}>Cliquez ou déposez votre image ici</span>
														<small style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>.jpg, .jpeg, .png, .webp</small>
													</div>
												)}
												<input
													type="file"
													id="admin-hero-image"
													ref={fileInputRef}
													accept=".jpg,.jpeg,.png,.webp"
													style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) handleFileUpload(file);
													}}
												/>
											</div>
											{uploadStatus && (
												<div
													style={{
														fontSize: "0.75rem",
														marginTop: "0.4rem",
														padding: "5px 8px",
														borderRadius: "6px",
														textAlign: "center",
														background: uploadStatus.isError ? "rgba(229,9,20,0.1)" : "rgba(52,199,89,0.1)",
														color: uploadStatus.isError ? "#e50914" : "#34c759",
														border: uploadStatus.isError ? "1px solid rgba(229,9,20,0.2)" : "1px solid rgba(52,199,89,0.2)",
													}}
												>
													{uploadStatus.msg}
												</div>
											)}
										</div>

										<div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
											<label htmlFor="admin-image-url" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Ou lien URL de l&apos;image</label>
											<input
												type="text"
												id="admin-image-url"
												value={appState.imageUrl}
												onChange={(e) => {
													updateAndSave({ imageUrl: e.target.value });
													setCookie("admin_image_url", e.target.value);
													if (!uploadPreview) {
														setHeroSrc(e.target.value || DEFAULT_HERO_IMAGE);
													}
												}}
												placeholder="https://exemple.com/photo.jpg"
												style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none", fontSize: "0.78rem" }}
											/>
										</div>
									</div>
								</div>

								{/* Section Lots & Récompenses */}
								<div className="admin-group" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1.25rem", marginBottom: "1.25rem" }}>
									<div className="admin-group-label" style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
										<i className="fa-solid fa-gift" style={{ color: "var(--primary)" }}></i> Lots &amp; Récompenses
									</div>

									<div className="prizes-editor">
										<div className="prize-row header-row" style={{ display: "grid", gridTemplateColumns: "1fr 90px 50px", gap: "8px", marginBottom: "8px", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
											<span>Nom du Lot</span>
											<span>Probabilité</span>
											<span style={{ textAlign: "center" }}>Color</span>
										</div>
										<div id="admin-prizes-list" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
											{appState.prizes.map((prize) => (
												<div key={prize.id} className="prize-row" style={{ display: "grid", gridTemplateColumns: "1fr 90px 50px", gap: "8px", alignItems: "center" }}>
													<div className="prize-name-wrapper" style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "2px 6px" }}>
														<input
															type="text"
															value={prize.name}
															onChange={(e) => handlePrizeFieldChange(prize.id, "name", e.target.value)}
															style={{ flex: 1, background: "transparent", border: "none", color: "#fff", outline: "none", fontSize: "0.78rem", padding: "4px 0" }}
														/>
														<button className="btn-icon-delete" onClick={() => handleDeletePrize(prize.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.78rem" }}>
															<i className="fas fa-trash"></i>
														</button>
													</div>
													<div className="prize-probability-wrapper" style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "2px 6px" }}>
														<input
															type="number"
															value={prize.weight}
															min={1}
															max={100}
															onChange={(e) => handlePrizeFieldChange(prize.id, "weight", e.target.value)}
															style={{ width: "100%", background: "transparent", border: "none", color: "#fff", outline: "none", fontSize: "0.78rem", padding: "4px 0", textAlign: "right" }}
														/>
														<span className="percent-symbol" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>%</span>
													</div>
													<div className="prize-color-dot" style={{ position: "relative", width: "28px", height: "28px", borderRadius: "50%", margin: "0 auto", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", backgroundColor: prize.color }}>
														<input
															type="color"
															value={prize.color}
															onChange={(e) => handlePrizeFieldChange(prize.id, "color", e.target.value)}
															style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
														/>
													</div>
												</div>
											))}
										</div>
									</div>

									<div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
										<button className="btn-secondary" onClick={handleAddPrize} style={{ flex: 1, padding: "8px 12px", fontSize: "0.78rem", borderRadius: "8px", cursor: "pointer" }}>
											<i className="fa-solid fa-plus"></i> Ajouter un lot
										</button>
										<button
											className="btn-primary"
											onClick={handleOpenClient}
											style={{ flex: 1, padding: "8px 12px", fontSize: "0.78rem", borderRadius: "8px", cursor: "pointer", border: "none", fontWeight: 600 }}
										>
											<i className="fa-solid fa-mobile-screen-button"></i> Tester la page
										</button>
									</div>

									<div style={{ marginTop: "0.75rem" }}>
										<button
											className="cta-pitch"
											onClick={handleGenerateQr}
											style={{
												width: "100%",
												padding: "0.65rem",
												textTransform: "uppercase",
												fontWeight: 700,
												fontSize: "0.8rem",
												borderRadius: "8px",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "0.4rem",
												border: "none",
												cursor: "pointer"
											}}
										>
											<i className="fa-solid fa-qrcode"></i> Imprimer le QR code
										</button>
									</div>
								</div>

								{/* Section Intégrations (Google Place ID commenté) */}
								<div className="admin-group">
									<div className="admin-group-label" style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem", opacity: 0.6 }}>
										<i className="fa-brands fa-google"></i> Intégrations
									</div>
									
									{/* TODO: Place ID — à afficher uniquement pour les utilisateurs connectés avec un abonnement actif
									<div className="form-group" style={{ marginTop: "1rem" }}>
										<label htmlFor="admin-google-link" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Place ID Google</label>
										<input
											type="text"
											id="admin-google-link"
											value={appState.googleLink}
											onChange={(e) => {
												updateAndSave({ googleLink: e.target.value });
												setCookie("admin_google_link", e.target.value);
											}}
											placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83VY24"
											style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none", fontSize: "0.78rem", marginTop: "4px" }}
										/>
									</div>
									*/}
									
									<div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem", fontStyle: "italic", opacity: 0.7 }}>
										Les options avancées de synchronisation Google Maps seront disponibles dans votre espace client.
									</div>
								</div>
							</section>
						</div>
					</div>
				</div>
			</main>

			{/* Registration/Login Modal */}
			{overlayRegister && (
				<div
					className="phone-alert-overlay active"
					style={{
						zIndex: 1000,
						position: "fixed",
						background: "rgba(0,0,0,0.85)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						inset: 0,
					}}
				>
					<div
						className="phone-alert-card"
						style={{
							maxWidth: "450px",
							width: "90%",
							padding: "2rem",
							background: "var(--bg-card)",
							border: "1px solid var(--border-color)",
							borderRadius: "20px",
							boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
							display: "flex",
							flexDirection: "column",
							gap: "1.25rem",
						}}
					>
						{/* Tabs */}
						<div
							style={{
								display: "flex",
								borderBottom: "1px solid var(--border-color)",
								width: "100%",
								marginBottom: "0.5rem",
							}}
						>
							<button
								style={{
									flex: 1,
									padding: "0.75rem",
									background: "transparent",
									border: "none",
									borderBottom: activeTab === "login" ? "2px solid var(--primary)" : "2px solid transparent",
									color: activeTab === "login" ? "#fff" : "var(--text-muted)",
									fontFamily: "var(--font-display)",
									fontWeight: 700,
									fontSize: "1rem",
									cursor: "pointer",
									outline: "none",
								}}
								onClick={() => setActiveTab("login")}
							>
								Connexion
							</button>
							<button
								style={{
									flex: 1,
									padding: "0.75rem",
									background: "transparent",
									border: "none",
									borderBottom: activeTab === "register" ? "2px solid var(--primary)" : "2px solid transparent",
									color: activeTab === "register" ? "#fff" : "var(--text-muted)",
									fontFamily: "var(--font-display)",
									fontWeight: 700,
									fontSize: "1rem",
									cursor: "pointer",
									outline: "none",
								}}
								onClick={() => setActiveTab("register")}
							>
								Inscription
							</button>
						</div>

						{/* Login Form */}
						{activeTab === "login" && (
							<form
								onSubmit={handleFormLogin}
								style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", textAlign: "left" }}
							>
								<h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800, color: "#fff", textAlign: "left" }}>
									Accéder à votre Espace Gérant
								</h3>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
										Identifiant ou Adresse Email
									</label>
									<input type="text" id="login-email" placeholder="Identifiant ou email" required style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none" }} />
								</div>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
										Mot de passe
									</label>
									<input type="password" id="login-password" placeholder="••••••••" required style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none" }} />
								</div>
								<button type="submit" className="cta-pitch" style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem", border: "none", cursor: "pointer" }}>
									Se Connecter
								</button>
								<div style={{ display: "flex", alignItems: "center", margin: "0.25rem 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
									<div style={{ flex: 1, height: "1px", background: "var(--border-color)" }}></div>
									<span style={{ padding: "0 0.75rem", textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em" }}>ou</span>
									<div style={{ flex: 1, height: "1px", background: "var(--border-color)" }}></div>
								</div>
								<button
									type="button"
									className="btn-secondary"
									style={{
										width: "100%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "0.6rem",
										fontSize: "0.9rem",
										padding: "0.75rem",
										borderRadius: "12px",
										cursor: "pointer",
										border: "1px solid var(--border-color)",
										background: "var(--bg-input)",
										color: "#fff",
										fontWeight: 600,
										transition: "background 0.2s"
									}}
									onClick={handleGoogleLogin}
								>
									<img
										src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
										alt="Google"
										style={{ width: "18px", height: "18px" }}
									/>
									Se connecter avec Google
								</button>
							</form>
						)}

						{/* Register Form */}
						{activeTab === "register" && (
							<form
								onSubmit={handleFormRegister}
								style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", textAlign: "left" }}
							>
								<h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800, color: "#fff", textAlign: "left" }}>
									Créer votre Compte Gérant
								</h3>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Nom du commerce</label>
									<input type="text" id="register-rest-name" placeholder="Ex: Bella Napoli" required style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none" }} />
								</div>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Spécialité / Type</label>
									<input type="text" id="register-rest-sub" placeholder="Ex: Pizzeria" required style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none" }} />
								</div>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Adresse Email</label>
									<input type="email" id="register-email" placeholder="gerant@etablissement.com" required style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none" }} />
								</div>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Mot de passe</label>
									<input type="password" id="register-password" placeholder="Minimum 6 caractères" required minLength={6} style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "#fff", outline: "none" }} />
								</div>
								<button type="submit" className="cta-pitch" style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem", border: "none", cursor: "pointer" }}>
									Créer mon Compte
								</button>
								<div style={{ display: "flex", alignItems: "center", margin: "0.25rem 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
									<div style={{ flex: 1, height: "1px", background: "var(--border-color)" }}></div>
									<span style={{ padding: "0 0.75rem", textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em" }}>ou</span>
									<div style={{ flex: 1, height: "1px", background: "var(--border-color)" }}></div>
								</div>
								<button
									type="button"
									className="btn-secondary"
									style={{
										width: "100%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "0.6rem",
										fontSize: "0.9rem",
										padding: "0.75rem",
										borderRadius: "12px",
										cursor: "pointer",
										border: "1px solid var(--border-color)",
										background: "var(--bg-input)",
										color: "#fff",
										fontWeight: 600,
										transition: "background 0.2s"
									}}
									onClick={handleGoogleLogin}
								>
									<img
										src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
										alt="Google"
										style={{ width: "18px", height: "18px" }}
									/>
									S&apos;inscrire avec Google
								</button>
							</form>
						)}

						<button
							className="btn-secondary"
							onClick={() => setOverlayRegister(false)}
							style={{ width: "100%", fontSize: "0.85rem", padding: "10px 14px", marginBottom: 0, cursor: "pointer" }}
						>
							Fermer
						</button>
					</div>
				</div>
			)}

			<footer>
				<div className="footer-new-container">
					<div className="footer-brand-col">
						<div className="logo">
							<div className="logo-text">
								RE<span className="v-accent">V</span>IOZA
							</div>
						</div>
						<p>
							Une solution innovante et ludique pour multiplier le bouche-à-oreille et grimper sur les
							premières places de Google Maps.
						</p>
					</div>
					<div className="footer-links-col">
						<h4>Navigation</h4>
						<nav className="footer-nav">
							<a href="/">Accueil</a>
							<a href="/pricing">Tarifs</a>
							<a href="/demo">Démo</a>
						</nav>
					</div>
					<div className="footer-legal-col">
						<h4>Légal</h4>
						<nav className="footer-nav">
							<a href="/legal/mentions-legales">Mentions légales</a>
							<a href="/legal/politique-confidentialite">Politique de confidentialité</a>
							<a href="/legal/conditions-utilisation">Conditions d&apos;utilisation</a>
						</nav>
					</div>
				</div>
				<div className="footer-bottom-bar">
					<span>© 2026 Revioza. Tous droits réservés.</span>
				</div>
			</footer>

			{/* GOOGLE AUTH OVERLAY */}
			{overlayGoogleAuth && (
				<div
					className="phone-alert-overlay active"
					style={{
						zIndex: 1001,
						position: "fixed",
						background: "rgba(0,0,0,0.85)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						inset: 0,
					}}
				>
					<div
						className="phone-alert-card"
						style={{
							maxWidth: "450px",
							width: "90%",
							textAlign: "center",
							padding: "2rem",
							background: "var(--bg-card)",
							border: "1px solid var(--border-color)",
							borderRadius: "20px",
							boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "1rem",
						}}
					>
						{googleAuthMode === "loading" && (
							<>
								<div className="google-auth-spinner" style={{ margin: "1rem auto" }}>
									<svg viewBox="0 0 48 48" width="40" height="40">
										<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
										<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
										<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
										<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
									</svg>
								</div>
								<div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Connexion en cours…</div>
							</>
						)}
						<h4 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: 0 }}>
							{googleAuthMode === "loading" ? "Connexion avec Google" : googleAuthMode === "success" ? "Compte vérifié ✓" : "⚠️ Échec de connexion"}
						</h4>
						<p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
							{googleAuthMode === "loading" ? "Authentification en cours…" : googleAuthMode === "success" ? "Vous êtes connecté avec votre compte Google." : "Nous n'avons pas pu valider votre identité Google."}
						</p>
						{googleAuthMode === "success" && googleUser && (
							<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
								<div style={{ width: "56px", height: "56px", borderRadius: "50%", border: "3px solid var(--primary)", overflow: "hidden", margin: "0.5rem auto" }}>
									{googleUser.picture ? (
										<img src={googleUser.picture} alt={googleUser.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
									) : (
										<div style={{ width: "100%", height: "100%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 800 }}>
											{googleUser.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
										</div>
									)}
								</div>
								<p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", margin: 0 }}>{googleUser.name}</p>
								<p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>{googleUser.email}</p>
							</div>
						)}
						{googleAuthMode === "error" && (
							<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
								<p style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: 700, margin: 0, textAlign: "center" }}>{googleAuthError.msg}</p>
								<div style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.4, background: "var(--bg-input)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)" }} dangerouslySetInnerHTML={{ __html: googleAuthError.help }}></div>
								<button
									className="btn-primary"
									onClick={() => {
										setOverlayGoogleAuth(false);
										localStorage.setItem("revioza_merchant_email", "google-user@gmail.com");
										window.location.href = "/merchant";
									}}
									style={{ marginTop: "0.5rem", background: "#34c759", border: "none", cursor: "pointer", padding: "10px", width: "100%" }}
								>
									<i className="fa-solid fa-circle-play"></i> Continuer en mode Démo
								</button>
							</div>
						)}
						<button
							className="btn-secondary"
							onClick={() => setOverlayGoogleAuth(false)}
							style={{ width: "100%", fontSize: "0.85rem", padding: "10px 14px", marginTop: "0.5rem", marginBottom: 0, cursor: "pointer" }}
						>
							Annuler
						</button>
					</div>
				</div>
			)}

		</div>
	);
}
