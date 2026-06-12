import { useEffect, useRef, useState, useCallback } from "react";
import type { Route } from "./+types/home";
import "../styles/style.css";
import {
	type Prize,
	type AppState,
	DEFAULT_PRIZES,
	DEFAULT_HERO_IMAGE,
	IMGBB_API_KEY,
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
	getAllReviozaCookies,
	clearAllReviozaCookies,
} from "../utils/cookies";

export function meta({ }: Route.MetaArgs) {
	return [
		{ title: "Revioza - Roulette Avis Google | Gamification Locale" },
		{
			name: "description",
			content:
				"Augmentez vos avis Google grâce à la gamification. Faites tourner la roulette en échange d'un avis sincère de vos clients.",
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

export default function Home() {
	const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
	const [heroSrc, setHeroSrc] = useState(DEFAULT_HERO_IMAGE);
	const [uploadPreview, setUploadPreview] = useState<string | null>(null);
	const [uploadStatus, setUploadStatus] = useState<{ msg: string; isError: boolean } | null>(null);
	const [overlayQr, setOverlayQr] = useState(false);
	const [overlayRegister, setOverlayRegister] = useState(false);
	const [activeTab, setActiveTab] = useState<"login" | "register">("login");
	const [alertOverlay, setAlertOverlay] = useState(false);
	const [cookieBanner, setCookieBanner] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Load config from localStorage on mount
	useEffect(() => {
		const saved = loadConfigFromStorage(DEFAULT_APP_STATE);
		// Preserve non-serializable fields
		saved.timerInterval = null;
		saved.selectedPrize = null;
		saved.isSpinning = false;
		setAppState(saved);

		// Apply primary color
		document.documentElement.style.setProperty("--primary", saved.primaryColor);

		// Restore hero image
		const savedHero = localStorage.getItem("revioza_custom_hero_image");
		if (savedHero) {
			setHeroSrc(savedHero);
			setUploadPreview(savedHero);
		} else if (saved.imageUrl) {
			setHeroSrc(saved.imageUrl);
		}

		// Cookie restoration banner
		const cookies = getAllReviozaCookies();
		if (Object.keys(cookies).length > 0) {
			setCookieBanner(true);
			setTimeout(() => setCookieBanner(false), 5000);
		}

		// Cookie bindings
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
			if (cookieColor) {
				document.documentElement.style.setProperty("--primary", cookieColor);
			}
		}
	}, []);

	// Scroll Reveal Observer
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
	}, []);

	// Render wheel whenever prizes change
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		renderWheelCanvas(canvas, ctx, appState.prizes, 300);
	}, [appState.prizes]);

	// Timer management
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
			setAppState((prev) => ({ ...prev, rating: val }));
			if (val >= 4) {
				addReviewToHistory(val);
				setAlertOverlay(true);
				const fullLink = getFullGoogleLink(appState.googleLink);
				if (fullLink) window.open(fullLink, "_blank");
			}
		},
		[appState.googleLink]
	);

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
		const targetAngle = 360 - (selectedIndex * anglePerSector + anglePerSector / 2);

		const canvas = canvasRef.current;
		if (canvas) {
			const currentRotation = parseFloat(canvas.style.transform?.replace(/[^0-9.-]/g, "") || "0");
			const spinRotations = 5 * 360;
			const finalRotation = currentRotation + spinRotations + targetAngle;

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
					confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
				});
			}

			setTimeout(() => goToStep(4), 1200);
		}, 4500);
	}, [appState.isSpinning, appState.prizes, goToStep]);

	const handleColorChange = useCallback(
		(color: string) => {
			document.documentElement.style.setProperty("--primary", color);
			updateAndSave({ primaryColor: color });
			setCookie("admin_theme_color", color);
			// Re-render wheel
			const canvas = canvasRef.current;
			if (canvas) {
				const ctx = canvas.getContext("2d");
				if (ctx) renderWheelCanvas(canvas, ctx, appState.prizes, 300);
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
						msg: "⚠️ Hébergement échoué. L'image sera visible localement uniquement.",
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
		// Build client URL
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

	const [placeIdHelp, setPlaceIdHelp] = useState(false);

	const stepTitles = [
		"1. Connexion Client",
		"2. Avis sur Google",
		"3. Lancer de la Roue",
		"4. Félicitations !",
	];

	return (
		<div className="page-landing">
			<header>
				<div className="header-container">
					<div className="logo">
						<div className="logo-text">
							RE<span className="v-accent">V</span>IOZA
						</div>
						<span className="logo-tagline">L&apos;avis qui vous rapporte</span>
					</div>
					<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
						<button
							id="btn-header-register"
							className="btn-secondary"
							style={{
								fontSize: "0.85rem",
								padding: "0.55rem 1.1rem",
								borderRadius: "9999px",
								cursor: "pointer",
								border: "1px solid var(--border-color)",
								height: "38px",
							}}
							onClick={() => setOverlayRegister(true)}
						>
							Espace Gérant
						</button>
						<a href="/pricing" className="cta-pitch" style={{ textDecoration: "none" }}>
							Essayer Revioza
						</a>
					</div>
				</div>
			</header>

			<main>
				{/* Left B2B Pitch & Customizer Panel */}
				<div className="pitch-and-controls">
					<div className="hero-block reveal reveal-slide-up">
						<h1>
							Démultipliez vos <span>Avis Google</span> par le Jeu
						</h1>
						<p style={{ marginBottom: "2rem" }}>
							Transformez vos clients physiques en ambassadeurs locaux. En scannant un QR code unique posé
							sur leur table, vos clients déposent un avis honnête et font tourner la roue pour gagner un
							gain instantané configuré par vos soins.
						</p>
						
						{/* Showcase generated B2B Product Photograph */}
						<div className="hero-illustration-wrap reveal reveal-slide-up delay-100">
							<img 
								src="/assets/dining_table_qr_scan.png" 
								alt="Client scannant le QR code sur une table de restaurant" 
								className="hero-illustration-img"
							/>
							<div className="illustration-glow-badge">
								<i className="fa-solid fa-bolt"></i> Expérience instantanée
							</div>
						</div>
					</div>

					{/* Admin Panel */}
					<section className="panel-card" id="admin-panel">
						<h2>
							<i className="fa-solid fa-sliders"></i> Personnalisation en Temps Réel (Admin)
						</h2>
						<p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
							Configurez le profil et les lots ci-dessous. Les modifications s&apos;appliquent
							instantanément sur le simulateur mobile à droite !
						</p>

						<div className="form-grid">
							<div className="form-group">
								<label htmlFor="admin-rest-name">Nom du Restaurant</label>
								<input
									type="text"
									id="admin-rest-name"
									value={appState.restaurantName}
									onChange={(e) => {
										updateAndSave({ restaurantName: e.target.value });
										setCookie("admin_rest_name", e.target.value);
									}}
								/>
							</div>
							<div className="form-group">
								<label htmlFor="admin-rest-sub">Spécialité / Type</label>
								<input
									type="text"
									id="admin-rest-sub"
									value={appState.restaurantSub}
									onChange={(e) => {
										updateAndSave({ restaurantSub: e.target.value });
										setCookie("admin_rest_sub", e.target.value);
									}}
								/>
							</div>
							<div className="form-group">
								<label htmlFor="admin-theme-color">Couleur du Thème Principal</label>
								<input
									type="color"
									id="admin-theme-color"
									value={appState.primaryColor}
									onChange={(e) => handleColorChange(e.target.value)}
									style={{ height: "42px", padding: "4px", cursor: "pointer" }}
								/>
							</div>
						</div>

						{/* Google Place ID */}
						<div className="form-group" style={{ marginBottom: "1.5rem" }}>
							<label htmlFor="admin-google-link">Place ID Google de votre Commerce</label>
							<input
								type="text"
								id="admin-google-link"
								value={appState.googleLink}
								onChange={(e) => {
									updateAndSave({ googleLink: e.target.value });
									setCookie("admin_google_link", e.target.value);
								}}
								placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83VY24"
								style={{ width: "100%" }}
							/>
							<div
								style={{
									cursor: "pointer",
									color: "var(--primary)",
									fontSize: "0.8rem",
									marginTop: "0.5rem",
									display: "flex",
									alignItems: "center",
									gap: "0.25rem",
									fontWeight: 600,
									userSelect: "none",
								}}
								onClick={() => setPlaceIdHelp(!placeIdHelp)}
							>
								<i className="fa-solid fa-circle-question"></i> Comment trouver mon Place ID ?
							</div>
							{placeIdHelp && (
								<div
									style={{
										background: "var(--bg-input)",
										border: "1px solid var(--border-color)",
										borderRadius: "8px",
										padding: "1rem",
										marginTop: "0.5rem",
										fontSize: "0.8rem",
										lineHeight: 1.5,
										color: "var(--text-muted)",
									}}
								>
									<ol style={{ marginLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
										<li>
											Allez sur l&apos;outil officiel{" "}
											<a
												href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
												target="_blank"
												rel="noreferrer"
												style={{ color: "var(--primary)", textDecoration: "underline" }}
											>
												Google Place ID Finder
											</a>
											.
										</li>
										<li>Recherchez le nom de votre commerce sur la carte.</li>
										<li>
											Copiez le code qui s&apos;affiche dans la bulle d&apos;info (ex :{" "}
											<code>ChIJN1t_tDeuEmsRUsoyG83VY24</code>).
										</li>
										<li>Collez ce code dans la case ci-dessus !</li>
									</ol>
								</div>
							)}
						</div>

						{/* Image Upload */}
						<div className="form-group upload-group">
							<label htmlFor="admin-hero-image">Image d&apos;Accueil (logo ou photo du commerce)</label>
							<div
								className="upload-drop-zone"
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
									<div className="upload-preview-wrap" style={{ display: "flex" }}>
										<img src={uploadPreview} alt="Aperçu" style={{ maxHeight: "90px", borderRadius: "8px", objectFit: "cover" }} />
										<button
											type="button"
											className="upload-remove-btn"
											title="Supprimer l'image"
											onClick={(e) => {
												e.stopPropagation();
												handleRemoveImage();
											}}
										>
											<i className="fa-solid fa-xmark"></i>
										</button>
									</div>
								) : (
									<div className="upload-placeholder">
										<i className="fa-solid fa-image"></i>
										<span>Cliquez ou déposez votre image ici</span>
										<small>.jpg, .jpeg, .png, .webp</small>
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
										fontSize: "0.78rem",
										marginTop: "0.4rem",
										padding: "6px 10px",
										borderRadius: "8px",
										textAlign: "center",
										background: uploadStatus.isError ? "rgba(229,9,20,0.12)" : "rgba(52,199,89,0.12)",
										color: uploadStatus.isError ? "#e50914" : "#34c759",
										border: uploadStatus.isError ? "1px solid rgba(229,9,20,0.3)" : "1px solid rgba(52,199,89,0.3)",
									}}
								>
									{uploadStatus.msg}
								</div>
							)}
						</div>

						<div className="form-group" style={{ marginTop: "-0.5rem", marginBottom: "1.5rem" }}>
							<label htmlFor="admin-image-url">Ou lien URL de l&apos;image (pour QR Code mobile)</label>
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
								style={{ width: "100%" }}
							/>
						</div>

						<div className="form-group" style={{ marginBottom: "1rem" }}>
							<label>Configuration des Lots de la Roue</label>
						</div>

						{/* Prizes Editor */}
						<div className="prizes-editor">
							<div className="prize-row header-row">
								<span>Nom du Lot</span>
								<span>Probabilité</span>
								<span style={{ textAlign: "center" }}>Couleur</span>
							</div>
							<div id="admin-prizes-list">
								{appState.prizes.map((prize) => (
									<div key={prize.id} className="prize-row">
										<div className="prize-name-wrapper">
											<input
												type="text"
												value={prize.name}
												onChange={(e) => handlePrizeFieldChange(prize.id, "name", e.target.value)}
											/>
											<button className="btn-icon-delete" onClick={() => handleDeletePrize(prize.id)}>
												<i className="fas fa-trash"></i>
											</button>
										</div>
										<div className="prize-probability-wrapper">
											<input
												type="number"
												value={prize.weight}
												min={1}
												max={100}
												onChange={(e) => handlePrizeFieldChange(prize.id, "weight", e.target.value)}
											/>
											<span className="percent-symbol">%</span>
										</div>
										<div className="prize-color-dot" style={{ backgroundColor: prize.color }}>
											<input
												type="color"
												value={prize.color}
												onChange={(e) => handlePrizeFieldChange(prize.id, "color", e.target.value)}
											/>
										</div>
									</div>
								))}
							</div>
						</div>

						<div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
							<button className="btn-secondary" onClick={handleAddPrize} style={{ flex: 1, marginBottom: 0 }}>
								<i className="fa-solid fa-plus"></i> Ajouter un lot
							</button>
							<button
								className="btn-primary"
								onClick={handleOpenClient}
								style={{ flex: 1, fontSize: "0.85rem", padding: "10px 14px", marginTop: 0, boxShadow: "none" }}
							>
								<i className="fa-solid fa-mobile-screen-button"></i> Tester la page Client
							</button>
						</div>

						<div style={{ marginTop: "1rem" }}>
							<button
								className="cta-pitch"
								onClick={handleGenerateQr}
								style={{
									width: "100%",
									padding: "0.75rem 1.5rem",
									textTransform: "uppercase",
									fontWeight: 700,
									fontSize: "0.9rem",
									borderRadius: "12px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "0.5rem",
								}}
							>
								<i className="fa-solid fa-qrcode"></i> Générer mon QR code Unique
							</button>
						</div>
					</section>

					{/* Interactive Storytelling Timeline */}
					<section className="timeline-section reveal reveal-slide-up">
						<h2 className="timeline-heading">
							Comment fonctionne <span>Revioza</span> ?
						</h2>
						<p className="timeline-subheading">
							Un parcours fluide en 4 étapes simples pour multiplier par 10 vos avis clients.
						</p>

						<div className="timeline-container">
							{[
								{
									stepNum: "1",
									icon: "fa-qrcode",
									title: "Scan du QR Code",
									desc: "Le client scanne le QR code unique présent sur sa table pour lancer l'expérience sur son mobile.",
								},
								{
									stepNum: "2",
									icon: "fa-shield-halved",
									title: "Connexion Google",
									desc: "Une authentification simple et sécurisée valide l'identité du client et évite les participations multiples.",
								},
								{
									stepNum: "3",
									icon: "fa-star",
									title: "Avis Honnête",
									desc: "Le client laisse sa note. Si elle est positive (4-5★), il est redirigé vers Google. Si elle est basse (1-3★), il laisse un retour privé.",
								},
								{
									stepNum: "4",
									icon: "fa-trophy",
									title: "Tirage & Gain",
									desc: "La roue tourne ! Le client gagne un lot (configuré par vos soins) à consommer sur place dans les 2 heures.",
								},
							].map((item, idx) => (
								<div className="timeline-item" key={idx}>
									<div className="timeline-badge">
										<i className={`fa-solid ${item.icon}`}></i>
									</div>
									<div className="timeline-content">
										<span className="step-tag">Étape {item.stepNum}</span>
										<h3>{item.title}</h3>
										<p>{item.desc}</p>
									</div>
								</div>
							))}
						</div>
					</section>

					{/* Features Grid */}
					<div className="features-grid reveal reveal-slide-up">
						<div className="feature-card delay-100">
							<div className="feature-icon">
								<i className="fa-solid fa-shield-halved"></i>
							</div>
							<h3>Anti-Triche Avancé</h3>
							<p>
								Connexion Google obligatoire limitant le jeu à 1 participation par personne et par jour.
								Tickets de gain éphémères.
							</p>
						</div>
						<div className="feature-card delay-200">
							<div className="feature-icon">
								<i className="fa-solid fa-qrcode"></i>
							</div>
							<h3>Prêt à Imprimer</h3>
							<p>
								Téléchargez et imprimez votre kit de table de QR codes associés directement à votre
								compte d&apos;établissement.
							</p>
						</div>
						<div className="feature-card delay-300">
							<div className="feature-icon">
								<i className="fa-solid fa-chart-line"></i>
							</div>
							<h3>Statistiques Avancées</h3>
							<p>
								Suivez le nombre de scans, de clics Google, les lots distribués et l&apos;évolution
								globale de votre note moyenne.
							</p>
						</div>
						<div className="feature-card delay-400">
							<div className="feature-icon">
								<i className="fa-solid fa-unlock"></i>
							</div>
							<h3>Résiliable à tout moment</h3>
							<p>
								Aucun engagement de durée. Vous pouvez suspendre ou résilier votre abonnement en un
								clic, en toute liberté.
							</p>
						</div>
					</div>
				</div>

				{/* Right Mobile Simulator Column */}
				<div className="phone-simulator-wrapper reveal reveal-fade-in delay-200">
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
							{/* STEP 1: WELCOME */}
							<div className={`app-screen ${appState.currentStep === 1 ? "active" : ""}`} id="screen-1">
								<div className="app-screen-content">
									<div className="hero-pizza-image">
										<img id="hero-simulator-img" src={heroSrc} alt="Pizza" />
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
									<span className="google-legal-notice">Connexion sécurisée via OAuth Google</span>
								</div>
							</div>

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
											onClick={() => {
												setAlertOverlay(true);
												const fullLink = getFullGoogleLink(appState.googleLink);
												if (fullLink) window.open(fullLink, "_blank");
											}}
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
												src="/assets/logo_icon.jpg"
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
								<div className="nav-item active" onClick={() => goToStep(3)}>
									<i className="fa-solid fa-house"></i>
									Accueil
								</div>
								<div
									className="nav-item"
									onClick={() =>
										alert(
											"Règles du jeu : 1 participation par jour maximum, réservée aux clients de l'établissement."
										)
									}
								>
									<i className="fa-solid fa-circle-info"></i>
									Règles
								</div>
								<div className="nav-item" onClick={() => alert("Profil : Connecté avec Google.")}>
									<i className="fa-solid fa-user"></i>
									Profil
								</div>
							</div>
						</div>

						{/* Alert Overlay */}
						<div
							className={`phone-alert-overlay ${alertOverlay ? "active" : ""}`}
							id="phone-alert-overlay"
						>
							<div className="phone-alert-card">
								<div className="phone-alert-icon">
									<i className="fa-solid fa-up-right-from-square"></i>
								</div>
								<h4 className="phone-alert-title">Redirection simulée</h4>
								<p className="phone-alert-desc">
									Le client est redirigé vers l&apos;interface Google Review du restaurant.
									<br />
									<br />
									<em>
										(Dans la démo, cliquez sur le bouton ci-dessous pour revenir après avoir validé
										votre avis)
									</em>
								</p>
								<button
									className="btn-alert-action"
									onClick={() => {
										setAlertOverlay(false);
										goToStep(3);
									}}
								>
									J&apos;ai déposé mon avis
								</button>
							</div>
						</div>
					</div>

					{/* Preview Step Footer */}
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
				</div>
			</main>

			{/* Contact CTA Section */}
			<section className="cta-contact-section">
				<div className="cta-contact-container">
					<h2>Êtes-vous intéressé ?</h2>
					<p>
						Découvrez comment Revioza peut vous aider à multiplier vos avis clients et booster votre
						visibilité locale.
					</p>
					<a href="mailto:contact@revioza.com" className="btn-primary contact-btn">
						Contactez-nous <i className="fa-solid fa-arrow-right"></i>
					</a>
				</div>
			</section>

			<footer>
				<div className="footer-container">
					<div className="footer-branding">
						<div className="logo">
							<div className="logo-text">
								RE<span className="v-accent">V</span>IOZA
							</div>
						</div>
						<p>
							Une solution innovante et ludique pour multiplier le bouche-à-oreille et grimper sur les
							premières places de Google Maps. Conçu spécifiquement pour les pizzerias, tacos, burgers et
							commerces de proximité.
						</p>
					</div>
					<div className="footer-stats">
						<div className="stat-item">
							<div className="stat-icon">
								<i className="fa-solid fa-lock"></i>
							</div>
							<div className="stat-label">100% Sécurisé</div>
							<div className="stat-desc">Connexion Google OAuth robuste</div>
						</div>
						<div className="stat-item">
							<div className="stat-icon">
								<i className="fa-solid fa-user-check"></i>
							</div>
							<div className="stat-label">1 Joueur/Jour</div>
							<div className="stat-desc">Garantie anti-triche stricte</div>
						</div>
						<div className="stat-item">
							<div className="stat-icon">
								<i className="fa-solid fa-hourglass-half"></i>
							</div>
							<div className="stat-label">Ticket Limité</div>
							<div className="stat-desc">Compte à rebours dynamique de 2h</div>
						</div>
						<div className="stat-item">
							<div className="stat-icon">
								<i className="fa-solid fa-certificate"></i>
							</div>
							<div className="stat-label">Authentique</div>
							<div className="stat-desc">Avis sincères des clients physiques</div>
						</div>
					</div>
				</div>
			</footer>

			{/* QR Code Modal */}
			{overlayQr && (
				<div
					className="phone-alert-overlay"
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
							maxWidth: "400px",
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
						<h3
							style={{
								fontFamily: "var(--font-display)",
								fontSize: "1.4rem",
								fontWeight: 800,
								color: "var(--text-main)",
							}}
						>
							Votre QR Code Unique
						</h3>
						<p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
							Scannez ce QR Code avec votre téléphone portable pour tester la roue de loterie personnalisée
							en conditions réelles.
						</p>
						<div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
							<button
								className="btn-primary"
								onClick={() => window.print()}
								style={{ flex: 1, fontSize: "0.85rem", padding: "10px 14px", marginTop: 0, boxShadow: "none" }}
							>
								<i className="fa-solid fa-print"></i> Imprimer
							</button>
							<button
								className="btn-secondary"
								onClick={() => setOverlayQr(false)}
								style={{ flex: 1, fontSize: "0.85rem", padding: "10px 14px", marginBottom: 0 }}
							>
								Fermer
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Registration/Login Modal */}
			{overlayRegister && (
				<div
					className="phone-alert-overlay"
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
								<h3
									style={{
										fontFamily: "var(--font-display)",
										fontSize: "1.25rem",
										fontWeight: 800,
										color: "#fff",
										textAlign: "left",
									}}
								>
									Accéder à votre Espace Gérant
								</h3>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label
										style={{
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--text-muted)",
											textTransform: "uppercase",
											marginBottom: "4px",
											display: "block",
										}}
									>
										Adresse Email
									</label>
									<input
										type="email"
										id="login-email"
										placeholder="contact@etablissement.com"
										required
										style={{
											width: "100%",
											padding: "0.75rem",
											borderRadius: "10px",
											background: "var(--bg-input)",
											border: "1px solid var(--border-color)",
											color: "#fff",
											outline: "none",
										}}
									/>
								</div>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label
										style={{
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--text-muted)",
											textTransform: "uppercase",
											marginBottom: "4px",
											display: "block",
										}}
									>
										Mot de passe
									</label>
									<input
										type="password"
										id="login-password"
										placeholder="••••••••"
										required
										style={{
											width: "100%",
											padding: "0.75rem",
											borderRadius: "10px",
											background: "var(--bg-input)",
											border: "1px solid var(--border-color)",
											color: "#fff",
											outline: "none",
										}}
									/>
								</div>
								<button
									type="submit"
									className="cta-pitch"
									style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem", border: "none", cursor: "pointer" }}
								>
									Se Connecter
								</button>
							</form>
						)}

						{/* Register Form */}
						{activeTab === "register" && (
							<form
								onSubmit={handleFormRegister}
								style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", textAlign: "left" }}
							>
								<h3
									style={{
										fontFamily: "var(--font-display)",
										fontSize: "1.25rem",
										fontWeight: 800,
										color: "#fff",
										textAlign: "left",
									}}
								>
									Créer votre Compte Gérant
								</h3>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label
										style={{
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--text-muted)",
											textTransform: "uppercase",
											marginBottom: "4px",
											display: "block",
										}}
									>
										Nom du commerce
									</label>
									<input
										type="text"
										id="register-rest-name"
										placeholder="Ex: Bella Napoli"
										required
										style={{
											width: "100%",
											padding: "0.75rem",
											borderRadius: "10px",
											background: "var(--bg-input)",
											border: "1px solid var(--border-color)",
											color: "#fff",
											outline: "none",
										}}
									/>
								</div>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label
										style={{
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--text-muted)",
											textTransform: "uppercase",
											marginBottom: "4px",
											display: "block",
										}}
									>
										Spécialité / Type
									</label>
									<input
										type="text"
										id="register-rest-sub"
										placeholder="Ex: Pizzeria"
										required
										style={{
											width: "100%",
											padding: "0.75rem",
											borderRadius: "10px",
											background: "var(--bg-input)",
											border: "1px solid var(--border-color)",
											color: "#fff",
											outline: "none",
										}}
									/>
								</div>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label
										style={{
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--text-muted)",
											textTransform: "uppercase",
											marginBottom: "4px",
											display: "block",
										}}
									>
										Adresse Email
									</label>
									<input
										type="email"
										id="register-email"
										placeholder="gerant@etablissement.com"
										required
										style={{
											width: "100%",
											padding: "0.75rem",
											borderRadius: "10px",
											background: "var(--bg-input)",
											border: "1px solid var(--border-color)",
											color: "#fff",
											outline: "none",
										}}
									/>
								</div>
								<div className="form-group" style={{ textAlign: "left" }}>
									<label
										style={{
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--text-muted)",
											textTransform: "uppercase",
											marginBottom: "4px",
											display: "block",
										}}
									>
										Mot de passe
									</label>
									<input
										type="password"
										id="register-password"
										placeholder="Minimum 6 caractères"
										required
										minLength={6}
										style={{
											width: "100%",
											padding: "0.75rem",
											borderRadius: "10px",
											background: "var(--bg-input)",
											border: "1px solid var(--border-color)",
											color: "#fff",
											outline: "none",
										}}
									/>
								</div>
								<button
									type="submit"
									className="cta-pitch"
									style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem", border: "none", cursor: "pointer" }}
								>
									Créer mon Compte
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

			{/* Cookie Banner */}
			{cookieBanner && (
				<div
					style={{
						position: "fixed",
						bottom: "1.25rem",
						left: "50%",
						transform: "translateX(-50%)",
						background: "linear-gradient(135deg, #1a1a22 0%, #23232f 100%)",
						color: "#f5f5f7",
						border: "1px solid rgba(229,9,20,0.35)",
						borderRadius: "50px",
						padding: "0.6rem 1.1rem",
						display: "flex",
						alignItems: "center",
						gap: "0.6rem",
						fontSize: "0.78rem",
						fontFamily: "var(--font-body, 'Outfit', sans-serif)",
						boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
						zIndex: 9999,
						whiteSpace: "nowrap",
						maxWidth: "90vw",
					}}
				>
					<i className="fa-solid fa-floppy-disk" style={{ color: "#e50914" }}></i>
					<span>Vos informations ont été restaurées depuis votre dernière session.</span>
					<button
						onClick={() => {
							clearAllReviozaCookies();
							setCookieBanner(false);
						}}
						title="Effacer les données sauvegardées"
						style={{
							background: "none",
							border: "none",
							color: "#8e8e93",
							cursor: "pointer",
							padding: 0,
							fontSize: "0.85rem",
							lineHeight: 1,
						}}
					>
						<i className="fa-solid fa-xmark"></i>
					</button>
				</div>
			)}
		</div>
	);
}
