import React from "react";
import { Route } from "react-router-dom";

import CandidateDashboard from "./pages/CandidateDashboard";
import CandidateProfile from "./pages/CandidateProfile";

export const candidateRoutes = (
  <>
    {/* Candidate Dashboard */}
    <Route
      path="/candidate-dashboard"
      element={<CandidateDashboard />}
    />

    {/* Candidate Profile */}
    <Route
      path="/candidate/profile"
      element={<CandidateProfile />}
    />
        <Route
      path="/candidate/dashboard"
      element={<CandidateDashboard />}
    />
  </>
);