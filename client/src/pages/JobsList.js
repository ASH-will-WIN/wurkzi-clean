import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getJobs } from "../api/jobApi";
import { useAuth } from "../context/AuthContext";
import LazyJobImage from "../components/LazyJobImage";

const JobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        // Check if the error is related to onboarding requirement
        if (error.response?.data?.requiresOnboarding) {
          // Redirect worker to dashboard page which contains the Stripe onboarding component
          navigate("/dashboard");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-10 bg-slate-800 rounded-lg w-1/3 mb-8"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-slate-900 rounded-xl shadow-md p-6 border border-slate-800"
                >
                  <div className="h-6 bg-slate-800 rounded w-2/3 mb-4"></div>
                  <div className="h-32 bg-slate-800 rounded mb-4"></div>
                  <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
                  <div className="h-4 bg-slate-800 rounded w-3/4 mb-4"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-6 bg-slate-800 rounded-full w-20"></div>
                    <div className="h-8 bg-slate-800 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-wurkzi-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Available Jobs
          </h1>
          <p className="text-slate-400">
            Discover opportunities and apply for jobs that match your skills
          </p>
        </div>

        {jobs.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-slate-400">
                <span className="font-semibold text-wurkzi-400">
                  {jobs.length}
                </span>
                {jobs.length === 1 ? " job" : " jobs"} available
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Click on any job to view full details and apply
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="block group hover:scale-[1.02] transition-transform duration-200"
                >
                  <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 hover:border-slate-700 hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                    {/* Lazy Loaded Image Preview */}
                    <LazyJobImage job={job} />

                    {/* Content */}
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <h2 className="text-xl font-bold text-slate-100 group-hover:text-wurkzi-400 transition-colors duration-200">
                          {job.title}
                        </h2>
                        <span className="bg-emerald-500/10 text-emerald-400 text-sm font-semibold px-2.5 py-0.5 rounded border border-emerald-500/20">
                          ${job.price}
                        </span>
                      </div>

                      <p className="text-slate-400 leading-relaxed mb-4 line-clamp-3">
                        {job.initialDescription}
                      </p>

                      <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center text-sm text-slate-500">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Apply now
                        </div>

                        <div className="flex items-center text-wurkzi-400 font-medium group-hover:text-wurkzi-300">
                          View Details
                          <svg
                            className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="bg-slate-900 rounded-2xl shadow-lg p-12 max-w-lg mx-auto border border-slate-800">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-wurkzi-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 6V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                No Jobs Available
              </h3>
              <p className="text-slate-400 mb-6">
                There are currently no job postings available. Check back later
                for new opportunities!
              </p>
              {user?.user_metadata?.role === "HIRER" && (
                <Link
                  to="/jobs/new"
                  className="inline-flex items-center btn btn-primary"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Post Your First Job
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsList;
