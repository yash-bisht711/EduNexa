import React from "react";
import { useTheme } from "../ThemeContext";

export default function ThemeSwitch({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <label className={`theme-switch ${className}`.trim()}>
      <input
        className="theme-switch-input"
        type="checkbox"
        role="switch"
        checked={isDark}
        onChange={toggleTheme}
        aria-label="Dark mode"
        aria-checked={isDark}
        title={`Switch to ${isDark ? "light" : "dark"} mode`}
      />
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-thumb">{isDark ? "🌙" : "☀️"}</span>
      </span>
    </label>
  );
}
