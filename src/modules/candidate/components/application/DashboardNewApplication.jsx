import React, { useEffect, useState, useRef } from "react";
import NewApplicationForm from "./NewApplicationForm";
import ApplicationViewModal from "./ApplicationViewModal";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { applyForJob, getCandidateApplications } from "../../../../api";

export default function DashboardNewApplication({ currentUser, onView, setActiveTab, candidateId }) {
  const [applications, setApplications] = useState([]);
  const getUserId = () => {
    if (candidateId) return `candidate_${candidateId}`;
    if (currentUser?.id) return currentUser.id;
    try { return JSON.parse(localStorage.getItem("loggedInUser"))?.id; } catch (e) { }
    return "guest";
  };
  const [view, setView] = useState(() => localStorage.getItem(`app_view_${getUserId()}`) || "list");
  const [formData, setFormData] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [viewApp, setViewApp] = useState(null);
  const [viewAppIndex, setViewAppIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingApps, setLoadingApps] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(`app_view_${getUserId()}`, view);
  }, [view, candidateId]);

  useEffect(() => {
    const draftKey = `application_draft_${getUserId()}`;
    if (view === "create") {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          setFormData(JSON.parse(draft));
          setIsDirty(true);
        } catch (e) {
          console.error("Failed to parse application draft", e);
        }
      }
    }
  }, [view, candidateId]);

  useEffect(() => {
    const draftKey = `application_draft_${getUserId()}`;
    if (isDirty && Object.keys(formData).length > 0) {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }
  }, [formData, isDirty, candidateId]);

  /* ✅ FETCH APPLICATIONS FROM BACKEND */
  const fetchApps = async () => {
    setLoadingApps(true);
    try {
      const response = await getCandidateApplications(candidateId);
      setApplications(response.data || []);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [candidateId]);

  /* ✅ KEYBOARD NAVIGATION — use refs so the handler never goes stale */
  const navStateRef = useRef({ view, viewApp, applications, focusedIndex });
  useEffect(() => {
    navStateRef.current = { view, viewApp, applications, focusedIndex };
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const { view, viewApp, applications, focusedIndex } = navStateRef.current;
      if (view !== "list" || viewApp || applications.length === 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex(prev => (prev < applications.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : applications.length - 1));
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        setViewApp(applications[focusedIndex]);
        setViewAppIndex(focusedIndex);
      } else if (e.key === "Escape") {
        setFocusedIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // Register once, never re-register

  // Scroll focused card into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const cards = listRef.current.querySelectorAll("[data-app-card]");
      if (cards[focusedIndex]) {
        cards[focusedIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [focusedIndex]);


  /* ✅ SUBMIT APPLICATION */
  const handleSubmit = async () => {
    if (isSubmitting) return;

    const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!storedUser?.email) {
      alert("Session expired. Please login again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        department: formData.department,
        job_id: formData.job_id || null,
        experience_type: formData.experienceStatus,
        candidate_id: candidateId || undefined,
        other_details: {
          totalExperience: formData.totalExperience,
          availability: formData.availability,
          source: formData.referenceSource,
          referred: formData.referred,
          refName: formData.refName,
          refDept: formData.refDept,
          refMobile: formData.refMobile,
          aeBefore: formData.aeBefore,
          aeBeforeFrom: formData.aeBeforeFrom || null,
          aeBeforeTo: formData.aeBeforeTo || null,
          is18: formData.is18
        }
      };

      await applyForJob(payload);
      await fetchApps();
      setFormData({});
      setIsDirty(false);
      localStorage.removeItem(`application_draft_${getUserId()}`);
      alert("Application submitted successfully!");
      setView("list");
    } catch (err) {
      console.error("Submission failed:", err);
      const errorMsg = err.response?.data?.detail || "An error occurred while submitting. Please try again.";
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ✅ PREV / NEXT navigation in modal view */
  const handleViewPrev = () => {
    if (viewAppIndex > 0) {
      const newIdx = viewAppIndex - 1;
      setViewApp(applications[newIdx]);
      setViewAppIndex(newIdx);
    }
  };

  const handleViewNext = () => {
    if (viewAppIndex < applications.length - 1) {
      const newIdx = viewAppIndex + 1;
      setViewApp(applications[newIdx]);
      setViewAppIndex(newIdx);
    }
  };

  if (view === "create") {
    return (
      <NewApplicationForm
        formData={formData}
        setFormData={setFormData}
        isDirty={isDirty}
        setIsDirty={setIsDirty}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        onBack={() => setView("list")}
        setActiveTab={setActiveTab}
        candidateId={candidateId}
      />
    );
  }

  if (viewApp) {
    return (
      <div>
        {/* Navigation header for modal */}
        {applications.length > 1 && (
          <div className="flex items-center justify-between mb-4 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <button
              onClick={handleViewPrev}
              disabled={viewAppIndex <= 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-200"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-xs font-bold text-gray-500">
              Application {(viewAppIndex ?? 0) + 1} of {applications.length}
            </span>
            <button
              onClick={handleViewNext}
              disabled={viewAppIndex >= applications.length - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-200"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
        <ApplicationViewModal
          application={viewApp}
          onClose={() => { setViewApp(null); setViewAppIndex(null); }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">My Applications</h2>
          {applications.length > 1 && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">

            </p>
          )}
        </div>
        <button
          onClick={() => setView("create")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
        >
          + New Application
        </button>
      </div>

      {loadingApps ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex justify-center items-center h-full py-10">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-10 max-w-md w-full text-center">
            {/* Vector Illustration */}
            <div className="w-32 h-32 mx-auto mb-6 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-100/60 rounded-full scale-105" />
              <div className="relative w-24 h-24 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Stacked background paper */}
                  <rect x="20" y="8" width="30" height="42" rx="4" fill="#93C5FD" opacity="0.6" />
                  {/* Main document */}
                  <rect x="14" y="12" width="32" height="42" rx="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
                  {/* Top header strip */}
                  <path d="M14 16C14 13.7909 15.7909 12 18 12H42C44.2091 12 46 13.7909 46 16V22H14V16Z" fill="#3B82F6" />
                  <circle cx="21" cy="17" r="2" fill="#FFFFFF" />
                  {/* Content lines */}
                  <rect x="19" y="27" width="14" height="2.5" rx="1.25" fill="#60A5FA" />
                  <rect x="19" y="33" width="22" height="2.5" rx="1.25" fill="#E2E8F0" />
                  <rect x="19" y="38" width="18" height="2.5" rx="1.25" fill="#E2E8F0" />
                  <rect x="19" y="43" width="12" height="2.5" rx="1.25" fill="#CBD5E1" />
                  {/* Floating Action Badge */}
                  <circle cx="44" cy="44" r="11" fill="#0057B8" stroke="#FFFFFF" strokeWidth="2.5" />
                  <path d="M44 39V49M39 44H49" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              You haven't submitted any job applications. Start your career by applying today.
            </p>
          </div>
        </div>
      ) : (
        <div>
          {/* Application count */}
          <p className="text-xs text-gray-400 font-medium mb-3">
            {applications.length} application{applications.length > 1 ? "s" : ""}
          </p>

          {/* Scrollable list — max height so many apps don't push content */}
          <div
            ref={listRef}
            className="space-y-3 overflow-y-auto pr-1"
            style={{ maxHeight: "calc(100vh - 260px)" }}
          >
            {applications.map((app, idx) => (
              <div
                key={app.id}
                data-app-card
                className="shadow-sm border border-gray-200 p-4 rounded-lg flex justify-between items-center bg-white hover:border-2 hover:border-[#0057B8] hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  {/* Index indicator */}
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <p><strong>{app.candidate_profile?.name || "Candidate"}</strong></p>
                    <p className="text-sm text-gray-500">{app.job_title || app.department}</p>
                    <p className="text-sm text-gray-400">Status: {app.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setViewApp(app); setViewAppIndex(idx); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0057B8] text-white text-sm font-medium hover:bg-[#0046a3] transition"
                  >
                    <Eye size={16} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}