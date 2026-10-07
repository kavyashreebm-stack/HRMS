import React, { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, FileText, UserPlus, LogOut, Briefcase, ScrollText } from "lucide-react";
import logo from "../../../../assets/images/AE_Logo.png";

export default function HRSidebar() {
  const navigate = useNavigate();

  // Strict HR Role Guard: Candidates cannot access HR information or data
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      const token = localStorage.getItem("token");
      if (!token || !user || user.role !== "HR") {
        navigate("/candidate-login");
      }
    } catch (e) {
      navigate("/candidate-login");
    }
  }, [navigate]);

  const menuItem = (path, Icon, label) => (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm transition ${isActive
          ? "bg-[#0057B8] text-white"
          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        }`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <aside className="w-60 bg-white dark:bg-gray-900 h-screen flex flex-col shadow-sm sticky top-0">

      {/* Logo Section */}
      <div className="bg-[#0057B8] p-4 border-b border-indigo-500">
        <div className="bg-white rounded-lg flex items-center justify-center py-3 shadow-sm">
          <img
            src={logo}
            alt="Company Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
      </div>

      {/* Menu */}
      <div className="flex flex-col flex-1 p-4 space-y-2">
        {menuItem("/hr/dashboard", LayoutDashboard, "Dashboard")}
        {menuItem("/hr/all-profiles", Users, "All Profiles")}
        {menuItem("/hr/all-applications", FileText, "All Applications")}
        {menuItem("/hr/job-postings", Briefcase, "Job Postings")}
        {menuItem("/hr/onboarding", UserPlus, "Onboarding")}
        {menuItem("/hr/appointment-letter", ScrollText, "Appointment Letter")}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm transition
                     bg-[#0057B8] text-white hover:bg-gray-700 dark:hover:bg-gray-800"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}