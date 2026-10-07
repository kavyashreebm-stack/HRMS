import React, { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { getHRJobsOverview } from "../../../../api";

export default function HROpenJobsOverview() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await getHRJobsOverview();
        // Map backend structure to frontend structure and filter only jobs with applications
        const mappedJobs = response.data
          .filter(item => item.applicant_count > 0)
          .map(item => ({
            title: item.department.charAt(0).toUpperCase() + item.department.slice(1).replace("_", " "),
            dept: item.department.toUpperCase(),
            count: item.applicant_count
          }));
        setJobs(mappedJobs);
      } catch (err) {
        console.error("Failed to fetch jobs overview:", err);
      }
    };
    fetchJobs();
  }, []);

  return (
    <>
      <div className="bg-white/60 dark:bg-gray-800/65 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/40 dark:border-gray-700/40 h-full flex flex-col">

        <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
          <Briefcase size={20} />
          Open Jobs Overview
        </h2>

        <div className="flex-1 max-h-[300px] overflow-y-auto pr-2 custom-scroll snap-y snap-mandatory space-y-6">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center h-full">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-full mb-3">
                <Briefcase size={32} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <p className="font-medium text-gray-700 dark:text-gray-300">No active applications</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px] mx-auto">
                Open jobs will appear here once candidates start applying.
              </p>
            </div>
          ) : (
            jobs.map((job, index) => (
              <div
                key={index}
                className="snap-start flex justify-between items-center p-5 rounded-2xl shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700/50 min-h-[90px]"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded-xl">
                    <Briefcase size={18} className="text-indigo-500" />
                  </div>

                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-250">{job.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{job.dept}</p>
                  </div>
                </div>

                <span className="px-4 py-1 text-xs rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  {job.count} Applicants
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}