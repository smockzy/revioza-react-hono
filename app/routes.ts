import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("play", "routes/play.tsx"),
	route("pricing", "routes/pricing.tsx"),
	route("merchant", "routes/merchant.tsx"),
	route("qr-code", "routes/qr-code.tsx"),
	route("legal/mentions-legales", "routes/legal/mentions-legales.tsx"),
	route("legal/politique-confidentialite", "routes/legal/politique-confidentialite.tsx"),
	route("legal/conditions-utilisation", "routes/legal/conditions-utilisation.tsx"),
] satisfies RouteConfig;
