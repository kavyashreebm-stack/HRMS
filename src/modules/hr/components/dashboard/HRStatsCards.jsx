import React, { useEffect, useState } from "react";
import CountUp from "react-countup";
import { FileText, Users, Clock, CheckCircle } from "lucide-react";
import { getHRStats } from "../../../../api";

export default function HRStatsCards() {
  const [statsData, setStatsData] = useState({
    total_applications: 0,
    total_candidates: 0,
    pending_review: 0,
    onboarded: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getHRStats();
        setStatsData(response.data);
      } catch (err) {
        console.error("Failed to fetch HR stats:", err);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    {
      title: "Total Applications",
      value: statsData.total_applications,
      icon: FileText,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      title: "Total Candidates",
      value: statsData.total_candidates,
      icon: Users,
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Pending Review",
      value: statsData.pending_review,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
    },
    {
      title: "Selected / Onboarding",
      value: statsData.onboarded,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
          >
            {/* Icon */}
            <div
              className={`w-9 h-9 flex items-center justify-center rounded-lg ${stat.color}`}
            >
              <Icon size={18} />
            </div>

            {/* Title */}
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>

            {/* Value */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              <CountUp end={stat.value} duration={1.8} />
            </h2>
          </div>
        );
      })}
    </div>
  );
}