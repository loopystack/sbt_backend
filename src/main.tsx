import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "./styles/theme.css";
import { routes } from "./app/routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CountryProvider } from "./contexts/CountryContext";
import { AuthProvider } from "./contexts/AuthContext";
import ReduxProvider from "./contexts/ReduxContext";

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReduxProvider>
      <ThemeProvider>
        <CountryProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </CountryProvider>
      </ThemeProvider>
    </ReduxProvider>
  </React.StrictMode>
);
