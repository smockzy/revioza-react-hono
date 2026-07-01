import { useState, useEffect, type MouseEvent } from "react";
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
	starter: { monthly: "29€", annual: "23€", saving: "soit 72€ économisés par an" },
	business: { monthly: "49€", annual: "39€", saving: "soit 120€ économisés par an" },
	franchise: { monthly: "149€", annual: "119€", saving: "soit 360€ économisés par an" },
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
			? "Facturé en une fois · Non remboursable · Accès garanti 12 mois complets"
			: "Sans engagement · Résiliation en 1 clic";

	const handlePlanClick = (e: MouseEvent<HTMLButtonElement>) => {
		const target = "/?register=true";
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			window.location.href = target;
			return;
		}
		const btn = e.currentTarget;
		btn.classList.add("btn-pressed");
		window.setTimeout(() => {
			window.location.href = target;
		}, 180);
	};

	return (
		<div className="page-pricing page-landing">
			{/* Filtre SVG : déforme les nappes d'aurora en fumée irrégulière (identique à l'accueil) */}
			<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
				<filter id="aurora-smoke">
					<feTurbulence type="fractalNoise" baseFrequency="0.009 0.014" numOctaves={2} seed={7} result="noise" />
					<feDisplacementMap in="SourceGraphic" in2="noise" scale={340} xChannelSelector="R" yChannelSelector="G" />
				</filter>
			</svg>

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
						<i className="fa-solid fa-arrow-left"></i> Retour à l'acceuil
					</a>
				</div>
			</header>

			<main className="pricing-container">
				{/* Hero Title */}
				<section className="pricing-hero reveal reveal-slide-up">
					{/* Fond "aurora fumée" rouge — dérive en CSS pur, cf. section-aurora de l'accueil */}
					<div className="section-aurora pricing-aurora" aria-hidden="true">
						<span className="aurora-blob blob-1" />
						<span className="aurora-blob blob-2" />
					</div>

					<h1>
						Des tarifs simples, <span>sans engagement</span>
					</h1>
					<p>
						Boostez votre e-réputation locale avec la solution de loterie interactive la plus performante du
						marché.
					</p>

					{/* Monthly/Annual Toggle */}
					<div className="billing-toggle-wrap" role="group" aria-label="Cycle de facturation">
						<button
							type="button"
							className={`toggle-label ${!isAnnual ? "active" : ""}`}
							id="billing-monthly"
							onClick={() => setIsAnnual(false)}
						>
							<span className="hide-mobile">Facturation </span>Mensuelle
						</button>
						<button
							type="button"
							className={`billing-switch ${isAnnual ? "active" : ""}`}
							id="billing-switch-btn"
							role="switch"
							aria-checked={isAnnual}
							aria-label="Basculer entre facturation mensuelle et annuelle"
							onClick={() => setIsAnnual(!isAnnual)}
						>
							<span className="switch-dot"></span>
						</button>
						<button
							type="button"
							className={`toggle-label ${isAnnual ? "active" : ""}`}
							id="billing-annual"
							onClick={() => setIsAnnual(true)}
						>
							<span className="hide-mobile">Facturation </span>Annuelle
							<span className="discount-badge">-20%</span>
						</button>
					</div>
				</section>

				{/* Pricing Grid */}
				<section className="pricing-grid-plans">
					{/* Plan 1 : Starter */}
					<div className="pricing-card reveal reveal-slide-up delay-100">
						<div className="plan-header">
							<span className="plan-tier">Starter</span>
							<h2 className="plan-price" id="price-starter" key={isAnnual ? "annual" : "monthly"}>
								{getPrice("starter")}<span>/mois</span>
							</h2>
							{isAnnual && (
								<div className="annual-saving-text">{prices.starter.saving}</div>
							)}
							<p className="plan-desc" style={{ marginTop: "0.5rem" }}>
								Idéal pour les petits commerces de quartier et les food-trucks.
							</p>
						</div>
						<div className="plan-divider"></div>
						<ul className="plan-features-list">
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>1 établissement physique
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Jusqu&apos;à 250 avis / mois
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Roue de loterie standard (5 lots max)
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>QR Code de table prêt à imprimer
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Statistiques de base (scans)
							</li>
							<li className="disabled">
								<span className="feature-icon excluded"><i className="fa-solid fa-xmark" aria-hidden="true"></i></span>
								<span className="sr-only">Non inclus : </span>Logo personnalisé au centre de la roue
							</li>
							<li className="disabled">
								<span className="feature-icon excluded"><i className="fa-solid fa-xmark" aria-hidden="true"></i></span>
								<span className="sr-only">Non inclus : </span>Filtrage intelligent des avis négatifs
							</li>
							<li className="disabled">
								<span className="feature-icon excluded"><i className="fa-solid fa-xmark" aria-hidden="true"></i></span>
								<span className="sr-only">Non inclus : </span>Essai gratuit 14 jours
							</li>
						</ul>
						<button className="btn-plan-select" onClick={handlePlanClick}>
							Commencer
						</button>
						<p className="plan-reassurance">
							<i className="fa-solid fa-lock" aria-hidden="true"></i> {getReassurance()}
						</p>
					</div>

					{/* Plan 2 : Business (Featured — offre exclusive) */}
					<div className="pricing-card featured reveal reveal-slide-up delay-200">
						<div className="featured-ribbon">
							<i className="fa-solid fa-star" aria-hidden="true"></i> Offre exclusive
						</div>
						<div className="plan-header">
							<span className="plan-tier">Business</span>
							<h2 className="plan-price" id="price-business" key={isAnnual ? "annual" : "monthly"}>
								{getPrice("business")}<span>/mois</span>
								<span className="price-original">{isAnnual ? "60€" : "75€"}</span>
								<span className="price-discount-badge">-35%</span>
							</h2>
							{isAnnual && (
								<div className="annual-saving-text">{prices.business.saving}</div>
							)}
							<div className="trial-badge">
								<i className="fa-solid fa-gift" aria-hidden="true"></i> 14 jours d&apos;essai gratuit
							</div>
							<p className="plan-desc" style={{ marginTop: "0.7rem" }}>
								Le choix idéal pour les restaurants et boutiques physiques dynamiques.
							</p>
						</div>
						<div className="plan-divider"></div>
						<ul className="plan-features-list">
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>1 établissement physique
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Avis &amp; Scans illimités
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Roue 100% personnalisable (lots illimités)
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>QR Code personnalisable prêt à imprimer
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Filtrage intelligent (retours négatifs en privé)
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Logo personnalisé et charte graphique
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Image d&apos;accueil mobile personnalisée
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Statistiques avancées (heures, conversion)
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Support client prioritaire 7j/7
							</li>
						</ul>
						<button className="btn-plan-select featured" onClick={handlePlanClick}>
							Essayer gratuitement
						</button>
						<p className="plan-reassurance">
							<i className="fa-solid fa-lock" aria-hidden="true"></i> {getReassurance()}
						</p>
					</div>

					{/* Plan 3 : Franchise & Réseau */}
					<div className="pricing-card reveal reveal-slide-up delay-300">
						<div className="plan-header">
							<span className="plan-tier">Franchise &amp; Réseau</span>
							<h2 className="plan-price" id="price-franchise" key={isAnnual ? "annual" : "monthly"}>
								{getPrice("franchise")}<span>/mois</span>
							</h2>
							{isAnnual && (
								<div className="annual-saving-text">{prices.franchise.saving}</div>
							)}
							<p className="plan-desc" style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>
								Tout ce qui est inclus dans Business, multiplié par 5 établissements — avec un tableau de
								bord centralisé pour piloter l&apos;ensemble.
							</p>
							<div className="addon-note">
								+19€/mois par adresse supplémentaire
							</div>
						</div>
						<div className="plan-divider" style={{ marginTop: "1rem" }}></div>
						<ul className="plan-features-list">
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span><strong>Jusqu&apos;à 5 adresses incluses</strong>
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Tableau de bord multi-commerces centralisé
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>QR codes uniques par table et serveur
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Statistiques par serveur et établissement
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Intégrations caisse &amp; API
							</li>
							<li>
								<span className="feature-icon included"><i className="fa-solid fa-check" aria-hidden="true"></i></span>
								<span className="sr-only">Inclus : </span>Accompagnement et conseiller dédié
							</li>
						</ul>
						<button className="btn-plan-select" onClick={handlePlanClick}>
							Contacter le service commercial
						</button>
						<p className="plan-reassurance">
							<i className="fa-solid fa-lock" aria-hidden="true"></i> {getReassurance()}
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
								q: "Comment fonctionne l'essai gratuit de 14 jours ?",
								a: "L'essai gratuit de 14 jours est réservé à la formule Business. Pour en profiter, vous souscrivez dès aujourd'hui en renseignant vos coordonnées bancaires : rien n'est prélevé pendant 14 jours. À l'issue de cette période, si vous n'avez pas résilié, votre abonnement Business démarre automatiquement et le premier paiement est prélevé. Vous pouvez résilier à tout moment avant la fin de l'essai, en un clic, sans être facturé.",
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
							>
								<h3>
									<button
										type="button"
										className="faq-question-bar"
										id={`faq-question-${idx}`}
										aria-expanded={!!openFaq[idx]}
										aria-controls={`faq-answer-${idx}`}
										onClick={() => toggleFaq(idx)}
									>
										{item.q}
										<span className="faq-icon-toggle" aria-hidden="true">
											<i className="fa-solid fa-chevron-down"></i>
										</span>
									</button>
								</h3>
								<div
									className="faq-answer-wrapper"
									id={`faq-answer-${idx}`}
									role="region"
									aria-labelledby={`faq-question-${idx}`}
								>
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
