import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// The Copilot SDK spawns its bundled CLI runtime from node_modules; don't bundle it.
	serverExternalPackages: ["@github/copilot-sdk"],
};

export default nextConfig;
