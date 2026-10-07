import React from "react";
import { NotificationIcon } from "../../../../assets/icons/AllIcons";

export default function DashboardTopbar() {
  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">

      {/* Title */}
      <h1 className="text-xl font-semibold text-gray-800">
        Candidate Dashboard
      </h1>

      {/* Right Section */}
      <div className="flex items-center gap-4">

        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <NotificationIcon size={22} />

          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
            3
          </span>
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-red-500 text-white flex items-center justify-center rounded-full font-semibold">
            K
          </div>
          <span className="text-sm font-medium text-gray-700">
            Candidate
          </span>
        </div>

      </div>
    </div>
  );
}