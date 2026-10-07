import React from "react";

export default function ProfileStatusCard({
  completion = 75,
  applicationCompletion = 40,
  name = "Shiva"
}) {

  const radius = 18;
  const circumference = 2 * Math.PI * radius;

  const profileOffset = circumference - (completion / 100) * circumference;
  const applicationOffset =
    circumference - (applicationCompletion / 100) * circumference;

  const firstLetter = name.charAt(0).toUpperCase();

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-white/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300">

      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2">
        Status Overview
      </h3>

      <div className="space-y-2">

        {/* Profile Status */}
        <div className="flex items-center justify-between bg-white/50 dark:bg-gray-700/50 p-2 rounded-xl border border-white/60 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">
              Profile Status
            </span>
          </div>

          <div className="flex items-center gap-2">

            <div className="relative flex items-center justify-center">

              <svg width="36" height="36" className="transform -rotate-90">

                <circle
                  cx="18"
                  cy="18"
                  r={14}
                  stroke="#f3f4f6"
                  className="dark:stroke-gray-600"
                  strokeWidth="3"
                  fill="none"
                />

                <circle
                  cx="18"
                  cy="18"
                  r={14}
                  stroke="#22c55e"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={(2 * Math.PI * 14) - (completion / 100) * (2 * Math.PI * 14)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />

              </svg>

              <div className="absolute w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold shadow-sm">
                {firstLetter}
              </div>

            </div>

            <span className="text-xs font-bold text-green-600">
              {completion}%
            </span>

          </div>

        </div>


        {/* Application Status */}
        <div className="flex items-center justify-between bg-white/50 dark:bg-gray-700/50 p-2 rounded-xl border border-white/60 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">
              Application Status
            </span>
          </div>

          <div className="flex items-center gap-2">

            <div className="relative flex items-center justify-center">

              <svg width="36" height="36" className="transform -rotate-90">

                <circle
                  cx="18"
                  cy="18"
                  r={14}
                  stroke="#f3f4f6"
                  className="dark:stroke-gray-600"
                  strokeWidth="3"
                  fill="none"
                />

                <circle
                  cx="18"
                  cy="18"
                  r={14}
                  stroke="#6366f1"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={(2 * Math.PI * 14) - (applicationCompletion / 100) * (2 * Math.PI * 14)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />

              </svg>

              <div className="absolute w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] font-bold shadow-sm">
                A
              </div>

            </div>

            <span className="text-xs font-bold text-indigo-600">
              {applicationCompletion}%
            </span>

          </div>

        </div>

      </div>

    </div>

  );
}