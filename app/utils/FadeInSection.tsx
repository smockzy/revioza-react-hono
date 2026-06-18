import { motion, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";

interface FadeInSectionProps {
	children: React.ReactNode;
	delay?: number;
	className?: string;
}

export const FadeInSection = ({ children, delay = 0, className }: FadeInSectionProps) => {
	const [isMounted, setIsMounted] = useState(false);
	const prefersReducedMotion = useReducedMotion();

	useEffect(() => setIsMounted(true), []);

	// SSR guard + reduced motion fallback : render children as-is
	if (!isMounted || prefersReducedMotion) return <>{children}</>;

	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 40 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-80px" }}
			transition={{ duration: 0.6, ease: "easeOut", delay }}
		>
			{children}
		</motion.div>
	);
};
