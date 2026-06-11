import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("play", "routes/play.tsx"),
	route("pricing", "routes/pricing.tsx"),
	route("merchant", "routes/merchant.tsx"),
	route("qr-code", "routes/qr-code.tsx"),
] satisfies RouteConfig;
