import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";

import AdminApp from "./AdminApp";
import "./styles.css";

const ADMIN_THEME_KEY = "ainerspeak_admin_theme";

function applyAdminTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(ADMIN_THEME_KEY, theme);
}

applyAdminTheme(
  localStorage.getItem(ADMIN_THEME_KEY) === "light" ? "light" : "dark"
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
