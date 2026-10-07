import React from "react";
import { BrowserRouter, Routes } from "react-router-dom";

import { landingRoutes } from "../../modules/landing/routes";
import { authRoutes } from "../../modules/auth/routes";
import { candidateRoutes } from "../../modules/candidate/routes";
import { hrRoutes } from "../../modules/hr/routes";


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {landingRoutes}
        {authRoutes}
        {candidateRoutes}
        {hrRoutes}
      </Routes>
    </BrowserRouter>
  );
}
