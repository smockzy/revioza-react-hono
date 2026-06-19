import { useEffect, useState } from "react";
import type { Route } from "./+types/qr-code";
import "../styles/style.css";

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
	const [badgeText, setBadgeText] = useState("Bella Napoli");

	useEffect(() => {
		// Load saved configuration
		let config = {
			restaurantName: "Bella Napoli",
			restaurantSub: "Pizzeria",
			primaryColor: "#e50914",
			googleLink: "ChIJN1t_tDeuEmsRUsoyG83VY24",
			imageUrl: "",
			prizes: [
				{ name: "CAFÉ OFFERT", weight: 45 },
				{ name: "-15% SUR LA NOTE", weight: 20 },
				{ name: "TIRAMISU OFFERT", weight: 15 },
				{ name: "BOISSON OFFERTE", weight: 15 },
				{ name: "PERDU DOMMAGE !", weight: 5 },
			],
		};

		const savedConfig = localStorage.getItem("revioza_merchant_config");
		if (savedConfig) {
			try {
				config = JSON.parse(savedConfig);
			} catch (e) {
				console.error("Error parsing saved config", e);
			}
		}

		setBadgeText(`${config.restaurantName} (${config.restaurantSub})`);

		const getFullGoogleLink = (placeId: string) => {
			if (!placeId) return "";
			if (placeId.startsWith("http")) return placeId;
			return `https://search.google.com/local/writereview?placeid=${placeId}`;
		};

		// Build client page URL
		const clientUrl = new URL("/play", window.location.href);
		clientUrl.searchParams.set("name", config.restaurantName);
		clientUrl.searchParams.set("sub", config.restaurantSub);
		clientUrl.searchParams.set("color", config.primaryColor);
		clientUrl.searchParams.set("google_link", getFullGoogleLink(config.googleLink));
		if (config.imageUrl) {
			clientUrl.searchParams.set("image", config.imageUrl);
		}

		const prizeNames = config.prizes.map((p) => p.name).join(",");
		const prizeWeights = config.prizes.map((p) => p.weight || 10).join(",");
		clientUrl.searchParams.set("prizes", prizeNames);
		clientUrl.searchParams.set("weights", prizeWeights);

		// Generate QR Code URL via free API
		setQrUrl(
			`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clientUrl.toString())}`
		);
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
						le scannant, vos clients pourront directement laisser un avis et faire tourner la roue.
					</p>

					<div className="qr-box">
						{qrUrl && <img id="qr-img" src={qrUrl} alt="QR Code Unique" />}
					</div>

					<div className="action-buttons">
						<button className="btn-qr btn-qr-print" id="btn-print" onClick={() => window.print()}>
							<i className="fa-solid fa-print"></i> Imprimer le QR Code
						</button>
						<a href="/" className="btn-qr btn-qr-back">
							<i className="fa-solid fa-house"></i> Retour Admin
						</a>
					</div>
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
				}

				.page-qrcode .qr-box:hover {
					transform: scale(1.02);
				}

				.page-qrcode .qr-box img {
					width: 100%;
					height: 100%;
					object-fit: contain;
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
