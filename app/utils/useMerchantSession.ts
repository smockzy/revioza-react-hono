import { useEffect, useState } from "react";
import { supabase } from "./supabase-client";

// Hook partagé : indique si un commerçant est connecté (session Supabase)
// et fournit la déconnexion. Utilisé pour adapter la navbar publique.
export function useMerchantSession() {
	const [loggedIn, setLoggedIn] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!active) return;
			setLoggedIn(!!session);
			setLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setLoggedIn(!!session);
			setLoading(false);
		});

		return () => {
			active = false;
			subscription.unsubscribe();
		};
	}, []);

	const signOut = async () => {
		await supabase.auth.signOut();
		window.location.href = "/";
	};

	return { loggedIn, loading, signOut };
}
