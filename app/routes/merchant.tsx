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
import { supabase } from "../utils/supabase-client";

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
	id: number;
	name: string;
	email: string;
	rating: number;
	date: string;
	text: string;
}

const defaultFeedbacks: PrivateFeedback[] = [
	{
		id: 1,
		name: "Jean-Marc L.",
		email: "jean.marc.l@yahoo.fr",
		rating: 2,
		date: "Hier, 19:42",
		text: "Le temps d'attente était un peu trop long pour une simple pizza Margherita (25 minutes). La pizza était bonne mais arrivée tiède sur la table.",
	},
	{
		id: 2,
		name: "Amélie D.",
		email: "amelie.dupont@gmail.com",
		rating: 3,
		date: "05 Juin, 13:15",
		text: "La garniture de la pizza végétarienne était un peu légère aujourd'hui. L'accueil reste super mais j'espère un geste la prochaine fois.",
	},
	{
		id: 3,
		name: "Thomas R.",
		email: "t.rodriguez@outlook.fr",
		rating: 1,
		date: "02 Juin, 21:30",
		text: "La pâte de ma calzone n'était pas assez cuite au milieu, très déçu par rapport à mes visites précédentes.",
	},
];

const baseStatsData = {
	week: { reviews: 14, clients: 42, labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"], dataset: [1, 2, 1, 3, 2, 3, 2] },
	month: { reviews: 58, clients: 174, labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"], dataset: [12, 15, 14, 17] },
	year: { reviews: 712, clients: 2136, labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"], dataset: [45, 52, 60, 58, 62, 70, 68, 55, 61, 65, 58, 60] },
};

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
	const [feedbacks, setFeedbacks] = useState<PrivateFeedback[]>(defaultFeedbacks);
	const [currentPeriod, setCurrentPeriod] = useState<"week" | "month" | "year">("week");
	const [averageBasket, setAverageBasket] = useState(25);
	const [placeIdHelp, setPlaceIdHelp] = useState(false);
	const [colorHexLabel, setColorHexLabel] = useState("#e50914");

	const chartRef = useRef<HTMLCanvasElement>(null);
	const chartInstanceRef = useRef<unknown>(null);
	const userIdRef = useRef<string | null>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load config from localStorage
	useEffect(() => {
		supabase.auth.getSession().then(async ({ data: { session } }) => {
			if (!session) {
				window.location.href = "/demo?login=required";
				return;
			}
			userIdRef.current = session.user.id;

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

		// Sync hero image
		const savedReviews = localStorage.getItem("revioza_private_reviews");
		if (savedReviews) {
			try {
				setFeedbacks(JSON.parse(savedReviews));
			} catch {}
		} else {
			localStorage.setItem("revioza_private_reviews", JSON.stringify(defaultFeedbacks));
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

	const getDynamicStats = useCallback(() => {
		const stats = JSON.parse(JSON.stringify(baseStatsData));
		try {
			const savedHistory = localStorage.getItem("revioza_reviews_history");
			if (!savedHistory) return stats;
			const history = JSON.parse(savedHistory);
			const now = new Date();
			history.forEach((item: { date: string; rating: number }) => {
				const itemDate = new Date(item.date);
				const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
				if (diffDays < 7) {
					const dayIndex = (itemDate.getDay() + 6) % 7;
					stats.week.dataset[dayIndex]++;
					stats.week.reviews++;
					stats.week.clients += 3;
				}
				if (diffDays < 30) {
					const weekIndex = Math.min(3, Math.floor((itemDate.getDate() - 1) / 7));
					stats.month.dataset[weekIndex]++;
					stats.month.reviews++;
					stats.month.clients += 3;
				}
				if (itemDate.getFullYear() === now.getFullYear()) {
					const monthIndex = itemDate.getMonth();
					stats.year.dataset[monthIndex]++;
					stats.year.reviews++;
					stats.year.clients += 3;
				}
			});
		} catch {}
		return stats;
	}, []);

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

			const stats = getDynamicStats();
			const pData = stats[currentPeriod];

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
	}, [activeTab, currentPeriod, merchantState.primaryColor, getDynamicStats]);

	const currentStats = getDynamicStats()[currentPeriod];
	const earnings = currentStats.clients * averageBasket;

	const handleArchiveFeedback = useCallback(
		(reviewId: number) => {
			const updated = feedbacks.filter((r) => r.id !== reviewId);
			setFeedbacks(updated);
			localStorage.setItem("revioza_private_reviews", JSON.stringify(updated));
		},
		[feedbacks]
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
				<div className="app-header-spacer">
					<i className="fa-solid fa-circle-user" style={{ color: "var(--primary)" }}></i>
				</div>
				<div className="app-header-center">
					<div className="header-title">Espace Gérant</div>
					<div className="restaurant-name-bind header-rest-name">{merchantState.restaurantName}</div>
				</div>
				<div className="app-header-right" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
									<div className="stat-label">Est. Clients Gagnés</div>
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
									Revenus générés estimés grâce aux nouveaux clients ramenés par l&apos;amélioration de
									votre référencement Google.
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
