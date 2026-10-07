import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HRSidebar from "../components/layout/HRSidebar";
import HRTopbar from "../components/layout/HRTopbar";

import HRApplicationsFilters from "../components/applications/HRApplicationsFilters";
import HRApplicationsKanban from "../components/applications/HRApplicationsKanban";
import HRApplicationsTable from "../components/applications/HRApplicationsTable";
import ApplicationViewModal from "../../candidate/components/application/ApplicationViewModal";
import { getHRApplications, updateApplicationStatus } from "../../../api";

export default function HRAllApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("kanban");
  const [selectedApplication, setSelectedApplication] = useState(null);

  /* ✅ FETCH APPLICATIONS */
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await getHRApplications({ status: status || undefined, search: search || undefined });
      const mapped = response.data.map(app => ({
        ...app,
        job: app.job_title || app.department || "—",
        date: app.created_at ? new Date(app.created_at).toLocaleDateString("en-GB").replace(/\//g, "-") : "N/A"
      }));
      setApplications(mapped);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [status, search]);

  const handleViewApplication = (app) => {
    setSelectedApplication(app);
  };

  const closeDrawer = () => {
    setSelectedApplication(null);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await updateApplicationStatus(id, newStatus);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app
        )
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error updating application status.");
    }
  };

  const filtered = applications; // Filtering is handled by backend now

  return (
    <div className="flex bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-800 dark:text-gray-100">

      <HRSidebar />

      <div className="flex-1">

        <HRTopbar />

        <div className="p-2">

          <div className="flex justify-between items-center mb-3">

          </div>

          <HRApplicationsFilters
            search={search}
            setSearch={setSearch}
            status={status}
            setStatus={setStatus}
            view={view}
            setView={setView}
          />


          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500 dark:text-gray-400">Loading applications...</p>
            </div>
          ) : view === "kanban" ? (
            <HRApplicationsKanban
              applications={filtered}
              updateStatus={updateStatus}
              onView={handleViewApplication}
            />
          ) : (
            <HRApplicationsTable
              applications={filtered}
              updateStatus={updateStatus}
              onView={handleViewApplication}
            />
          )}

        </div>
      </div>

      {selectedApplication && (
        <ApplicationViewModal
          application={selectedApplication}
          onClose={closeDrawer}
        />
      )}

    </div>
  );
}
