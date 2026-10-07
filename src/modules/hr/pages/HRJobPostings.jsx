import React from "react";
import HRTopbar from "../components/layout/HRTopbar";
import HRSidebar from "../components/layout/HRSidebar";
import JobManagement from "../components/jobs/JobManagement";

export default function HRJobPostings() {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 font-sans text-gray-800 dark:text-gray-100">
      {/* Sidebar */}
      <HRSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <HRTopbar />

        {/* Page content */}
        <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/50">
          <JobManagement />
        </div>
      </div>
    </div>
  );
}
