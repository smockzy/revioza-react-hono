import { useEffect } from "react";
import { supabase } from "../utils/supabase-client";

export default function AuthCallback() {
	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				window.location.href = "/merchant";
			} else {
				window.location.href = "/demo?login=required";
			}
		});
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
