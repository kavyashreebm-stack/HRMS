import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HRSidebar from "../components/layout/HRSidebar";
import HRTopbar from "../components/layout/HRTopbar";
import { UserPlus, Search, Eye, RefreshCw, UserCheck, Edit2, LayoutDashboard } from "lucide-react";
import CandidateProfilePreviewModal from "../components/CandidateProfilePreviewModal";
import { getAllCandidates, FILE_BASE_URL } from "../../../api";

const getFileUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  return `${FILE_BASE_URL}/${value.replace(/^\/?uploads\//, "").replace(/^\/+/, "")}`;
};

export default function HRAllProfiles() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [modalMode, setModalMode] = useState("preview");

  /* ✅ FETCH ALL CANDIDATE PROFILES */
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await getAllCandidates();
      setCandidates(response.data || []);
    } catch (err) {
      console.error("Failed to fetch candidate profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  /* ✅ Format Date to DD-MM-YYYY */
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  /* ✅ FILTER CANDIDATES */
  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q);
    const phoneMatch = c.phone_number?.toLowerCase().includes(q);
    const desigMatch = c.designation?.toLowerCase().includes(q);
    return nameMatch || emailMatch || phoneMatch || desigMatch;
  });

  return (
    <div className="flex bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-800 dark:text-gray-100">
      <HRSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HRTopbar />

        <div className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col">

          {/* Header + Filter + Actions - Single Line */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
            <div className="flex items-center gap-4 w-full">

              {/* Filter / Search */}
              <div className="relative flex-1 min-w-0">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="text"
                  placeholder="Search candidate by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#0057B8] transition text-sm"
                />
              </div>

              {/* Total Profiles */}
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-xl whitespace-nowrap">
                Total Profiles:{" "}
                <span className="text-[#0057B8] dark:text-blue-400 font-bold">
                  {filteredCandidates.length}
                </span>
              </div>

              {/* Create Candidate Profile */}
              <button
                onClick={() =>
                  navigate("/candidate/profile", {
                    state: { fromHR: true },
                  })
                }
                className="px-5 py-2.5 bg-[#0057B8] hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition shadow-md flex items-center gap-2 whitespace-nowrap"
              >
                <UserPlus size={16} />
                Create Candidate Profile
              </button>

              {/* Refresh */}
              <button
                onClick={fetchCandidates}
                className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition shadow-sm shrink-0"
                title="Refresh Candidates"
              >
                <RefreshCw size={16} />
              </button>

            </div>
          </div>

          {/* Candidates Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex-1 flex flex-col">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0057B8]"></div>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <UserCheck size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <p className="font-semibold text-base">No candidate profiles found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                      <th className="py-4 px-6">Candidate</th>
                      <th className="py-4 px-6">Date of Profile Created</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                    {filteredCandidates.map((c) => {
                      const initials = (c.name || "Candidate")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <tr
                          key={c.id || c.user_id}
                          className="hover:bg-blue-50/40 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          {/* Candidate Name & Info */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {c.photo_path ? (
                                <img
                                  src={getFileUrl(c.photo_path)}
                                  alt={c.name || "Candidate"}
                                  className="w-10 h-10 rounded-full object-cover border border-blue-200 dark:border-blue-900 shrink-0 shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0057B8] to-blue-400 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm uppercase">
                                  {initials}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                                  {c.name || "N/A"}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {c.email || c.phone_number || "No Contact Info"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Date of Profile Created */}
                          <td className="py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                            {formatDate(c.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedCandidate(c);
                                  setModalMode("preview");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0057B8] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                              >
                                <Eye size={14} />
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCandidate(c);
                                  setModalMode("edit");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  const targetId = c.user_id || c.id;
                                  navigate(`/candidate-dashboard?candidateId=${targetId}`, {
                                    state: {
                                      candidateId: targetId,
                                      candidate: c,
                                      fromHR: true,
                                    },
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                                title="Open Candidate Dashboard to Apply Jobs & Manage Applications"
                              >
                                <LayoutDashboard size={14} />
                                Dashboard
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7-Stepper Profile Detail Modal (Preview & Edit Modes) */}
      {selectedCandidate && (
        <CandidateProfilePreviewModal
          candidate={selectedCandidate}
          initialMode={modalMode}
          onClose={() => setSelectedCandidate(null)}
          onProfileUpdated={fetchCandidates}
        />
      )}
    </div>
  );
}
