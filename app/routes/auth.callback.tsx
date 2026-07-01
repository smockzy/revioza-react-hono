import { useEffect } from "react";
import { supabase } from "../utils/supabase-client";

export default function AuthCallback() {
	useEffect(() => {
		// getSession() juste après le retour d'OAuth peut résoudre AVANT que le client
		// Supabase ait fini d'échanger le code/hash de l'URL en session (race condition :
		// c'est ce qui causait des redirections aléatoires vers /demo au lieu de /merchant).
		// On écoute donc onAuthStateChange, qui se déclenche une fois la session réellement
		// établie, avec un fallback getSession() (si déjà résolue) et un timeout de sécurité.
		let redirected = false;
		const redirectOnce = (href: string) => {
			if (redirected) return;
			redirected = true;
			window.location.href = href;
		};

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session) redirectOnce("/merchant");
		});

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) redirectOnce("/merchant");
		});

		const timeout = setTimeout(() => {
			redirectOnce("/demo?login=required");
		}, 6000);

		return () => {
			subscription.unsubscribe();
			clearTimeout(timeout);
		};
	}, []);

	return (
		<div style={{
			minHeight: "100vh",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			background: "var(--bg-main, #0a0a0f)",
			color: "#fff",
			fontFamily: "sans-serif",
			fontSize: "1rem",
		}}>
			Connexion en cours…
		</div>
	);
}
