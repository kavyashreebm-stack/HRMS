import React from "react";

export default function ActivityFeedCard() {

  const activities = [
    "You updated your resume",
    "Applied for UI Engineer",
    "Profile updated"
  ];

  return (

    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

      <h3 className="text-lg font-semibold mb-4">
        Activity Feed
      </h3>

      <div className="space-y-2">

        {activities.map((activity, i) => (

          <p
            key={i}
            className="text-sm text-gray-600"
          >
            {activity}
          </p>

        ))}

      </div>

    </div>

  );
}