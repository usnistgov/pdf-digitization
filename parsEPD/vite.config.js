import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// pdf.js worker needs to be importable; we’ll reference it via ?url in pdf.ts
export default defineConfig({
	plugins: [react()],
});
