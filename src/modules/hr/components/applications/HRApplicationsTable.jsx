import React from "react";
import { Eye } from "lucide-react";
import { isStatusTransitionAllowed } from "./HRApplicationsKanban";

export default function HRApplicationsTable({ applications, updateStatus, onView }) {

  const getStatusColor = (status) => {
    switch (status) {
      case "Applied":
        return "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400";
      case "Application Reviewed":
        return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400";
      case "Interview Scheduled":
        return "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400";
      case "On Hold":
        return "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
      case "Offered":
        return "bg-green-200 dark:bg-green-950/30 text-green-700 dark:text-green-400";
      case "Onboarding":
        return "bg-emerald-200 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400";
      default:
        return "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-450";
    }
  };

  const statusFlow = [
    "Applied",
    "Application Reviewed",
    "Interview Scheduled",
    "On Hold",
    "Offered",
    "Onboarding",
  ];

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-xl shadow-md">

      <table className="min-w-full ">

        {/* HEADER */}
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm shadow-sm border-b dark:border-gray-800">
            <th className="px-4 py-3 text-left">Candidate</th>
            <th className="px-4 py-3 text-left">Job Applied</th>
            <th className="px-4 py-3 text-left">Date Applied</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-transparent">

          {applications.map((app) => (
            <tr
              key={app.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition shadow-sm text-gray-800 dark:text-gray-200 border-b dark:border-gray-800/50"
            >

              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                {app.candidate_profile?.name || "Unknown Candidate"}
              </td>

              <td className="px-4 py-3">{app.job}</td>

              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                {app.date}
              </td>

              {/* STATUS */}
              <td className="px-4 py-3">
                <select
                  value={app.status}
                  disabled={app.status === "Onboarding"}
                  onChange={(e) => updateStatus(app.id, e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm focus:outline-none ${getStatusColor(app.status)} ${
                    app.status === "Onboarding" ? "opacity-90 cursor-default" : "cursor-pointer"
                  }`}
                >
                  {statusFlow.map((status) => {
                    const isCurrent = status === app.status;
                    const isAllowed = isCurrent || isStatusTransitionAllowed(app.status, status);

                    return (
                      <option
                        key={status}
                        value={status}
                        disabled={!isAllowed}
                      >
                        {status} {isCurrent ? "(Current)" : ""}
                      </option>
                    );
                  })}
                </select>
              </td>

              {/* ACTION */}
              <td className="px-4 py-3">
                <button
                  onClick={() => onView && onView(app)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0057B8] text-white text-sm font-medium hover:bg-[#0046a3] transition cursor-pointer"
                >
                  <Eye size={16} />
                  View
                </button>
              </td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}