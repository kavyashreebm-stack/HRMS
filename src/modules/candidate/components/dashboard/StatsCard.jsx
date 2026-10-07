import React from "react";

export default function StatsCard({ title, value, icon: Icon, color = "blue" }) {

  const colors = {
    blue: "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400",
    green: "bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400"
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm
    flex items-center gap-4 hover:shadow-lg hover:scale-[1.06] transition-all duration-300">

      {Icon && (
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={18} />
        </div>
      )}

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>

    </div>
  );
}