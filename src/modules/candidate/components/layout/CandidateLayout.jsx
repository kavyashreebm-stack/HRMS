import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CandidateSidebar from "./CandidateSidebar";
import { ChevronDown, KeyRound, Eye, EyeOff, Lock, X, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { FILE_BASE_URL, changePassword } from "../../../../api";

export default function CandidateLayout({
  children,
  activeTab,
  setActiveTab,
  unreadCount,
  userName,
  photoUrl,
  onLogout,
  onGoToProfile,
  isHRMode = false
}) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Modal Form State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility states
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Force light mode on candidate side
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Build full photo URL
  const photoSrc = photoUrl
    ? (photoUrl.startsWith("http") ? photoUrl : `${FILE_BASE_URL}/${photoUrl.replace(/^\/uploads\//, "").replace(/^uploads\//, "")}`)
    : null;

  // Get initials from userName
  const getInitials = (name) => {
    if (!name) return "C";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      setSuccessMsg(response.data.message || "Password updated successfully!");
      // Reset form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Auto close after 2 seconds
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg("");
      }, 2000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const getHeaderContent = () => {
    switch (activeTab) {
      case "profile":
        return {
          title: "Candidate Profile",
          subtitle: isHRMode ? "Managing Candidate Profile on behalf of Candidate" : "Manage Your Profile Efficiently",
        };
      case "application":
        return {
          title: "Candidate Applications",
          subtitle: isHRMode ? "Apply and Track Job Applications on behalf of Candidate" : "Manage Your Applications Efficiently",
        };
      case "home":
      default:
        return {
          title: "Candidate Dashboard",
          subtitle: isHRMode ? "Viewing Workspace for Selected Candidate" : "Manage Your Dashboard Efficiently",
        };
    }
  };

  const headerContent = getHeaderContent();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100">

      {/* HR Banner if accessed from HR side */}
      {isHRMode && (
        <div className="bg-white text-black px-6 py-2.5 flex items-center justify-between shadow-md shrink-0 z-20">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-medium">
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              HR Mode
            </span>
            <span>
              Managing Workspace for: <strong className="font-bold">{userName}</strong>
            </span>
          </div>
          <button
            onClick={() => navigate("/hr/all-profiles")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to All Profiles
          </button>
        </div>
      )}

      <div className="flex flex-1 h-full overflow-hidden">
        {/* Sidebar */}
        <CandidateSidebar activeTab={activeTab} setActiveTab={setActiveTab} isHRMode={isHRMode} />

        {/* Right Section */}
        <div className="flex flex-col flex-1 h-full overflow-hidden">

          {/* Topbar */}
          <div className="h-24 bg-white dark:bg-gray-900 shadow-sm flex items-center justify-between px-8 shrink-0">

            {/* Left Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
                {headerContent.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {headerContent.subtitle}
              </p>
            </div>

            {/* Right — Avatar with Change Password Action */}
            <div className="relative">

              {/* Clickable Avatar Button */}
              <button
                onClick={() => setShowDropdown((prev) => !prev)}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl px-3 py-2 transition-all duration-200"
                aria-label="Open candidate settings"
              >
                {/* Photo or Initials Avatar */}
                <div className="relative">
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500 ring-offset-2 shadow-md"
                      onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                    />
                  ) : null}
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#0057B8] to-blue-400 text-white font-bold text-sm flex items-center justify-center ring-2 ring-blue-500 ring-offset-2 shadow-md ${photoSrc ? "hidden" : "flex"}`}
                  >
                    {getInitials(userName)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-white dark:ring-gray-900"></span>
                </div>

                {/* Name & Role */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">
                    {userName || "Candidate"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Active Candidate</p>
                </div>

                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {/* Settings Dropdown — only Change Password, no theme */}
              {showDropdown && (
                <div className="absolute right-0 top-full w-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowModal(true);
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-4 px-1 py-1 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
                    >
                      <KeyRound size={16} className="text-blue-500" />
                      Change Password
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden p-6">
            {children}
          </div>

        </div>

      </div>

      {/* Change Password Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full relative border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in duration-200">

            {/* Header */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 text-white relative">
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-3 rounded-2xl shrink-0">
                  <Lock size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-red-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">Security Settings</p>
                  <h3 className="text-xl font-bold text-white">Change Password</h3>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl text-xs font-semibold border border-red-100 dark:border-red-900/50">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-xl text-xs font-semibold border border-green-100 dark:border-green-900/50">
                  <CheckCircle size={16} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Old Password */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showOld ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-850 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-850 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-850 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}