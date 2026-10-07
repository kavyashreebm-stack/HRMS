import React from "react";
import HRTopbar from "../components/layout/HRTopbar";
import HRSidebar from "../components/layout/HRSidebar";
import HRStatsCards from "../components/dashboard/HRStatsCards";
import HRRecentApplications from "../components/dashboard/HRRecentApplications";
import HROpenJobsOverview from "../components/dashboard/HROpenJobsOverview";

export default function HRDashboard() {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-100">
      
      {/* Sidebar */}
      <HRSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <HRTopbar />

        {/* Dashboard content */}
        <div className="p-8 text-sm bg-white dark:bg-gray-900 flex-1 overflow-auto">
          <HRStatsCards />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mt-10">
            <HRRecentApplications />
            <HROpenJobsOverview />
          </div>
        </div>
      </div>
    </div>
  );
}