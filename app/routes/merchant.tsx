import { useEffect, useRef, useState, useCallback } from "react";
import type { Route } from "./+types/merchant";
import "../styles/merchant.css";
import {
	type Prize,
	type MerchantState,
	DEFAULT_PRIZES,
	adjustWeights,
	handlePrizeDeleted,
} from "../utils/state";
import { getCookie, setCookie } from "../utils/cookies";
import { supabase, uploadWheelImage } from "../utils/supabase-client";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Revioza — Espace Gérant" },
		{
			name: "description",
			content:
				"Gérez votre roue de loterie, personnalisez vos gains, suivez vos statistiques et consultez les avis clients.",
		},
	];
}

interface PrivateFeedback {
	id: string; // id du scan (uuid)
	name: string;
	email: string;
	rating: number;
	date: string;
	text: string;
}

interface FeedbackRow {
	id: string;
	scanned_at: string;
	rating: number | null;
	google_name: string | null;
	google_email: string | null;
	feedback_text: string | null;
}

// Correspondance code forfait (colonne merchants.plan) → libellé affiché.
// Ajoute ici tes futurs forfaits au fur et à mesure.
const PLAN_LABELS: Record<string, string> = {
	pro: "Plan Pro",
	starter: "Starter",
	business: "Business",
	franchise: "Franchise",
};

