import type { RouteObject } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import Home from "../pages/Home";
import Matches from "../pages/Matches";
import DroppingOdds from "../pages/DroppingOdds";
import SureBets from "../pages/SureBets";
import InPlayOdds from "../pages/InPlayOdds";
import AllEvents from "../pages/AllEvents";
import Betting from "../pages/Betting";
import Bookmakers from "../pages/Bookmakers";
import Bonuses from "../pages/Bonuses";
import Dashboard from "../pages/Dashboard";
import SignInSignUp from "../pages/SignInSignUp";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import VerifyEmail from "../pages/VerifyEmail";
import Profile from "../pages/Profile";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import AdminPanel from "../pages/AdminPanel";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: "matches", element: <Matches /> },
      { path: "dropping-odds", element: <DroppingOdds /> },
      { path: "sure-bets", element: <SureBets /> },
      { path: "in-play-odds", element: <InPlayOdds /> },
      { path: "all-events", element: <AllEvents /> },
      { path: "betting", element: <Betting /> },
      { path: "bookmakers", element: <Bookmakers /> },
      { path: "bonuses", element: <Bonuses /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "profile", element: <Profile /> },
      { path: "privacy-policy", element: <PrivacyPolicy /> }
    ]
  },
  {
    path: "/signin",
    element: <SignInSignUp />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/reset-password",
    element: <ResetPassword />
  },
  {
    path: "/verify-email",
    element: <VerifyEmail />
  },
  {
    path: "/admin",
    element: <AdminPanel />
  }
];
