import React, { useState, useEffect } from "react";
import { Plus, Trash2, Briefcase, MapPin, Building2, Search, X, Loader2 } from "lucide-react";
import { getHRJobs, postJob, updateJob, deleteJob, getDepartments } from "../../../../api";
import { Input, Select, Textarea } from "../../../candidate/components/ui/FormElements";

export default function JobManagement() {
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newJob, setNewJob] = useState({
    title: "",
    department: "",
    location: "Bangalore",
    experience_range: "",
    description: "",
    skills: "",
    status: "OPEN"
  });

  // FETCH JOBS
  const fetchJobs = async () => {
    try {
      const response = await getHRJobs();
      setJobs(response.data);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedJob(null);
    setNewJob({
      title: "",
      department: "",
      location: "Bangalore",
      experience_range: "",
      description: "",
      skills: "",
      status: "OPEN"
    });
    setIsModalOpen(true);
  };

  // INITIAL LOAD
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        const [jobsResponse, deptResponse] = await Promise.all([
          getHRJobs(),
          getDepartments(),
        ]);

        setJobs(jobsResponse.data);

        setDepartments(
          deptResponse.data.map((dept) => ({
            label: dept.name,
            value: dept.name
          }))
        );

      } catch (err) {
        console.error("Failed to load setup data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // POST JOB
  const handlePostJob = async (e) => {
    e.preventDefault();

    if (!newJob.title || !newJob.department) {
      alert("Please fill in the required fields.");
      return;
    }

    try {
      setIsSubmitting(true);

      // ✅ FIX: sending skills + description correctly
      await postJob({
        title: newJob.title,
        department: newJob.department,
        location: newJob.location,
        experience_range: newJob.experience_range,
        description: newJob.description,
        skills: newJob.skills,
        status: newJob.status
      });



      setIsModalOpen(false);

      setNewJob({
        title: "",
        department: "",
        location: "Bangalore",
        experience_range: "",
        description: "",
        skills: "",
        status: "OPEN"
      });

      fetchJobs();

    } catch (err) {
      console.error("Failed to post job:", err);
      console.log("STATUS:", err.response?.status);
      console.log("DATA:", err.response?.data);

      alert(
        err.response?.data?.message ||
        "Error posting job. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      await updateJob(selectedJob.id, {
        title: newJob.title,
        department: newJob.department,
        location: newJob.location,
        experience_range: newJob.experience_range,
        description: newJob.description,
        skills: newJob.skills,
        status: newJob.status
      });

      setIsModalOpen(false);
      setIsEditMode(false);
      setSelectedJob(null);
      fetchJobs();

    } catch (err) {
      console.error("Failed to update job:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE JOB
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job posting?")) return;

    try {
      await deleteJob(jobId);
      fetchJobs();
    } catch (err) {
      console.error("Failed to delete job:", err);
    }
  };

  // FILTER JOBS
  const filteredJobs = jobs.filter((job) => {
    const title = job.title?.toLowerCase() || "";
    const department =
      job.department?.toLowerCase?.() ||
      job.department?.name?.toLowerCase?.() ||
      "";

    return (
      title.includes(searchQuery.toLowerCase()) ||
      department.includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-3 h-full flex flex-col space-y-6">


      {/* SEARCH + POST NEW JOB */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">

        {/* Search / Filter */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />

          <input
            type="text"
            placeholder="Search by title or department..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Post New Job */}
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-[#0057B8] text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 whitespace-nowrap"
        >
          <Plus size={20} />
          <span>Post New Job</span>
        </button>

      </div>


      {/* JOB LIST */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Loading jobs...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition group relative overflow-hidden cursor-pointer"
                onClick={() => {
                  setSelectedJob(job);
                  setIsEditMode(true);
                  setNewJob({
                    title: job.title || "",
                    department: job.department || "",
                    location: job.location || "",
                    experience_range: job.experience_range || "",
                    description: job.description || "",
                    skills: job.skills || "",
                    status: job.status || "OPEN"
                  });
                  setIsModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start">

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {job.title}
                      </h3>

                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${job.status === "OPEN"
                          ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                          : job.status === "FILLED"
                            ? "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                            : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                          }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2">

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 px-2 py-1 rounded-lg">
                        <Building2 size={14} />
                        {job.department}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 px-2 py-1 rounded-lg">
                        <MapPin size={14} />
                        {job.location}
                      </div>

                      {job.experience_range && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 px-2 py-1 rounded-lg">
                          <Briefcase size={14} />
                          {job.experience_range}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {job.skills
                        ? job.skills
                        : job.description || "No details provided."}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteJob(job.id);
                    }}
                    className="p-2 text-gray-350 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-2xl shadow-sm mb-4">
              <Briefcase size={40} className="text-gray-300 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">No Job Postings Found</h3>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => { setIsModalOpen(false); setIsEditMode(false); setSelectedJob(null); }}
          />

          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl z-10 overflow-hidden border dark:border-gray-700 flex flex-col max-h-[90vh]">

            <div className="p-6 border-b dark:border-gray-700 flex justify-between bg-[#0057B8] text-white shrink-0">
              <h2 className="text-xl font-bold">
                {isEditMode ? "Edit Job" : "Post New Job"}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setIsEditMode(false); setSelectedJob(null); }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={isEditMode ? handleUpdateJob : handlePostJob} className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800">

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-gray-850 dark:text-white">
                <Input
                  label="Job Title"
                  placeholder="Frontend Developer"
                  value={newJob.title}
                  onChange={(v) => setNewJob({ ...newJob, title: v })}
                />

                <Select
                  label="Department"
                  placeholder="Select Department"
                  options={departments}
                  value={newJob.department}
                  onChange={(v) => setNewJob({ ...newJob, department: v })}
                />

                <Input
                  label="Location"
                  value={newJob.location}
                  onChange={(v) => setNewJob({ ...newJob, location: v })}
                />

                <Input
                  label="Experience Range"
                  placeholder="0-2 years, 3-5 years"
                  value={newJob.experience_range}
                  onChange={(v) => setNewJob({ ...newJob, experience_range: v })}
                />

                <Select
                  label="Status"
                  options={[
                    { label: "Open", value: "OPEN" },
                    { label: "Closed", value: "CLOSED" }
                  ]}
                  value={newJob.status}
                  onChange={(v) => setNewJob({ ...newJob, status: v })}
                />

                <Textarea
                  label="Skills"
                  value={newJob.skills}
                  placeholder="React, TypeScript, UI/UX Design, Responsive Web Design, Figma."
                  onChange={(v) => setNewJob({ ...newJob, skills: v })}
                  rows={4}
                />

                <Textarea
                  label="Description (JD)"
                  value={newJob.description}
                  placeholder="
                              1) Develop and maintain user interfaces: Build responsive and visually appealing web pages using HTML5, CSS3, and JavaScript (ES6+).
  2) Integrate APIs: Connect front-end applications with back-end services by consuming APIs.
  3) Version control: Use Git/GitHub for code management and collaboration.
  4) Debug and troubleshoot: Assist in identifying and fixing bugs to maintain smooth functionality"

                  onChange={(v) => setNewJob({ ...newJob, description: v })}
                />
              </div>

              <div className="p-6 border-t dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    setSelectedJob(null);
                  }}
                  className="flex-1 px-6 py-2.5 rounded-xl border dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#0057B8] text-white px-6 py-2.5 rounded-xl"
                >
                  {isSubmitting
                    ? (isEditMode ? "Updating..." : "Posting...")
                    : (isEditMode ? "Update Job" : "Post Job")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}