import React, { useState } from "react";
import {
  Bell,
  CheckCircle,
  UserPlus,
  AlertCircle,
  Calendar,
  Clock,
  Briefcase,
  User,
  Star,
  Check,
  X
} from "lucide-react";

export default function NotificationsCard({ notifications = [], onMarkAllRead, onMarkOneRead }) {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getIcon = (title, type) => {
    const t = title?.toLowerCase() || "";
    if (t.includes("application") || t.includes("job")) return Briefcase;
    if (t.includes("profile") || t.includes("personal") || t.includes("creation")) return User;
    if (t.includes("offer") || t.includes("selected")) return Star;
    if (t.includes("declaration") || t.includes("document") || t.includes("resume") || t.includes("photo")) return CheckCircle;
    if (t.includes("education")) return CheckCircle;
    if (t.includes("employment") || t.includes("bank") || t.includes("family") || t.includes("medical") || t.includes("reference") || t.includes("emergency")) return CheckCircle;
    if (t.includes("interview") || t.includes("schedule")) return Calendar;
    switch (type) {
      case "success": return CheckCircle;
      case "urgent": return AlertCircle;
      case "referral": return UserPlus;
      default: return Bell;
    }
  };

  const getCategory = (title) => {
    const t = title?.toLowerCase() || "";
    if (t.includes("application") || t.includes("job")) return "Application";
    if (t.includes("interview") || t.includes("schedule")) return "Interview";
    if (
      t.includes("personal") || t.includes("profile") || t.includes("creation") ||
      t.includes("education") || t.includes("employment") || t.includes("family") ||
      t.includes("medical") || t.includes("reference") || t.includes("emergency") ||
      t.includes("bank") || t.includes("section") || t.includes("missing")
    ) return "Profile";
    if (
      t.includes("declaration") || t.includes("document") || t.includes("resume") ||
      t.includes("photo") || t.includes("aadhar") || t.includes("pan") || t.includes("sslc")
    ) return "Declaration";
    return "System";
  };

  // Open preview and mark as read
  const handleOpenPreview = (note) => {
    setSelectedNotification(note);
    // Only mark as read if currently unread
    if (!note.is_read && onMarkOneRead) {
      onMarkOneRead(note.id);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-lg p-5 border border-white/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 h-full flex flex-col">

      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
            <Bell size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          Notifications
          {unreadCount > 0 && (
            <span className="ml-1 flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border dark:border-blue-900/40"
            >
              <Check size={12} />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {notifications.length} Total
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
        <div className="space-y-3 pb-2">
          {notifications.length > 0 ? (
            notifications.map((note) => {
              const Icon = getIcon(note.title, note.notification_type);
              const category = getCategory(note.title);
              const isUnread = !note.is_read;

              return (
                <div
                  key={note.id}
                  onClick={() => handleOpenPreview(note)}
                  className={`group relative flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 cursor-pointer border-l-4 ${
                    note.notification_type === "urgent"
                      ? "bg-red-50/30 dark:bg-red-950/20 border-l-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      : note.notification_type === "success"
                      ? "bg-green-50/30 dark:bg-green-950/20 border-l-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                      : "bg-white dark:bg-gray-900 border-l-blue-500 border dark:border-gray-800 dark:border-l-blue-500 shadow-sm hover:shadow-md"
                  } ${isUnread ? "ring-1 ring-blue-100/50 dark:ring-blue-900/30 shadow-blue-50" : "opacity-80 hover:opacity-100"}`}
                >
                  {/* Unread Dot Indicator */}
                  {isUnread && (
                    <div className="absolute top-4 right-4 h-2 w-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
                  )}

                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    note.notification_type === "urgent" ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400" :
                    note.notification_type === "success" ? "bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400" :
                    "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                  }`}>
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                          category === "Application" ? "text-purple-500" :
                          category === "Profile" ? "text-blue-500" :
                          category === "Interview" ? "text-orange-500" :
                          category === "Declaration" ? "text-emerald-500" : "text-gray-400"
                        }`}>
                          {category}
                        </span>
                        <p className={`text-sm font-bold truncate ${isUnread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                          {note.title}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2 flex items-center gap-1 pt-4">
                        <Clock size={10} />
                        {formatTime(note.created_at)}
                      </span>
                    </div>
                    <p className={`text-[12px] leading-relaxed line-clamp-2 ${isUnread ? "text-gray-600 dark:text-gray-300 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                      {note.message}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-40">
              <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-4">
                <Bell size={48} className="text-gray-300 dark:text-gray-500" />
              </div>
              <p className="text-sm font-bold text-gray-400 dark:text-gray-300">All caught up!</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No new notifications to show.</p>
            </div>
          )}
        </div>
      </div>

      {/* Card Preview Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 relative border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedNotification(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-all"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                selectedNotification.notification_type === "urgent" ? "bg-red-100 dark:bg-red-955/40 text-red-600 dark:text-red-400" :
                selectedNotification.notification_type === "success" ? "bg-green-100 dark:bg-green-955/40 text-green-600 dark:text-green-400" :
                "bg-blue-100 dark:bg-blue-955/40 text-blue-600 dark:text-blue-400"
              }`}>
                {React.createElement(getIcon(selectedNotification.title, selectedNotification.notification_type), { size: 24 })}
              </div>
              <div className="min-w-0 flex-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                  getCategory(selectedNotification.title) === "Application" ? "text-purple-500" :
                  getCategory(selectedNotification.title) === "Profile" ? "text-blue-500" :
                  getCategory(selectedNotification.title) === "Interview" ? "text-orange-500" :
                  getCategory(selectedNotification.title) === "Declaration" ? "text-emerald-500" : "text-gray-400"
                }`}>
                  {getCategory(selectedNotification.title)}
                </span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                  {selectedNotification.title}
                </h3>
                {/* Read status indicator */}
                <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-semibold mt-0.5">
                  <Check size={10} /> Read
                </span>
              </div>
            </div>

            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-4 mb-5 border border-gray-100/50 dark:border-gray-700 max-h-60 overflow-y-auto">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {selectedNotification.message}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-4">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatTime(selectedNotification.created_at)}
              </span>
              <button
                onClick={() => setSelectedNotification(null)}
                className="bg-[#0057B8] hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-md shadow-blue-100 text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}