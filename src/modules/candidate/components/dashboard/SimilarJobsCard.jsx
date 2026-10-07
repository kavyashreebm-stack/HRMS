import React, { useState } from "react";
import {
  X,
  Briefcase,
  MapPin,
  Tag,
  Clock,
  Building2,
  ChevronRight,
  Star,
  Wrench
} from "lucide-react";

export default function SimilarJobsCard({ jobs = [], hasApplied = false }) {
  const [selectedJob, setSelectedJob] = useState(null);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-3xl shadow-lg border border-white/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white">
          {selectedJob ? "Job Details" : "Similar Jobs"}
        </h3>
        <div className="flex items-center gap-2">
          {selectedJob && (
            <button
              onClick={() => setSelectedJob(null)}
              className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              aria-label="Close job detail"
              title="Back to list"
            >
              <X size={15} />
            </button>
          )}
          {!selectedJob && hasApplied && jobs && jobs.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {jobs.length} Available
            </span>
          )}
        </div>
      </div>

      {/* ── JOB LIST ── */}
      {!selectedJob && (
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {!hasApplied ? (
            <div className="text-center p-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl mb-2 inline-block">
                <Briefcase size={28} className="text-gray-300 dark:text-gray-600 mx-auto" />
              </div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                Please Apply for a job to get similar jobs
              </p>
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <div className="text-center p-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl mb-2 inline-block">
                <Briefcase size={28} className="text-gray-300 dark:text-gray-600 mx-auto" />
              </div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                No matching positions right now in your department
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job, i) => (
                <div
                  key={job.id || i}
                  onClick={() => setSelectedJob(job)}
                  className="group p-3 bg-white dark:bg-gray-900/60 border border-gray-100/80 dark:border-gray-800 rounded-2xl hover:shadow-md transition-all duration-300 cursor-pointer shadow-sm hover:border-blue-200 dark:hover:border-blue-800"
                >
                  <div className="flex justify-between items-start text-[11px]">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-150 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {job.title}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {job.department || "AE Team"} • {job.location || "Office"}
                      </p>
                      {job.experience_range && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock size={9} /> {job.experience_range}
                        </p>
                      )}
                    </div>
                    <button className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                      <ChevronRight size={12} />
                    </button>
                  </div>
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {job.tags.slice(0, 2).map((tag, ti) => (
                        <span key={ti} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INLINE JOB DETAIL — shown inside the same card, fully scrollable ── */}
      {selectedJob && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">

          {/* Compact header banner */}
          <div className="bg-gradient-to-br from-[#0057B8] to-blue-700 rounded-2xl p-3 text-white">
            <div className="flex items-start gap-2">
              <div className="bg-white/20 p-2 rounded-xl shrink-0">
                <Briefcase size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-blue-200 text-[9px] font-bold uppercase tracking-wider mb-0.5">Job Opening</p>
                <h4 className="text-sm font-bold text-white leading-tight">{selectedJob.title}</h4>
                <div className="flex flex-wrap gap-2 mt-1 text-blue-100 text-[10px]">
                  {selectedJob.department && (
                    <span className="flex items-center gap-0.5"><Building2 size={9} /> {selectedJob.department}</span>
                  )}
                  {selectedJob.location && (
                    <span className="flex items-center gap-0.5"><MapPin size={9} /> {selectedJob.location}</span>
                  )}
                  {selectedJob.experience_range && (
                    <span className="flex items-center gap-0.5"><Clock size={9} /> {selectedJob.experience_range}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedJob.status === "open"
                  ? "bg-green-400/30 text-green-100 border border-green-400/40"
                  : "bg-red-400/30 text-red-100 border border-red-400/40"
                }`}>
                <Star size={8} />
                {selectedJob.status === "open" ? "Actively Hiring" : selectedJob.status}
              </span>
            </div>
          </div>

          {/* Description */}
          {selectedJob.description && (
            <div>
              <h5 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Job Description
              </h5>
              <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {selectedJob.description}
              </p>
            </div>
          )}

          {/* Required Skills */}
          {selectedJob.skills && (
            <div>
              <h5 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Wrench size={10} /> Required Skills
              </h5>
              <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {selectedJob.skills}
              </p>
            </div>
          )}

          {/* Tags */}
          {selectedJob.tags && selectedJob.tags.length > 0 && (
            <div>
              <h5 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Tag size={10} /> Tags
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {selectedJob.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}