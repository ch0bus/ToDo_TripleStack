import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "@/index.css";
import { applyThemeMode, getStoredThemeMode } from "@/lib/theme";

applyThemeMode(getStoredThemeMode());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
