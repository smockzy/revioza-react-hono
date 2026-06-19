import { useState, useEffect } from "react";
import type { Route } from "./+types/pricing";
import "../styles/style.css";
import "../styles/pricing.css";

export function meta({ }: Route.MetaArgs) {
	return [
		{ title: "Revioza - Tarifs & Abonnements | Gamification Locale" },
		{
			name: "description",
			content:
				"Découvrez nos formules d'abonnement sans engagement. Choisissez le plan idéal pour booster vos avis Google et fidéliser vos clients physiques.",
		},
	];
}

interface PlanConfig {
	monthly: string;
	annual: string;
	saving: string;
}

const prices: Record<string, PlanConfig> = {
	starter: { monthly: "49€", annual: "39€", saving: "soit 120€ économisés par an" },
	business: { monthly: "99€", annual: "79€", saving: "soit 240€ économisés par an" },
	franchise: { monthly: "199€", annual: "159€", saving: "soit 480€ économisés par an" },
};

export default function Pricing() {
	const [isAnnual, setIsAnnual] = useState(false);
	const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({});

	const toggleFaq = (index: number) => {
		setOpenFaq((prev) => ({
			...prev,
			[index]: !prev[index],
		}));
	};

	// Scroll reveal IntersectionObserver
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

	const getPrice = (plan: string) => (isAnnual ? prices[plan].annual : prices[plan].monthly);
	const getReassurance = () =>
		isAnnual
			? "🔒 Facturé en une fois · Non remboursable · Accès garanti 12 mois complets"
			: "🔒 Sans engagement · Résiliation en 1 clic · Aucune carte requise pour l'essai";

	const handlePlanClick = () => {
		window.location.href = "/?register=true";
	};

	return (
		<div className="page-pricing">
			<header>
				<div className="header-container">
					<a href="/" className="logo" style={{ textDecoration: "none" }}>
						<div className="logo-text">
							RE<span className="v-accent">V</span>IOZA
						</div>
						<span className="logo-tagline">L&apos;avis qui vous rapporte</span>
					</a>
					<a
						href="/"
						className="cta-pitch"
						style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}
					>
						<i className="fa-solid fa-arrow-left"></i> Retour à la démo
					</a>
				</div>
			</header>

			<main className="pricing-container">
				{/* Hero Title */}
				<section className="pricing-hero reveal reveal-slide-up">
					<h1>
						Des tarifs simples, <span>sans engagement</span>
					</h1>
					<p>
						Boostez votre e-réputation locale avec la solution de loterie interactive la plus performante du
						marché.
					</p>

					{/* Monthly/Annual Toggle */}
					<div className="billing-toggle-wrap">
						<span
							className={`toggle-label ${!isAnnual ? "active" : ""}`}
							id="billing-monthly"
							onClick={() => setIsAnnual(false)}
						>
							Facturation mensuelle
						</span>
						<button
							className={`billing-switch ${isAnnual ? "active" : ""}`}
							id="billing-switch-btn"
							aria-label="Toggle billing cycle"
							onClick={() => setIsAnnual(!isAnnual)}
						>
							<span className="switch-dot"></span>
						</button>
						<span
							className={`toggle-label ${isAnnual ? "active" : ""}`}
							id="billing-annual"
							onClick={() => setIsAnnual(true)}
						>
							Facturation annuelle
							<span className="discount-badge">-20%</span>
						</span>
					</div>
				</section>

				{/* Pricing Grid */}
				<section className="pricing-grid-plans">
					{/* Plan 1: Starter */}
					<div className="pricing-card reveal reveal-slide-up delay-100">
						<div className="plan-header">
							<span className="plan-tier">Solo / Starter</span>
							<h2 className="plan-price" id="price-starter">
								{getPrice("starter")}
								<span>/mois</span>
							</h2>
							{isAnnual && (
								<div
									className="annual-saving-text"
									style={{
										fontSize: "0.72rem",
										color: "var(--green)",
										fontWeight: 700,
										marginTop: "0.2rem",
									}}
								>
									{prices.starter.saving}
								</div>
							)}
							<p className="plan-desc" style={{ marginTop: "0.5rem" }}>
								Idéal pour les petits commerces de quartier et les food-trucks.
							</p>
						</div>
						<div className="plan-divider"></div>
						<ul className="plan-features-list">
							<li>
								<i className="fa-solid fa-check"></i> 1 établissement physique
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Jusqu&apos;à 100 avis / mois
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Roue de loterie standard (5 lots max)
							</li>
							<li>
								<i className="fa-solid fa-check"></i> QR Code de table prêt à imprimer
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Statistiques de base (scans)
							</li>
							<li className="disabled">
								<i className="fa-solid fa-xmark"></i> Logo personnalisé au centre de la roue
							</li>
							<li className="disabled">
								<i className="fa-solid fa-xmark"></i> Filtrage intelligent des avis négatifs
							</li>
						</ul>
						<button className="btn-plan-select" onClick={handlePlanClick}>
							Essayer gratuitement
						</button>
						<p
							className="plan-reassurance"
							style={{
								fontSize: "0.7rem",
								color: "var(--text-muted)",
								textAlign: "center",
								marginTop: "0.6rem",
								opacity: 0.8,
								lineHeight: 1.3,
							}}
						>
							{getReassurance()}
						</p>
					</div>

					{/* Plan 2: Business (Featured) */}
					<div className="pricing-card featured reveal reveal-slide-up delay-200">
						<div className="featured-ribbon">Recommandé</div>
						<div className="plan-header">
							<span className="plan-tier">Business / Growth</span>
							<h2 className="plan-price" id="price-business">
								{getPrice("business")}
								<span>/mois</span>
							</h2>
							{isAnnual && (
								<div
									className="annual-saving-text"
									style={{
										fontSize: "0.72rem",
										color: "var(--green)",
										fontWeight: 700,
										marginTop: "0.2rem",
									}}
								>
									{prices.business.saving}
								</div>
							)}
							<p className="plan-desc" style={{ marginTop: "0.5rem" }}>
								Le choix idéal pour les restaurants et boutiques physiques dynamiques.
							</p>
						</div>
						<div className="plan-divider"></div>
						<ul className="plan-features-list">
							<li>
								<i className="fa-solid fa-check"></i> 1 établissement physique
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Avis & Scans illimités
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Roue 100% personnalisable (lots illimités)
							</li>
							<li>
								<i className="fa-solid fa-check"></i> QR Code de table prêt à imprimer et personnalisable
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Filtrage intelligent (triage des avis privés)
							</li>
							<li
								style={{
									fontSize: "0.78rem",
									paddingLeft: "1.6rem",
									color: "var(--text-muted)",
									fontStyle: "italic",
									marginTop: "-0.6rem",
									marginBottom: "0.25rem",
									display: "block",
									lineHeight: 1.35,
								}}
							>
								&quot;Les clients insatisfaits (1–3 ⭐) sont redirigés vers un retour privé, invisible
								sur Google.&quot;
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Logo personnalisé et charte graphique
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Image d&apos;accueil mobile personnalisée (.jpg)
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Statistiques avancées (heures, conversion)
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Notifications en temps réel à chaque nouvel avis
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Widget avis intégrable sur votre site web
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Support client prioritaire 7j/7
							</li>
						</ul>
						<button className="btn-plan-select featured" onClick={handlePlanClick}>
							Essayer gratuitement
						</button>
						<p
							className="plan-reassurance"
							style={{
								fontSize: "0.7rem",
								color: "var(--text-muted)",
								textAlign: "center",
								marginTop: "0.6rem",
								opacity: 0.8,
								lineHeight: 1.3,
							}}
						>
							{getReassurance()}
						</p>
					</div>

					{/* Plan 3: Franchise */}
					<div className="pricing-card reveal reveal-slide-up delay-300">
						<div className="plan-header">
							<span className="plan-tier">Franchise & Réseau</span>
							<h2 className="plan-price" id="price-franchise">
								{getPrice("franchise")}
								<span>/mois</span>
							</h2>
							{isAnnual && (
								<div
									className="annual-saving-text"
									style={{
										fontSize: "0.72rem",
										color: "var(--green)",
										fontWeight: 700,
										marginTop: "0.2rem",
									}}
								>
									{prices.franchise.saving}
								</div>
							)}
							<p className="plan-desc" style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>
								Tout ce qui est inclus dans Business, multiplié par 5 établissements — avec un tableau de
								bord centralisé pour piloter l&apos;ensemble.
							</p>
							<div
								style={{
									display: "inline-block",
									background: "rgba(229, 9, 20, 0.05)",
									border: "1px solid rgba(229, 9, 20, 0.15)",
									borderRadius: "6px",
									padding: "4px 10px",
									fontSize: "0.72rem",
									fontWeight: 600,
									color: "var(--primary)",
									width: "fit-content",
								}}
							>
								+19€/mois par adresse supplémentaire
							</div>
						</div>
						<div className="plan-divider" style={{ marginTop: "1rem" }}></div>
						<ul className="plan-features-list">
							<li>
								<i className="fa-solid fa-check"></i>{" "}
								<strong>Jusqu&apos;à 5 adresses incluses</strong>
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Tableau de bord multi-commerces centralisé
							</li>
							<li>
								<i className="fa-solid fa-check"></i> QR codes uniques par table et serveur
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Statistiques par serveur et établissement
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Intégrations caisse & API
							</li>
							<li>
								<i className="fa-solid fa-check"></i> Accompagnement et conseiller dédié
							</li>
						</ul>
						<button className="btn-plan-select" onClick={handlePlanClick}>
							Contacter le service commercial
						</button>
						<span
							style={{
								fontSize: "0.78rem",
								color: "var(--primary)",
								fontWeight: 700,
								marginTop: "0.4rem",
								display: "block",
								textAlign: "center",
							}}
						>
							Démo gratuite disponible
						</span>
						<p
							className="plan-reassurance"
							style={{
								fontSize: "0.7rem",
								color: "var(--text-muted)",
								textAlign: "center",
								marginTop: "0.6rem",
								opacity: 0.8,
								lineHeight: 1.3,
							}}
						>
							{getReassurance()}
						</p>
					</div>
				</section>

				{/* FAQ Section */}
				<section className="pricing-faq reveal reveal-slide-up">
					<h2>Questions Fréquentes</h2>
					<div className="faq-accordion-container">
						{[
							{
								q: "Y a-t-il un engagement de durée ?",
								a: "Non, toutes nos offres mensuelles sont 100% sans engagement. Vous pouvez suspendre, résilier ou modifier votre abonnement à tout moment en un clic depuis votre espace gérant.",
							},
							{
								q: "Comment fonctionne l'offre d'essai de 14 jours ?",
								a: "L'essai gratuit de 14 jours est universel et disponible sur toutes nos formules. Aucune carte bancaire n'est requise. Vous pouvez configurer votre compte, imprimer des QR codes temporaires et tester le système immédiatement.",
							},
							{
								q: "Qu'est-ce que le filtrage intelligent des avis ?",
								a: "Si un client sélectionne une note basse (1 à 3 étoiles), le système lui propose de rédiger une critique constructive privée destinée uniquement à la direction, évitant ainsi un avis négatif public sur votre fiche Google Maps.",
							},
							{
								q: "Comment sont générés et imprimés les QR codes ?",
								a: "Depuis votre espace d'administration, vous pouvez télécharger un fichier PDF prêt à l'emploi contenant vos chevalets de table avec votre code QR unique. Il vous suffit de les imprimer et de les placer sur vos tables ou comptoirs.",
							},
							{
								q: "Est-ce que c'est légal ?",
								a: "Oui, totalement. Revioza incite vos clients à partager leur expérience sincère — nous ne demandons jamais explicitement une note de 5 étoiles. La récompense est offerte en échange d'un avis honnête, ce qui est conforme aux conditions d'utilisation de Google.",
							},
							{
								q: "Combien d'avis vais-je vraiment obtenir ?",
								a: "Nos clients obtiennent en moyenne 40 à 80 nouveaux avis dès le premier mois d'utilisation, selon la fréquentation de leur établissement. Certains restaurants ont doublé leur nombre total d'avis en moins de 6 semaines.",
							},
							{
								q: "Puis-je résilier mon abonnement annuel ?",
								a: "Oui, vous pouvez résilier à tout moment depuis votre espace gérant. L'abonnement annuel est facturé en une fois et n'est pas remboursable, mais vous conservez un accès complet à Revioza jusqu'au dernier jour de votre période de 12 mois.",
							},
						].map((item, idx) => (
							<div
								className={`faq-accordion-item ${openFaq[idx] ? "open" : ""}`}
								key={idx}
								onClick={() => toggleFaq(idx)}
							>
								<div className="faq-question-bar">
									<h3>{item.q}</h3>
									<span className="faq-icon-toggle">
										<i className="fa-solid fa-chevron-down"></i>
									</span>
								</div>
								<div className="faq-answer-wrapper">
									<div className="faq-answer-content">
										<p>{item.a}</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</section>
			</main>

			<footer>
				<div className="footer-container">
					<div className="footer-branding">
						<div className="logo">
							<div className="logo-text">
								RE<span className="v-accent">V</span>IOZA
							</div>
						</div>
						<p>
							La solution ultime de gamification pour propulser les commerces de proximité sur le devant de
							la scène locale.
						</p>
					</div>
					<div
						style={{
							fontSize: "0.8rem",
							color: "var(--text-muted)",
							textAlign: "center",
							marginTop: "2rem",
							borderTop: "1px solid var(--border-color)",
							paddingTop: "1.5rem",
							width: "100%",
						}}
					>
						&copy; 2026 Revioza. Tous droits réservés. Version Démo Interactive.
					</div>
				</div>
			</footer>
		</div>
	);
}
