import type { Route } from "../+types/home";
import "../../styles/style.css";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Conditions d'utilisation — Revioza" },
		{
			name: "description",
			content: "Conditions générales d'utilisation de Revioza, la solution de gamification d'avis Google pour les commerçants.",
		},
	];
}

export default function ConditionsUtilisation() {
	return (
		<div className="page-landing" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
			{/* HEADER */}
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
						<i className="fa-solid fa-arrow-left"></i> Retour à l&apos;accueil
					</a>
				</div>
			</header>

			{/* MAIN */}
			<main
				style={{
					flex: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "4rem 1.5rem",
				}}
			>
				<div
					style={{
						maxWidth: "640px",
						width: "100%",
						textAlign: "center",
						background: "var(--bg-card)",
						border: "1px solid var(--border-color)",
						borderRadius: "20px",
						padding: "3rem 2rem",
					}}
				>
					<div
						style={{
							fontSize: "2.5rem",
							marginBottom: "1rem",
						}}
					>
						📋
					</div>
					<h1
						style={{
							fontFamily: "var(--font-display)",
							fontSize: "1.75rem",
							fontWeight: 800,
							color: "var(--text-main)",
							marginBottom: "1rem",
						}}
					>
						Conditions d&apos;utilisation
					</h1>
					<p
						style={{
							color: "var(--text-muted)",
							fontSize: "1rem",
							lineHeight: 1.6,
						}}
					>
						Cette page est en cours de rédaction. Merci de revenir prochainement.
					</p>
				</div>
			</main>

			{/* FOOTER */}
			<footer>
				<div className="footer-new-container">
					<div className="footer-brand-col">
						<div className="logo">
							<div className="logo-text">
								RE<span className="v-accent">V</span>IOZA
							</div>
						</div>
						<p>La solution ultime de gamification pour propulser les commerces de proximité.</p>
					</div>
					<div className="footer-links-col">
						<h4>Navigation</h4>
						<nav className="footer-nav">
							<a href="/">Accueil</a>
							<a href="/pricing">Tarifs</a>
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
					<span className="footer-bottom-made">Fait avec ❤️ pour les commerçants français</span>
				</div>
				{/* TODO: Remplacer par le nom légal de la société et le numéro SIREN */}
				<div style={{ fontSize: "0.75rem", color: "var(--text-muted)", opacity: 0.6, textAlign: "center", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}>
					Société : [NOM À COMPLÉTER] — SIREN : [À COMPLÉTER]
				</div>
			</footer>
		</div>
	);
}