function formatFeedbackDate(iso: string): string {
	const d = new Date(iso);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Statistiques réelles, calculées depuis la table `scans` ──────────────
interface ScanRow {
	scanned_at: string;
	rating: number | null;
	played: boolean | null;
}

interface PeriodStats {
	reviews: number; // avis Google laissés (note ≥ 4)
	clients: number; // participations (roue tournée)
	scans: number; // nombre total de scans
	labels: string[];
	dataset: number[]; // avis générés par segment de temps
}

type StatsData = { week: PeriodStats; month: PeriodStats; year: PeriodStats };

const WEEK_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
const YEAR_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function emptyStats(): StatsData {
	return {
		week: { reviews: 0, clients: 0, scans: 0, labels: [...WEEK_LABELS], dataset: new Array(7).fill(0) },
		month: { reviews: 0, clients: 0, scans: 0, labels: [...MONTH_LABELS], dataset: new Array(4).fill(0) },
		year: { reviews: 0, clients: 0, scans: 0, labels: [...YEAR_LABELS], dataset: new Array(12).fill(0) },
	};
}

function computeStats(rows: ScanRow[]): StatsData {
	const stats = emptyStats();
	const now = new Date();
	rows.forEach((r) => {
		const d = new Date(r.scanned_at);
		if (isNaN(d.getTime())) return;
		const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
		const isReview = (r.rating ?? 0) >= 4;
		const isPlayed = !!r.played;

		if (diffDays >= 0 && diffDays < 7) {
			const di = (d.getDay() + 6) % 7;
			stats.week.scans++;
			if (isPlayed) stats.week.clients++;
			if (isReview) { stats.week.reviews++; stats.week.dataset[di]++; }
		}
		if (diffDays >= 0 && diffDays < 30) {
			const wi = Math.min(3, Math.floor((d.getDate() - 1) / 7));
			stats.month.scans++;
			if (isPlayed) stats.month.clients++;
			if (isReview) { stats.month.reviews++; stats.month.dataset[wi]++; }
		}
		if (d.getFullYear() === now.getFullYear()) {
			const mi = d.getMonth();
			stats.year.scans++;
			if (isPlayed) stats.year.clients++;
			if (isReview) { stats.year.reviews++; stats.year.dataset[mi]++; }
		}
	});
	return stats;
}

export default function Merchant() {
	const [activeTab, setActiveTab] = useState<"stats" | "config" | "reviews">("stats");
	const [merchantState, setMerchantState] = useState<MerchantState>({
		restaurantName: "Bella Napoli",
		restaurantSub: "Pizzeria",
		primaryColor: "#e50914",
		googleLink: "ChIJN1t_tDeuEmsRUsoyG83VY24",
		imageUrl: "",
		prizes: [...DEFAULT_PRIZES],
	});
	const [feedbacks, setFeedbacks] = useState<PrivateFeedback[]>([]);
	const [currentPeriod, setCurrentPeriod] = useState<"week" | "month" | "year">("week");
	const [averageBasket, setAverageBasket] = useState(25);
	const [placeIdHelp, setPlaceIdHelp] = useState(false);
	const [colorHexLabel, setColorHexLabel] = useState("#e50914");
	const [statsData, setStatsData] = useState<StatsData>(() => emptyStats());
	const [statsLoading, setStatsLoading] = useState(true);
	const [plan, setPlan] = useState("pro");

	const [imageUploadStatus, setImageUploadStatus] = useState<{ msg: string; isError: boolean } | null>(null);

	const chartRef = useRef<HTMLCanvasElement>(null);
	const chartInstanceRef = useRef<unknown>(null);
	const userIdRef = useRef<string | null>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);

	// Load config from localStorage
	useEffect(() => {
		supabase.auth.getSession().then(async ({ data: { session } }) => {
			if (!session) {
				window.location.href = "/demo?login=required";
				return;
			}
			userIdRef.current = session.user.id;

			// Statistiques réelles : tous les scans de cet établissement.
			supabase
				.from("scans")
				.select("scanned_at, rating, played")
				.eq("user_id", session.user.id)
				.then(({ data: scanRows, error: scanErr }) => {
					if (scanErr) {
						console.error("Erreur chargement stats Supabase", scanErr);
					} else if (scanRows) {
						setStatsData(computeStats(scanRows as ScanRow[]));
					}
					setStatsLoading(false);
				});

			// Retours privés réels (note < 4 avec texte, non archivés).
			supabase
				.from("scans")
				.select("id, scanned_at, rating, google_name, google_email, feedback_text")
				.eq("user_id", session.user.id)
				.lt("rating", 4)
				.not("feedback_text", "is", null)
				.eq("feedback_archived", false)
				.order("scanned_at", { ascending: false })
				.then(({ data: fbRows, error: fbErr }) => {
					if (fbErr) {
						console.error("Erreur chargement retours privés Supabase", fbErr);
						return;
					}
					if (fbRows) {
						setFeedbacks(
							(fbRows as FeedbackRow[]).map((r) => ({
								id: r.id,
								name: r.google_name || "Client anonyme",
								email: r.google_email || "",
								rating: r.rating ?? 0,
								date: formatFeedbackDate(r.scanned_at),
								text: r.feedback_text || "",
							}))
						);
					}
				});

			const { data, error } = await supabase
				.from("merchants")
				.select("*")
				.eq("user_id", session.user.id)
				.maybeSingle();

			if (error) {
				console.error("Erreur chargement config Supabase", error);
				return;
			}
			if (data) {
				if (data.plan) setPlan(data.plan);
				const loaded: MerchantState = {
					restaurantName: data.restaurant_name,
					restaurantSub: data.restaurant_sub,
					primaryColor: data.primary_color,
					googleLink: data.google_link,
					imageUrl: data.image_url,
					prizes: Array.isArray(data.prizes) && data.prizes.length ? data.prizes : [...DEFAULT_PRIZES],
				};
				setMerchantState(loaded);
				setColorHexLabel(loaded.primaryColor);
				document.documentElement.style.setProperty("--primary", loaded.primaryColor);
				localStorage.setItem("revioza_merchant_config", JSON.stringify(loaded));
			}
		});

		const saved = localStorage.getItem("revioza_merchant_config");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				setMerchantState((prev) => ({ ...prev, ...parsed }));
				if (parsed.primaryColor) {
					setColorHexLabel(parsed.primaryColor);
					document.documentElement.style.setProperty("--primary", parsed.primaryColor);
				}
			} catch (e) {
				console.error("Error loading config", e);
			}
		}


		// Apply primary color
		document.documentElement.style.setProperty("--primary", merchantState.primaryColor);

		// Cookie bindings
		const cookieName = getCookie("merchant_rest_name");
		const cookieSub = getCookie("merchant_rest_sub");
		const cookieGoogle = getCookie("merchant_google_link");
		const cookieColor = getCookie("merchant_theme_color");
		if (cookieName) setMerchantState((prev) => ({ ...prev, restaurantName: cookieName }));
		if (cookieSub) setMerchantState((prev) => ({ ...prev, restaurantSub: cookieSub }));
		if (cookieGoogle) setMerchantState((prev) => ({ ...prev, googleLink: cookieGoogle }));
		if (cookieColor) {
			setMerchantState((prev) => ({ ...prev, primaryColor: cookieColor }));
			setColorHexLabel(cookieColor);
			document.documentElement.style.setProperty("--primary", cookieColor);
		}
	}, []);

	const saveConfig = useCallback((state: MerchantState) => {
		localStorage.setItem("revioza_merchant_config", JSON.stringify(state));
		if (state.imageUrl) {
			localStorage.setItem("revioza_custom_hero_image", state.imageUrl);
		} else {
			localStorage.removeItem("revioza_custom_hero_image");
		}
		document.documentElement.style.setProperty("--primary", state.primaryColor);

		// Sync vers Supabase (debounce pour éviter une requête à chaque frappe)
		if (!userIdRef.current) return;
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
		saveTimeoutRef.current = setTimeout(() => {
			supabase
				.from("merchants")
				.upsert(
					{
						user_id: userIdRef.current,
						restaurant_name: state.restaurantName,
						restaurant_sub: state.restaurantSub,
						primary_color: state.primaryColor,
						google_link: state.googleLink,
						image_url: state.imageUrl,
						prizes: state.prizes,
						updated_at: new Date().toISOString(),
					},
					{ onConflict: "user_id" }
				)
				.then(({ error }) => {
					if (error) console.error("Erreur sauvegarde config Supabase", error);
				});
		}, 800);
	}, []);

	// Upload de l'image d'accueil vers Supabase Storage (hébergement public).
	// L'URL publique est enregistrée dans merchants.image_url et lue par /play.
	const handleImageUpload = useCallback(
		async (file: File) => {
			if (!file || !file.type.startsWith("image/")) return;
			setImageUploadStatus({ msg: "⏳ Hébergement de l'image…", isError: false });
			try {
				const publicUrl = await uploadWheelImage(file);
				setMerchantState((prev) => {
					const next = { ...prev, imageUrl: publicUrl };
					saveConfig(next);
					return next;
				});
				setImageUploadStatus({ msg: "✓ Image hébergée — visible par vos clients !", isError: false });
				setTimeout(() => setImageUploadStatus(null), 5000);
			} catch (err) {
				console.error("Upload Supabase Storage échoué:", err);
				setImageUploadStatus({ msg: "❌ Échec de l'hébergement. Réessayez.", isError: true });
			}
		},
		[saveConfig]
	);

	const handleRemoveImage = useCallback(() => {
		setMerchantState((prev) => {
			const next = { ...prev, imageUrl: "" };
			saveConfig(next);
			return next;
		});
		setImageUploadStatus(null);
		if (imageInputRef.current) imageInputRef.current.value = "";
	}, [saveConfig]);

	// Render chart
	useEffect(() => {
		if (activeTab !== "stats") return;
		const canvas = chartRef.current;
		if (!canvas) return;

		const renderChart = async () => {
			const ChartModule = await import("chart.js/auto");
			const Chart = ChartModule.default;

			if (chartInstanceRef.current) {
				(chartInstanceRef.current as { destroy: () => void }).destroy();
			}

			const pData = statsData[currentPeriod];

			chartInstanceRef.current = new Chart(canvas, {
				type: "line",
				data: {
					labels: pData.labels,
					datasets: [
						{
							label: "Avis générés",
							data: pData.dataset,
							borderColor: merchantState.primaryColor,
							backgroundColor: "rgba(229, 9, 20, 0.1)",
							borderWidth: 3,
							tension: 0.3,
							fill: true,
							pointBackgroundColor: merchantState.primaryColor,
							pointHoverRadius: 7,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: { legend: { display: false } },
					scales: {
						y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#8e8e93", font: { size: 9 } } },
						x: { grid: { display: false }, ticks: { color: "#8e8e93", font: { size: 9 } } },
					},
				},
			});
		};

		// Small delay to ensure canvas dimensions are correct
		const timer = setTimeout(renderChart, 50);
		return () => clearTimeout(timer);
	}, [activeTab, currentPeriod, merchantState.primaryColor, statsData]);

	const currentStats = statsData[currentPeriod];
	const earnings = currentStats.clients * averageBasket;

	const handleArchiveFeedback = useCallback(
		(reviewId: string) => {
			// Retrait optimiste de la liste + archivage en base.
			setFeedbacks((prev) => prev.filter((r) => r.id !== reviewId));
			supabase.rpc("archive_feedback", { p_scan: reviewId }).then(({ error }) => {
				if (error) console.error("Erreur archivage retour Supabase", error);
			});
		},
		[]
	);

	const handleAddPrize = useCallback(() => {
		setMerchantState((prev) => {
			const nextId = prev.prizes.length > 0 ? Math.max(...prev.prizes.map((p) => p.id)) + 1 : 1;
			const colors = ["#111115", prev.primaryColor, "#22222a", "#34c759", "#4285f4"];
			const nextColor = colors[prev.prizes.length % colors.length];
			const newPrizes = [
				...prev.prizes,
				{ id: nextId, name: "NOUVEAU LOT", weight: 10, color: nextColor, textStyle: "#ffffff", icon: "🎁" },
			];
			adjustWeights(newPrizes, nextId, 10);
			const next = { ...prev, prizes: newPrizes };
			saveConfig(next);
			return next;
		});
	}, [saveConfig]);

	const handleDeletePrize = useCallback(
		(prizeId: number) => {
			setMerchantState((prev) => {
				if (prev.prizes.length <= 2) {
					alert("La roue doit comporter au moins 2 lots !");
					return prev;
				}
				const newPrizes = prev.prizes.filter((p) => p.id !== prizeId);
				handlePrizeDeleted(newPrizes);
				const next = { ...prev, prizes: newPrizes };
				saveConfig(next);
				return next;
			});
		},
		[saveConfig]
	);

	const handlePrizeName = useCallback(
		(id: number, value: string) => {
			setMerchantState((prev) => {
				const newPrizes = prev.prizes.map((p) => (p.id === id ? { ...p, name: value.toUpperCase() } : p));
				const next = { ...prev, prizes: newPrizes };
				saveConfig(next);
				return next;
			});
		},
		[saveConfig]
	);

	const handlePrizeWeight = useCallback(
		(id: number, value: string) => {
			setMerchantState((prev) => {
				const newPrizes = [...prev.prizes];
				adjustWeights(newPrizes, id, parseInt(value) || 1);
				const next = { ...prev, prizes: newPrizes };
				saveConfig(next);
				return next;
			});
		},
		[saveConfig]
	);

	const handlePrizeColor = useCallback(
		(id: number, value: string) => {
			setMerchantState((prev) => {
				const newPrizes = prev.prizes.map((p) => (p.id === id ? { ...p, color: value } : p));
				const next = { ...prev, prizes: newPrizes };
				saveConfig(next);
				return next;
			});
		},
		[saveConfig]
	);

	const getStarsHtml = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => (
			<i key={i} className={`fa-solid fa-star ${i >= rating ? "empty" : ""}`}></i>
		));
	};

	return (
		<div className="page-merchant">
			<div className="app-header">
				<a href="/" className="app-header-spacer header-home-link" title="Retour à l'accueil">
					<i className="fa-solid fa-house"></i>
				</a>
				<div className="app-header-center">
					<div className="header-title">Espace Gérant</div>
					<div className="restaurant-name-bind header-rest-name">{merchantState.restaurantName}</div>
				</div>
				<div className="app-header-right" style={{ display: "flex", gap: "10px", alignItems: "center", width: "auto" }}>
					<a href="/pricing" className="plan-badge" title="Voir mon forfait actuel">
						<i className="fa-solid fa-crown"></i>
						<span className="plan-badge-text">{PLAN_LABELS[plan] ?? plan}</span>
					</a>
					<a href="/play" target="_blank" title="Aperçu Client" className="preview-btn" rel="noreferrer">
						<i className="fa-solid fa-eye"></i>
					</a>
					<button
						onClick={async () => {
							await supabase.auth.signOut();
							window.location.href = "/";
						}}
						title="Déconnexion"
						className="preview-btn"
						style={{
							background: "none",
							border: "none",
							color: "var(--text-muted)",
							cursor: "pointer",
							fontSize: "1.1rem"
						}}
					>
						<i className="fa-solid fa-arrow-right-from-bracket"></i>
					</button>
				</div>
			</div>

			<div className="screens-container">
				{/* SCREEN 1: DASHBOARD & STATS */}
				<div className={`app-screen ${activeTab === "stats" ? "active" : ""}`} id="screen-stats">
					<div className="screen-scroll">
						<div className="screen-body">
							<div className="welcome-banner">
								<h3>Bonjour, Gérant 👋</h3>
								<p>Voici l&apos;impact de Revioza sur votre commerce.</p>
								{statsLoading ? (
									<p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.35rem" }}>
										<i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: "6px" }}></i>
										Chargement de vos données…
									</p>
								) : currentStats.scans === 0 ? (
									<p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.35rem" }}>
										<i className="fa-solid fa-circle-info" style={{ marginRight: "6px", color: "var(--primary)" }}></i>
										Aucune participation sur cette période. Imprimez votre QR code et placez-le en salle pour
										commencer à collecter des avis.
									</p>
								) : null}
							</div>

							<div className="period-selector">
								{(["week", "month", "year"] as const).map((period) => (
									<button
										key={period}
										className={`period-btn ${currentPeriod === period ? "active" : ""}`}
										data-period={period}
										onClick={() => setCurrentPeriod(period)}
									>
										{period === "week" ? "Semaine" : period === "month" ? "Mois" : "Année"}
									</button>
								))}
							</div>

							<div className="stats-grid">
								<div className="stat-card">
									<div className="stat-icon">
										<i className="fa-solid fa-star"></i>
									</div>
									<div className="stat-num" id="stat-reviews-count">
										{currentStats.reviews}
									</div>
									<div className="stat-label">Nouveaux Avis Google</div>
								</div>
								<div className="stat-card">
									<div className="stat-icon">
										<i className="fa-solid fa-user-plus"></i>
									</div>
									<div className="stat-num" id="stat-clients-count">
										{currentStats.clients}
									</div>
									<div className="stat-label">Participations à la roue</div>
								</div>
							</div>

							<div className="gain-card">
								<div className="gain-header">
									<i className="fa-solid fa-money-bill-trend-up"></i>
									<h4>Estimation du gain financier</h4>
								</div>
								<div className="gain-amount" id="stat-earnings">
									{earnings.toLocaleString("fr-FR")} €
								</div>
								<p className="gain-desc">
									Estimation des revenus liés aux clients ayant participé à la roue
									(participations × panier moyen).
								</p>
								<div className="slider-group">
									<div className="slider-label">
										<span>Panier moyen par client :</span>
										<strong id="avg-basket-value">{averageBasket} €</strong>
									</div>
									<input
										type="range"
										id="avg-basket-slider"
										min={10}
										max={150}
										value={averageBasket}
										step={5}
										onChange={(e) => setAverageBasket(parseInt(e.target.value))}
									/>
								</div>
							</div>

							<div className="chart-card">
								<div className="chart-header">
									<i className="fa-solid fa-chart-line"></i>
									<span>Évolution des avis générés</span>
								</div>
								<div className="chart-container">
									<canvas id="reviewsChart" ref={chartRef}></canvas>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* SCREEN 2: CONFIGURATION & WHEEL */}
				<div className={`app-screen ${activeTab === "config" ? "active" : ""}`} id="screen-config">
					<div className="screen-scroll">
						<div className="screen-body">
							<div className="card-section">
								<h3 className="section-title">
									<i className="fa-solid fa-store"></i> Profil de l&apos;établissement
								</h3>
								<div className="form-group">
									<label htmlFor="merchant-rest-name">Nom de l&apos;établissement</label>
									<input
										type="text"
										id="merchant-rest-name"
										value={merchantState.restaurantName}
										onChange={(e) => {
											const val = e.target.value;
											setMerchantState((prev) => {
												const next = { ...prev, restaurantName: val };
												saveConfig(next);
												return next;
											});
											setCookie("merchant_rest_name", val);
										}}
									/>
								</div>
								<div className="form-group">
									<label htmlFor="merchant-rest-sub">Spécialité / Sous-titre</label>
									<input
										type="text"
										id="merchant-rest-sub"
										value={merchantState.restaurantSub}
										onChange={(e) => {
											const val = e.target.value;
											setMerchantState((prev) => {
												const next = { ...prev, restaurantSub: val };
												saveConfig(next);
												return next;
											});
											setCookie("merchant_rest_sub", val);
										}}
									/>
								</div>
								<div className="form-group">
									<label htmlFor="merchant-google-link">Place ID Google de votre Commerce</label>
									<input
										type="text"
										id="merchant-google-link"
										value={merchantState.googleLink}
										onChange={(e) => {
											const val = e.target.value;
											setMerchantState((prev) => {
												const next = { ...prev, googleLink: val };
												saveConfig(next);
												return next;
											});
											setCookie("merchant_google_link", val);
										}}
										placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83VY24"
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
												color: "var(--muted)",
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
												<li>Recherchez votre commerce sur la carte.</li>
												<li>
													Copiez le code (ex : <code>ChIJN1t_tDeuEmsRUsoyG83VY24</code>) et collez-le ici.
												</li>
											</ol>
										</div>
									)}
								</div>
								<div className="form-group">
									<label htmlFor="merchant-theme-color">Couleur du thème principal</label>
									<div className="color-picker-wrapper">
										<input
											type="color"
											id="merchant-theme-color"
											value={merchantState.primaryColor}
											onChange={(e) => {
												const val = e.target.value;
												setColorHexLabel(val);
												setMerchantState((prev) => {
													const next = { ...prev, primaryColor: val };
													saveConfig(next);
													return next;
												});
												setCookie("merchant_theme_color", val);
											}}
										/>
										<span id="color-hex-label">{colorHexLabel}</span>
									</div>
								</div>
								<div className="form-group">
									<label>Image d&apos;accueil (vue par vos clients)</label>
									<input
										ref={imageInputRef}
										type="file"
										accept="image/*"
										style={{ display: "none" }}
										onChange={(e) => {
											const f = e.target.files?.[0];
											if (f) handleImageUpload(f);
										}}
									/>
									{merchantState.imageUrl ? (
										<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
											<img
												src={merchantState.imageUrl}
												alt="Aperçu de l'image d'accueil"
												style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--border-color)" }}
											/>
											<button
												type="button"
												onClick={() => imageInputRef.current?.click()}
												style={{ padding: "0.5rem 0.9rem", borderRadius: "10px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-main)", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
											>
												<i className="fa-solid fa-arrows-rotate"></i> Changer
											</button>
											<button
												type="button"
												onClick={handleRemoveImage}
												style={{ padding: "0.5rem 0.9rem", borderRadius: "10px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
											>
												<i className="fa-solid fa-trash"></i> Retirer
											</button>
										</div>
									) : (
										<button
											type="button"
											onClick={() => imageInputRef.current?.click()}
											style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.7rem 1rem", borderRadius: "10px", background: "var(--bg-input)", border: "1px dashed var(--border-color)", color: "var(--text-main)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", marginTop: "0.25rem" }}
										>
											<i className="fa-solid fa-image"></i> Choisir une image
										</button>
									)}
									{imageUploadStatus && (
										<p style={{ fontSize: "0.78rem", marginTop: "0.45rem", color: imageUploadStatus.isError ? "var(--primary)" : "var(--accent-green)" }}>
											{imageUploadStatus.msg}
										</p>
									)}
								</div>
							</div>

							<div className="card-section">
								<h3 className="section-title">
									<i className="fa-solid fa-circle-notch"></i> Configuration de la Roue
								</h3>
								<p className="section-subtitle">
									Ajustez les lots, les probabilités et les couleurs affichées sur la roue.
								</p>
								<div className="prizes-editor-mobile">
									<div id="merchant-prizes-list">
										{merchantState.prizes.map((prize) => (
											<div key={prize.id} className="prize-row-mobile">
												<div className="prize-row-top">
													<input
														type="text"
														value={prize.name}
														className="prize-name-input"
														data-id={prize.id}
														onChange={(e) => handlePrizeName(prize.id, e.target.value)}
													/>
													<button
														className="btn-delete-prize"
														data-id={prize.id}
														onClick={() => handleDeletePrize(prize.id)}
													>
														<i className="fa-solid fa-trash-can"></i>
													</button>
												</div>
												<div className="prize-row-bottom">
													<div className="prob-wrap">
														<span>Probabilité :</span>
														<input
															type="number"
															min={1}
															max={100}
															value={prize.weight}
															className="prize-weight-input"
															data-id={prize.id}
															onChange={(e) => handlePrizeWeight(prize.id, e.target.value)}
														/>
														<span>%</span>
													</div>
													<div className="color-wrap">
														<span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Couleur :</span>
														<div className="color-dot" style={{ backgroundColor: prize.color }}>
															<input
																type="color"
																value={prize.color}
																className="prize-color-input"
																data-id={prize.id}
																onChange={(e) => handlePrizeColor(prize.id, e.target.value)}
															/>
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
									<button className="btn-primary" id="btn-merchant-add-prize" style={{ marginTop: "1rem" }} onClick={handleAddPrize}>
										<i className="fa-solid fa-plus"></i> Ajouter un Lot
									</button>
								</div>
							</div>

							<div className="card-section qr-section">
								<h3 className="section-title">
									<i className="fa-solid fa-qrcode"></i> QR Code de Table
								</h3>
								<p>
									Téléchargez et imprimez votre QR Code pour le disposer sur vos tables ou comptoirs.
								</p>
								<a
									href="/qr-code"
									className="btn-secondary full-width"
									style={{ marginTop: "0.5rem", textDecoration: "none" }}
								>
									<i className="fa-solid fa-qrcode"></i> Voir et Imprimer le QR Code
								</a>
							</div>
						</div>
					</div>
				</div>

				{/* SCREEN 3: PRIVATE FEEDBACK */}
				<div className={`app-screen ${activeTab === "reviews" ? "active" : ""}`} id="screen-reviews">
					<div className="screen-scroll">
						<div className="screen-body">
							<div className="feedback-intro">
								<h3 className="section-title">
									<i className="fa-solid fa-comment-slash"></i> Retours Privés (&lt; 3★)
								</h3>
								<p>
									Ces retours ont été saisis par des clients insatisfaits (1 à 3 étoiles). Ils restent{" "}
									<strong>100% privés</strong> pour vous permettre d&apos;améliorer vos services sans
									impacter votre note Google publique.
								</p>
							</div>

							<div id="private-feedbacks-container" className="feedbacks-list">
								{feedbacks.length === 0 ? (
									<div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
										<i
											className="fa-solid fa-face-smile"
											style={{ fontSize: "2.5rem", color: "var(--green)", marginBottom: "1rem", display: "block" }}
										></i>
										<p style={{ fontSize: "0.85rem" }}>
											Aucun retour négatif privé à traiter ! Félicitations.
										</p>
									</div>
								) : (
									feedbacks.map((review) => (
										<div key={review.id} className="feedback-card">
											<div className="feedback-card-header">
												<div className="feedback-client-info">
													<span className="client-name">{review.name}</span>
													<span className="feedback-date">{review.date}</span>
												</div>
												<div className="feedback-stars">{getStarsHtml(review.rating)}</div>
											</div>
											<div className="feedback-text">&quot;{review.text}&quot;</div>
											<div className="feedback-card-footer">
												<a
													href={`mailto:${review.email}?subject=Votre visite chez ${merchantState.restaurantName}`}
													className="btn-action-small primary"
												>
													<i className="fa-solid fa-envelope"></i> Répondre par Email
												</a>
												<button
													className="btn-action-small btn-archive-review"
													data-id={review.id}
													onClick={() => handleArchiveFeedback(review.id)}
												>
													<i className="fa-solid fa-check"></i> Traité
												</button>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom Navigation */}
			<nav className="bottom-nav">
				<div
					className={`nav-item ${activeTab === "stats" ? "active" : ""}`}
					id="tab-stats"
					onClick={() => setActiveTab("stats")}
				>
					<i className="fa-solid fa-chart-line"></i>
					<span>Stats</span>
				</div>
				<div
					className={`nav-item ${activeTab === "config" ? "active" : ""}`}
					id="tab-config"
					onClick={() => setActiveTab("config")}
				>
					<i className="fa-solid fa-sliders"></i>
					<span>Roue & Profil</span>
				</div>
				<div
					className={`nav-item ${activeTab === "reviews" ? "active" : ""}`}
					id="tab-reviews"
					onClick={() => setActiveTab("reviews")}
				>
					<i className="fa-solid fa-comment-slash"></i>
					<span>Retours Privés</span>
					{feedbacks.length > 0 && (
						<span className="badge" id="negative-badge">
							{feedbacks.length}
						</span>
					)}
				</div>
			</nav>
		</div>
	);
}
