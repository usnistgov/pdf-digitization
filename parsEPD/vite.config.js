import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
// pdf.js worker needs to be importable; we’ll reference it via ?url in pdf.ts
export default defineConfig({
	plugins: [react(), tsconfigPaths()],
});
