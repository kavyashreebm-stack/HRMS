import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../../assets/images/AE_Logo.png";
import {
  HomeIcon, UserIcon, FileIcon,
  LogoutIcon
} from "../../../../assets/icons/AllIcons";
import { ArrowLeft, Users } from "lucide-react";

export default function CandidateSidebar({ activeTab, setActiveTab, isHRMode = false }) {
  const navigate = useNavigate();

  const menuItem = (id, Icon, label) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg transition ${activeTab === id
        ? "bg-red-500 text-white"
        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        }`}
    >
      <Icon size={22} />
      <span>{label}</span>
    </button>
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("loggedInUser");
    navigate("/");
  };

  return (
    <aside className="w-60 bg-white dark:bg-gray-900 h-screen flex flex-col shadow-sm sticky top-0">

      {/* Logo Section — click to go to landing page */}
      <div className="bg-red-500 p-4 border-b border-red-500">
        <button
          onClick={() => (isHRMode ? navigate("/hr/all-profiles") : navigate("/"))}
          className="bg-white rounded-lg flex items-center justify-center py-2 shadow-sm w-full hover:opacity-90 transition-opacity"
          title={isHRMode ? "Back to All Profiles" : "Go to Home"}
        >
          <img
            src={logo}
            alt="Company Logo"
            className="h-12 w-auto object-contain"
          />
        </button>
      </div>

      {/* Menu Section */}
      <div className="flex flex-col flex-1 p-4 space-y-2">
        {menuItem("home", HomeIcon, "Home")}
        {menuItem("profile", UserIcon, "Profile")}
        {menuItem("application", FileIcon, "Applications")}

        {/* HR Back button */}
        {isHRMode && (
          <button
            onClick={() => navigate("/hr/all-profiles")}
            className="mt-auto mb-2 flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg transition bg-[#0057B8] text-white hover:bg-blue-700 shadow-sm text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>All Profiles</span>
          </button>
        )}

        {/* 🔴 Bottom Logout */}
        <button
          onClick={handleLogout}
          className={`${isHRMode ? "" : "mt-auto"} flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg transition
                     bg-red-500 text-white hover:bg-gray-600 dark:hover:bg-gray-700 hover:text-white`}
        >
          <LogoutIcon size={22} />
          <span>Logout</span>
        </button>
      </div>

    </aside>
  );
}