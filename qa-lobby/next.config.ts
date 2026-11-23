import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// The Copilot SDK spawns its bundled CLI runtime from node_modules; don't bundle it.
	serverExternalPackages: ["@github/copilot-sdk"],
	// Hide the floating "N" dev-tools button in the bottom-left corner during `npm run dev`.
	// Build and runtime errors still show their overlay.
	devIndicators: false,
};

export default nextConfig;
