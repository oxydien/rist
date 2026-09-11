import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [preact()],
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
			},
			output: {
				// Keep modules as separate chunks
				manualChunks: {
					// Core vendor dependencies
					vendor: ["preact", "preact/hooks"],
					// Shared utilities
					common: [
						"src/utils/hash.ts",
						"src/utils/staticRoutes.ts",

						"src/utils/comm/_default.ts",
						"src/utils/comm/auth.ts",
						"src/utils/comm/rateLimiter.ts",
						
						"src/utils/comm/download/chunkedDownload.ts",
						"src/utils/comm/download/entireDownload.ts",
						"src/utils/comm/download/info.ts",

						"src/utils/comm/requestQueue.ts",
						"src/utils/comm/serverInfo.ts",
						
						"src/types/UploadMethod.ts",
					],

					private: [
						"src/utils/comm/upload/entireUpload.ts",
						"src/utils/comm/upload/uploadWrapper.ts",
						"src/utils/comm/upload/request.ts",
						"src/utils/comm/upload/uploadStatus.ts",
						"src/utils/comm/upload/chunkedUpload.ts",

						"src/utils/comm/modules/medal.ts",
						"src/utils/comm/modules/youtube.ts",
					],
					// Keep CSS modules separate
					styles: ["src/assets/styles/variables.css"],
				},
				// Configure dynamic imports
				chunkFileNames: (chunkInfo) => {
					// Keep module files in their own directory
					if (chunkInfo.name?.includes("module-")) {
						return "modules/[name]-[hash].js";
					}
					return "assets/[name]-[hash].js";
				},
				// Ensure assets are placed in predictable locations
				assetFileNames: (assetInfo) => {
					if (assetInfo.name?.endsWith(".css")) {
						return "styles/[name]-[hash][extname]";
					}
					return "assets/[name]-[hash][extname]";
				},
			},
		},
		// Enable module system features
		modulePreload: true,
		target: "esnext",
		sourcemap: true,
	},
});
