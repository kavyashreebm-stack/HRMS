import React from "react";
import { Route } from "react-router-dom";
import HRDashboard from "./pages/HRDashboard";
import HRAllProfiles from "./pages/HRAllProfiles";
import HRAllApplications from "./pages/HRAllApplications";
import HRJobPostings from "./pages/HRJobPostings";
import HROnboarding from "./pages/HROnboarding";
import HRAppointmentLetter from "./pages/HRAppointmentLetter";

export const hrRoutes = (
  <>
    <Route path="/hr/dashboard" element={<HRDashboard />} />
    <Route path="/hr/all-profiles" element={<HRAllProfiles />} />
    <Route path="/hr/all-applications" element={<HRAllApplications />} />
    <Route path="/hr/job-postings" element={<HRJobPostings />} />
    <Route path="/hr/onboarding" element={<HROnboarding />} />
    <Route path="/hr/appointment-letter" element={<HRAppointmentLetter />} />
  </>
);