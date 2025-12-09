import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build metadata for diagnostics
if (import.meta.env.VITE_COMMIT_SHA) {
  console.log("[build] commit", import.meta.env.VITE_COMMIT_SHA);
}

createRoot(document.getElementById("root")!).render(<App />);
