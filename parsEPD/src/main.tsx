import { Provider } from "@/components/ui/provider";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
	<Provider>
		<App />
	</Provider>,
);
