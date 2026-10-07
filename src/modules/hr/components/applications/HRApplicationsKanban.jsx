import React, { useState } from "react";
import HRApplicationsCards from "./HRApplicationsCards";

export const columns = [
  { title: "Applied", color: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400" },
  { title: "Application Reviewed", color: "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400" },
  { title: "Interview Scheduled", color: "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400" },
  { title: "On Hold", color: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
  { title: "Offered", color: "bg-green-200 dark:bg-green-950/30 text-green-700 dark:text-green-400" },
  { title: "Onboarding", color: "bg-emerald-200 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" }
];

export const isStatusTransitionAllowed = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus || currentStatus === targetStatus) {
    return false;
  }

  // Strictly forward pipeline transitions:
  const allowedTransitions = {
    "Applied": ["Application Reviewed"],
    "Application Reviewed": ["Interview Scheduled"],
    "Interview Scheduled": ["On Hold", "Offered"],
    "On Hold": ["Offered"],
    "Offered": ["Onboarding"],
    "Onboarding": []
  };

  const allowedList = allowedTransitions[currentStatus] || [];
  return allowedList.includes(targetStatus);
};

export default function HRApplicationsKanban({ applications = [], updateStatus, onView }) {
  const [activeDropColumn, setActiveDropColumn] = useState(null);
  const [draggedApp, setDraggedApp] = useState(null);

  const handleDragOver = (e, columnTitle) => {
    const currentStatus = draggedApp?.status;
    const isAllowed = isStatusTransitionAllowed(currentStatus, columnTitle);

    if (!isAllowed) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDropColumn !== columnTitle) {
      setActiveDropColumn(columnTitle);
    }
  };

  const handleDragLeave = (e, columnTitle) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (activeDropColumn === columnTitle) {
      setActiveDropColumn(null);
    }
  };

  const handleDrop = (e, targetColumnTitle) => {
    e.preventDefault();
    setActiveDropColumn(null);

    let droppedData = null;
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (raw) {
        droppedData = JSON.parse(raw);
      }
    } catch (err) {
      console.error("Error parsing drag data:", err);
    }

    const appToUpdate = droppedData || draggedApp;

    if (appToUpdate && appToUpdate.id && updateStatus) {
      const isAllowed = isStatusTransitionAllowed(appToUpdate.status, targetColumnTitle);
      if (isAllowed) {
        updateStatus(appToUpdate.id, targetColumnTitle);
      }
    }
    setDraggedApp(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
      {columns.map((column) => {
        const columnApps = applications.filter((a) => a.status === column.title);
        const isCurrentDropTarget = activeDropColumn === column.title;
        const isEligibleTarget =
          draggedApp && isStatusTransitionAllowed(draggedApp.status, column.title);

        return (
          <div
            key={column.title}
            onDragOver={(e) => handleDragOver(e, column.title)}
            onDragLeave={(e) => handleDragLeave(e, column.title)}
            onDrop={(e) => handleDrop(e, column.title)}
            className={`bg-gray-50 dark:bg-gray-800/80 rounded-xl p-3 border transition-all duration-200 h-fit min-h-[90px] flex flex-col ${
              isCurrentDropTarget
                ? "border-blue-500 ring-2 ring-blue-400/50 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.005]"
                : isEligibleTarget
                ? "border-blue-300 dark:border-blue-700/60 border-dashed bg-blue-50/20 dark:bg-blue-950/10 shadow-sm"
                : "border-gray-200 dark:border-gray-700 shadow-sm"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/70 dark:border-gray-700/60">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                  {column.title}
                </h2>
                {isEligibleTarget && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium animate-pulse">
                    Next
                  </span>
                )}
              </div>

              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${column.color}`}>
                {columnApps.length}
              </span>
            </div>

            {/* Cards List / Drop Area */}
            <div className="space-y-2.5">
              {columnApps.map((app) => (
                <HRApplicationsCards
                  key={app.id}
                  app={app}
                  onView={onView}
                  onDragStart={(item) => setDraggedApp(item)}
                  onDragEnd={() => {
                    setDraggedApp(null);
                    setActiveDropColumn(null);
                  }}
                />
              ))}

              {columnApps.length === 0 && (
                <div
                  className={`py-3.5 px-2 rounded-lg border-2 border-dashed flex items-center justify-center text-xs transition-colors duration-150 ${
                    isCurrentDropTarget
                      ? "border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-900/20 font-medium"
                      : isEligibleTarget
                      ? "border-blue-300 text-blue-500 dark:text-blue-400 bg-blue-50/30"
                      : "border-gray-200 dark:border-gray-700/80 text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {isCurrentDropTarget
                    ? "Drop candidate here"
                    : isEligibleTarget
                    ? "Drop eligible here"
                    : "No applications"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}