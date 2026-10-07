import React, { useState, useEffect } from "react";
import { 
  getHRApplications, 
  getCandidateApplications 
} from "../../../api";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Loader2,
  Calendar,
  Briefcase
} from "lucide-react";

export default function DashboardStatus({ candidateId }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const response = await getCandidateApplications(candidateId);
        setApplications(response.data || []);
      } catch (err) {
        console.error("Failed to fetch applications:", err);
        setError("Failed to load application status list.");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [candidateId]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Applied": return "text-blue-600 bg-blue-50 border-blue-100";
      case "Application Reviewed": return "text-purple-600 bg-purple-50 border-purple-100";
      case "Interview Scheduled": return "text-orange-600 bg-orange-50 border-orange-100";
      case "Offered": return "text-green-600 bg-green-50 border-green-100";
      case "Onboarding": return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "Rejected": return "text-red-600 bg-red-50 border-red-100";
      default: return "text-gray-600 bg-gray-50 border-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Applied": return <Clock className="w-4 h-4" />;
      case "Offered": 
      case "Onboarding": return <CheckCircle2 className="w-4 h-4" />;
      case "Rejected": return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Application Tracking</h2>
          <p className="text-gray-500 text-sm mt-1">Track your progress and interview status</p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
          <span className="text-indigo-700 font-bold text-lg">{applications.length}</span>
          <span className="text-indigo-600 text-xs ml-2 font-medium">Total Applications</span>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No applications found.</p>
          <p className="text-gray-400 text-sm mt-1">Submit your first application to see it here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <div 
              key={app.id} 
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {app.job_title || app.designation || "Job Application"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <div className="flex items-center text-xs text-gray-500 gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(app.created_at).toLocaleDateString('en-GB').replace(/\//g, "-")}
                      </div>
                      <div className="text-xs text-gray-400 font-medium">
                        Dept: {app.department || "General"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black border flex items-center gap-2 ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                      {app.status}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 pr-2">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-gray-800">{app.status_percentage}%</span>
                    </div>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 ring-1 ring-white/50 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${app.status_percentage}%` }}
                      />
                    </div>
                  </div>

                  <button className="bg-gray-50 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-gray-400">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
