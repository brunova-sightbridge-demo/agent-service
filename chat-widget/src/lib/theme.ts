import "./styles.css";
import type { AgentTheme } from "./types";

export const defaultTheme: AgentTheme = {
  primary: "#1E1E24",
  primaryDark: "#14141A",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F4EE",
  text: "#1E1E24",
  textMuted: "#555158",
  border: "#DED6CA",
  success: "#0BB07B",
  danger: "#DC4B57",
  shadow: "0 20px 60px rgba(30, 30, 36, 0.16)",
};

export function applyTheme(theme?: Partial<AgentTheme>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const merged = { ...defaultTheme, ...(theme || {}) };
  Object.entries(merged).forEach(([key, value]) => {
    root.style.setProperty(`--scol-${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`, value);
  });
}
