import React from "react";
import StatsCard from "./StatsCard";
import NotificationsCard from "./NotificationsCard";
import SimilarJobsCard from "./SimilarJobsCard";
import ProfileStatusCard from "./ProfileStatusCard";
import { FileText, Calendar, Award } from "lucide-react";

export default function DashboardHome({ data, onMarkAllRead, onMarkOneRead }) {
  if (!data) return null;

  const { stats, progress, notifications, similar_jobs } = data;

  return (
    <div className="h-full flex flex-col space-y-4 pb-2">
      {/* Stats - Shrink-0 keeps it from collapsing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <StatsCard
          title="Applications"
          value={stats.applications_applied}
          icon={FileText}
          color="blue"
        />

        <StatsCard
          title="Interviews"
          value={stats.interviews_scheduled}
          icon={Calendar}
          color="purple"
        />

        <StatsCard
          title="Offers"
          value={stats.offers_received}
          icon={Award}
          color="green"
        />
      </div>

      {/* Main Section - Stretched to fill page */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Notifications - Flexible height with min-h-0 */}
        <div className="lg:col-span-2 min-h-0 flex flex-col">
          <NotificationsCard
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onMarkOneRead={onMarkOneRead}
          />
        </div>

        {/* Right Side - Stacked cards */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="min-h-0 flex-1">
            <SimilarJobsCard jobs={similar_jobs} hasApplied={stats.applications_applied > 0} />
          </div>

          <div className="shrink-0">
            <ProfileStatusCard
              completion={progress.profile_percentage}
              applicationCompletion={progress.application_percentage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}