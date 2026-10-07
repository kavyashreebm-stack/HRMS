import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import CandidateLayout from "../components/layout/CandidateLayout";
import DashboardProfile from "../components/DashboardProfile";
import DashboardHome from "../components/dashboard/DashboardHome";
import DashboardNewApplication from "../components/application/DashboardNewApplication";
import DashboardStatus from "../components/DashboardStatus";
import { getCandidateDashboard, markNotificationsAsRead, markSingleNotificationRead } from "../../../api";
import { Loader2 } from "lucide-react";


export default function CandidateDashboard({ currentUser }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get("candidateId") || location.state?.candidateId || null;

  const isHRMode = Boolean(candidateId) || location.state?.fromHR === true || (() => {
    try {
      return JSON.parse(localStorage.getItem("loggedInUser"))?.role === "HR";
    } catch (e) {
      return false;
    }
  })();

  const [activeTab, setActiveTab] = useState(() => {
    if (candidateId) {
      return localStorage.getItem(`candidate_active_tab_${candidateId}`) || "home";
    }
    return localStorage.getItem("candidate_active_tab") || "home";
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (candidateId) {
      localStorage.setItem(`candidate_active_tab_${candidateId}`, activeTab);
    } else {
      localStorage.setItem("candidate_active_tab", activeTab);
    }
  }, [activeTab, candidateId]);

  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await getCandidateDashboard(candidateId);
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Could not load dashboard information.");
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    const handleFocus = () => fetchDashboardData();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchDashboardData]);

  const handleMarkAllRead = async () => {
    try {
      setDashboardData(prev => ({
        ...prev,
        notifications: prev?.notifications?.map(n => ({ ...n, is_read: true })) || []
      }));
      await markNotificationsAsRead(candidateId);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
      fetchDashboardData();
    }
  };

  const handleMarkOneRead = async (notificationId) => {
    // Optimistically update UI
    setDashboardData(prev => ({
      ...prev,
      notifications: prev?.notifications?.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ) || []
    }));
    try {
      await markSingleNotificationRead(notificationId, candidateId);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("loggedInUser");
    window.location.href = "/";
  };

  const unreadCount = dashboardData?.notifications?.filter(n => !n.is_read).length || 0;

  useEffect(() => {
    const candidateName = dashboardData?.stats?.name || location.state?.candidate?.name;
    if (isHRMode && candidateName) {
      document.title = `${candidateName} | Candidate Workspace (HR)`;
    } else if (unreadCount > 0) {
      document.title = `(${unreadCount}) Candidate Dashboard`;
    } else {
      document.title = `Candidate Dashboard`;
    }
  }, [unreadCount, isHRMode, dashboardData?.stats?.name, location.state?.candidate?.name]);

  if (loading && !dashboardData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Loading Candidate Workspace...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
          <button 
            onClick={() => { setLoading(true); fetchDashboardData(); }}
            className="w-full bg-[#0057B8] text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // If no data yet, show a simplified blank home for safety
    if (!dashboardData && activeTab === "home") {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 className="animate-spin mb-4" />
                <p>Preparing candidate dashboard...</p>
            </div>
        );
    }

    switch (activeTab) {
      case "home":
        return (
          <DashboardHome
            data={dashboardData}
            onMarkAllRead={handleMarkAllRead}
            onMarkOneRead={handleMarkOneRead}
            refreshData={fetchDashboardData}
          />
        );

      case "profile":
        return <DashboardProfile candidateId={candidateId} />;

      case "application":
        return (
          <DashboardNewApplication
            currentUser={currentUser}
            setActiveTab={setActiveTab}
            candidateId={candidateId}
          />
        );

      case "status":
        return <DashboardStatus candidateId={candidateId} />;

      default:
        return <div>Home Content</div>;
    }
  };

  const displayName = dashboardData?.stats?.name || location.state?.candidate?.name || currentUser?.email?.split('@')[0] || "Candidate";
  const displayPhoto = dashboardData?.stats?.photo_url || location.state?.candidate?.photo_path || null;

  return (
    <CandidateLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      unreadCount={unreadCount}
      userName={displayName}
      photoUrl={displayPhoto}
      onLogout={handleLogout}
      isHRMode={isHRMode}
    >
      <div className="h-full overflow-hidden">
        {renderContent()}
      </div>
    </CandidateLayout>
  );
}