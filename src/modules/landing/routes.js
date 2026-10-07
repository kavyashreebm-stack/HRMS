import React from "react";
import { Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";

export const landingRoutes = (
  <>
    <Route path="/" element={<LandingPage />} />
  </>
);
