import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTest = Boolean(process.env.VITEST);

const config = defineConfig({
	resolve: {
		tsconfigPaths: true,
		alias: {
			...(isTest
				? {
						"cloudflare:workers": path.resolve(
							__dirname,
							"./src/test-stubs/cloudflare-workers.ts",
						),
					}
				: {}),
		},
	},
	server: {
		watch: {
			ignored: ["**/.wrangler/**"],
		},
	},
	plugins: [
		devtools(),
		tailwindcss(),
		!isTest && cloudflare({ viteEnvironment: { name: "ssr" } }),
		tanstackStart(),
		viteReact(),
	].filter(Boolean),
});

export default config;
