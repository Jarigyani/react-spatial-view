import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "dist",
		lib: {
			entry: "src/index.ts",
			name: "@jarigyani/react-spatial-view",
			fileName: "index",
			formats: ["es", "umd"],
		},
		rollupOptions: {
			external: ["react", "react-dom"],
			output: {
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
				},
			},
		},
	},
});
