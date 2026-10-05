import React, { useState, useEffect } from "react";
import {
  getMyApplications,
  getApplicationsForJob,
  acceptApplication,
  rejectApplication,
  withdrawApplication,
} from "../api/applicationApi";
import {
  getJobsByHirer,
  startJob,
  completeJob,
  deleteJob,
} from "../api/jobApi";
import { getPaymentsForJob, markJobPaidInCash, getWorkerEarnings } from "../api/paymentApi"; // Import getWorkerEarnings
import { connectApi } from "../api/connectApi";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import PaymentStatusIndicator from "../components/PaymentStatusIndicator";
import FinalPaymentForm from "../components/FinalPaymentForm";
import { useNavigate } from "react-router-dom";
import MessageCenter from "../components/MessageCenter";
import { getMyPayments } from "../api/paymentApi";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState("working"); // "working" or "hiring"
  const [applications, setApplications] = useState([]);
  const [hirerJobs, setHirerJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [targetUserIdForChat, setTargetUserIdForChat] = useState(null);
  const [targetJobIdForChat, setTargetJobIdForChat] = useState(null);
  const [totalEarnings, setTotalEarnings] = useState(0); // Add state for earnings

  // Disclaimer Modal State
  const [showScopeDisclaimer, setShowScopeDisclaimer] = useState(false);
  const [pendingStartJobId, setPendingStartJobId] = useState(null);

  // Unified Role: Check onboarding only if they are trying to do worker stuff?
  // We can just keep the check but make it non-blocking as per previous step.
  const needsStripeSetup = true; // Everyone might need it eventually

  useEffect(() => {
    const fetchData = async () => {
      // Check Stripe status
      try {
        const status = await connectApi.getStripeAccount();
        setStripeStatus(status);
      } catch (error) {
        console.error("Failed to fetch Stripe status:", error);
        setStripeStatus({ exists: false, error: true });
      } finally {
        setStripeLoading(false);
      }

      // Fetch ALL data (User can be both)
      await Promise.all([fetchWorkerData(), fetchHirerData()]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const fetchWorkerData = async () => {
    try {
      const [appData, earningsData] = await Promise.all([
        getMyApplications(),
        getWorkerEarnings(),
      ]);
      setApplications(appData);
      setTotalEarnings(earningsData.totalEarnings || 0);
    } catch (error) {
      console.error("Failed to fetch worker data:", error);
    }
  };

  const fetchHirerData = async () => {
    try {
      const data = await getJobsByHirer();
      setHirerJobs(data);
    } catch (error) {
      console.error("Failed to fetch hirer jobs:", error);
    }
  };

  const getPaymentStatus = async (jobId) => {
    try {
      const payments = await getPaymentsForJob(jobId);
      return payments.find((p) => p.type === "FINAL_PAYMENT" || p.amount > 5);
    } catch (error) {
      console.error("Failed to fetch payment status:", error);
      return null;
    }
  };

  const handleStartJob = (jobId) => {
    setPendingStartJobId(jobId);
    setShowScopeDisclaimer(true);
  };

  const confirmStartJob = async () => {
    if (!pendingStartJobId) return;

    try {
      await startJob(pendingStartJobId);
      fetchWorkerData();
      fetchHirerData();
    } catch (error) {
      console.error("Failed to start job:", error);
    } finally {
      setShowScopeDisclaimer(false);
      setPendingStartJobId(null);
    }
  };

  const handleCompleteJob = async (jobId) => {
    try {
      await completeJob(jobId);
      fetchWorkerData();
      fetchHirerData();
    } catch (error) {
      console.error("Failed to complete job:", error);
    }
  };

  const handleCashPayment = async (jobId) => {
    if (
      window.confirm(
        "Are you sure the client paid you in cash? This will mark the job as fully paid and complete."
      )
    ) {
      try {
        await markJobPaidInCash(jobId);
        fetchWorkerData();
        fetchHirerData();
      } catch (error) {
        console.error("Failed to mark as paid in cash:", error);
        alert("Failed to update status. Please try again.");
      }
    }
  };

  const handleAcceptApplication = async (applicationId) => {
    try {
      await acceptApplication(applicationId);
      fetchHirerData(); // Refresh to get updated status
    } catch (error) {
      console.error("Failed to accept application:", error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this job? This will automatically refund all worker deposits and cannot be undone."
      )
    ) {
      try {
        setLoading(true);
        await deleteJob(jobId);
        fetchHirerData();
      } catch (error) {
        alert(error.response?.data?.message || "Failed to delete job.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRejectApplication = async (applicationId) => {
    try {
      await rejectApplication(applicationId);
      fetchHirerData(); // Refresh to get updated status
    } catch (error) {
      console.error("Failed to reject application:", error);
    }
  };

  const handleWithdrawApplication = async (applicationId) => {
    if (
      window.confirm(
        "Are you sure you want to withdraw your application? Your $5 deposit will be refunded."
      )
    ) {
      try {
        await withdrawApplication(applicationId);
        fetchWorkerData(); // Refresh list
      } catch (error) {
        console.error("Failed to withdraw application:", error);
        alert("Failed to withdraw application. Please try again.");
      }
    }
  };

  const handleOpenChat = (userId, jobId = null) => {
    if (!userId) {
      console.error("handleOpenChat called with missing userId. JobId:", jobId);
      return;
    }
    console.log("Opening chat with user:", userId, "for job:", jobId);
    setTargetUserIdForChat(userId);
    setTargetJobIdForChat(jobId);
    // Use a slight delay to ensure state is updated before switching tabs
    setTimeout(() => {
      console.log("Switching to messages tab now...");
      setActiveTab("messages");
    }, 0);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      PENDING: "bg-yellow-900/30 text-amber-300 border border-amber-500/30",
      COMMITTED: "bg-blue-900/30 text-blue-300 border border-blue-500/30",
      IN_PROGRESS:
        "bg-orange-900/30 text-orange-300 border border-orange-500/30",
      COMPLETED:
        "bg-emerald-900/30 text-emerald-300 border border-emerald-500/30",
      CANCELLED: "bg-red-900/30 text-red-300 border border-red-500/30",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"
          }`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const getApplicationStatusBadge = (status) => {
    const statusColors = {
      APPLIED: "bg-blue-900/30 text-blue-300 border border-blue-500/30",
      ACCEPTED:
        "bg-emerald-900/30 text-emerald-300 border border-emerald-500/30",
      REJECTED: "bg-red-900/30 text-red-300 border border-red-500/30",
      WITHDRAWN: "bg-slate-800 text-slate-400 border border-slate-600",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"
          }`}
      >
        {status}
      </span>
    );
  };

  if (loading || stripeLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-800 rounded-lg w-1/4 mb-8 animate-slide-up"></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="card animate-fade-in bg-slate-900 border-slate-800"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/2 mb-2"></div>
                  <div className="h-16 bg-slate-800 rounded mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-6 bg-slate-800 rounded-full w-20"></div>
                    <div className="h-6 bg-slate-800 rounded-full w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Stripe Connect onboarding banner if needed (non-blocking)
  const showOnboardingBanner = needsStripeSetup && stripeStatus
    && !(stripeStatus.detailsSubmitted && stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled);

  const ViewSwitcher = () => (
    <div className="flex justify-center mb-8">
      <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/50 inline-flex shadow-lg backdrop-blur-sm">
        <button
          onClick={() => setViewMode("working")}
          className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${viewMode === "working"
            ? "bg-gradient-to-r from-wurkzi-600 to-wurkzi-500 text-white shadow-md shadow-wurkzi-500/20"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Find Work
        </button>
        <button
          onClick={() => setViewMode("hiring")}
          className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${viewMode === "hiring"
            ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Hire Talent
        </button>
      </div>
    </div>
  );

  if (viewMode === "working") {
    // Worker Dashboard
    const acceptedJobs = applications.filter(
      (app) => app.status === "ACCEPTED"
    );

    const activeAcceptedJobs = acceptedJobs.filter((app) => {
      const isCompleted = app.job.status === "COMPLETED";
      // Check if there is a PAID final payment (or cash payment)
      // Note: applicationController now returns job with payments included
      const isPaid = app.job.payments?.some(
        (p) =>
          p.status === "PAID" &&
          (p.amount > 5 || p.stripePaymentId.startsWith("CASH"))
      );
      return !(isCompleted && isPaid);
    });

    const pastAcceptedJobs = acceptedJobs.filter((app) => {
      const isCompleted = app.job.status === "COMPLETED";
      const isPaid = app.job.payments?.some(
        (p) =>
          p.status === "PAID" &&
          (p.amount > 5 || p.stripePaymentId.startsWith("CASH"))
      );
      return isCompleted && isPaid;
    });

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ViewSwitcher />

          {/* Job Scope Disclaimer Modal */}
          {showScopeDisclaimer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in relative overflow-hidden">
                {/* Decorative background blob */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-wurkzi-500/20 rounded-full blur-2xl"></div>

                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
                    <svg className="w-8 h-8 text-wurkzi-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">Scope of Work</h3>

                  <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      You are only required to perform the work that was explicitly outlined in the job description and <span className="font-bold text-white">nothing more</span>.
                    </p>
                  </div>

                  <p className="text-slate-400 text-xs mb-6">
                    By proceeding, you acknowledge that you understand your responsibilities and boundaries for this job.
                  </p>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowScopeDisclaimer(false)}
                      className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmStartJob}
                      className="flex-1 px-4 py-2 bg-wurkzi-600 hover:bg-wurkzi-500 text-white rounded-xl font-bold shadow-lg shadow-wurkzi-500/20 transition-all hover:-translate-y-0.5"
                    >
                      I Understand
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional Stripe Onboarding Banner */}
          {showOnboardingBanner && (
            <div className="mb-8 animate-fade-in">
              <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">Set up Payouts</h3>
                      <p className="text-slate-300 max-w-xl">
                        To receive payments directly to your bank account for card-paid jobs, you need to connect your payout details. Cash jobs rely on direct payment.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => window.location.href = "/onboarding"}
                    className="btn bg-white text-purple-900 hover:bg-slate-100 font-bold px-6 py-3 rounded-lg shadow-lg whitespace-nowrap transition-transform active:scale-95"
                  >
                    Connect Bank Account
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-wurkzi-400 to-purple-400 bg-clip-text text-transparent">
              My Accepted Jobs
            </h1>
            <p className="text-slate-400 mt-2">
              Track your job progress and payment status
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6 bg-slate-900 border border-slate-800 bg-gradient-to-br from-emerald-900/20 to-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-medium">Total Earnings</h3>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                ${totalEarnings.toFixed(2)}
              </p>
              <p className="text-sm text-emerald-400 font-medium">
                Lifetime Earnings
              </p>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl mb-8 w-fit border border-slate-800">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "overview"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "payments"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "messages"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
            >
              Messages
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === "overview" && (
              <div className="animate-fade-in">
                {activeAcceptedJobs.length === 0 &&
                  pastAcceptedJobs.length === 0 ? (
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
                      <p className="text-white text-xl font-semibold mb-3">
                        No accepted jobs yet
                      </p>
                      <p className="text-slate-400 mb-6">
                        Once clients accept your applications, they'll appear
                        here with payment tracking
                      </p>
                      <button
                        onClick={() => navigate("/jobs")}
                        className="btn btn-primary btn-lg"
                      >
                        Browse Available Jobs
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activeAcceptedJobs.map((application) => (
                      <div
                        key={application.id}
                        className="card card-hover bg-slate-900 border border-slate-700 shadow-lg"
                      >
                        {/* Prominent Payment Status Banner */}
                        <div className="mb-6 -m-6 p-4 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                          <PaymentStatusIndicator
                            jobId={application.job.id}
                            userRole="worker"
                            className="w-full"
                          />
                        </div>

                        <div className="card-header flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div>
                            <h2 className="text-xl font-semibold text-white">
                              {application.job.title}
                            </h2>
                            <div className="flex items-center text-slate-400 mt-1">
                              <svg
                                className="w-4 h-4 mr-1"
                                width="16"
                                height="16"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              {application.job.address}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <StatusBadge
                              status={application.job.status}
                              type="job"
                            />
                            <StatusBadge
                              status={application.status}
                              type="application"
                            />
                          </div>
                        </div>

                        <div className="card-body">
                          <p className="text-slate-300 leading-relaxed">
                            {application.job.initialDescription}
                          </p>

                          {application.message && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                              <div className="flex items-start">
                                <svg
                                  className="w-5 h-5 text-blue-400 mt-0.5 mr-3"
                                  width="20"
                                  height="20"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                                <div>
                                  <p className="font-medium text-blue-300 mb-1">
                                    Your Application Message
                                  </p>
                                  <p className="text-sm text-blue-300">
                                    {application.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="card-footer">
                          <h3 className="font-medium text-white mb-4 flex items-center">
                            <svg
                              className="w-5 h-5 mr-2 text-slate-400"
                              width="20"
                              height="20"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2z"
                              />
                            </svg>
                            Job Progress
                          </h3>

                          {application.job.status === "COMMITTED" && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                              <div className="flex items-start">
                                <svg
                                  className="w-6 h-6 text-blue-400 mt-1 mr-3"
                                  width="24"
                                  height="24"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <div className="flex-1">
                                  <p className="font-medium text-blue-300 mb-2">
                                    🎉 Application Accepted!
                                  </p>
                                  <p className="text-sm text-blue-300 mb-4">
                                    Your application has been accepted! You can
                                    now start the job when you're ready.
                                  </p>
                                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                    <button
                                      onClick={() =>
                                        handleStartJob(application.job.id)
                                      }
                                      className="btn btn-primary"
                                    >
                                      <svg
                                        className="w-4 h-4 mr-2"
                                        width="16"
                                        height="16"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1M4 16l4.586-4.586a2 2 0 012.828 0L16 16M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                                        />
                                      </svg>
                                      Start Job
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleOpenChat(
                                          application.job.hirerId,
                                          application.job.id
                                        )
                                      }
                                      className="btn btn-secondary btn-sm"
                                    >
                                      <svg
                                        className="w-4 h-4 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9 8a9.013 9.013 0 01-5.314-1.757l-3.42 1.026a.756.756 0 01-.932-.932l1.026-3.42A9.013 9.013 0 013 12c0-4.962 4.037-9 9-9s9 4.037 9 9z"
                                        />
                                      </svg>
                                      Open Messages
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {application.job.status === "IN_PROGRESS" && (
                            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg mb-4">
                              <div className="flex items-start">
                                <svg
                                  className="w-6 h-6 text-orange-400 mt-1 mr-3"
                                  width="24"
                                  height="24"
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
                                <div className="flex-1">
                                  <p className="font-medium text-orange-300 mb-2">
                                    🔄 Job In Progress
                                  </p>
                                  <p className="text-sm text-orange-200/80 mb-4">
                                    You're currently working on this job. Mark
                                    it as complete when you're finished.
                                  </p>
                                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                    <button
                                      onClick={() =>
                                        handleCompleteJob(application.job.id)
                                      }
                                      className="btn btn-success"
                                    >
                                      <svg
                                        className="w-4 h-4 mr-2"
                                        width="16"
                                        height="16"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      Mark as Complete
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleOpenChat(
                                          application.job.hirerId,
                                          application.job.id
                                        )
                                      }
                                      className="btn btn-primary btn-sm"
                                    >
                                      <svg
                                        className="w-4 h-4 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9 8a9.013 9.013 0 01-5.314-1.757l-3.42 1.026a.756.756 0 01-.932-.932l1.026-3.42A9.013 9.013 0 013 12c0-4.962 4.037-9 9-9s9 4.037 9 9z"
                                        />
                                      </svg>
                                      Open Messages
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {application.job.status === "COMPLETED" && (
                            <div className="p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-lg mb-4">
                              <div className="flex items-start">
                                <svg
                                  className="w-6 h-6 text-emerald-400 mt-1 mr-3"
                                  width="24"
                                  height="24"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <div className="flex-1">
                                  <p className="font-medium text-emerald-300 mb-2">
                                    🎉 Job Completed Successfully!
                                  </p>
                                  <p className="text-sm text-emerald-200/80 mb-4">
                                    Great work! The client will process the
                                    final payment. You'll receive the full
                                    payment amount.
                                  </p>
                                  <div className="bg-slate-800 rounded-lg p-4 border border-emerald-500/30 mb-4">
                                    <PaymentStatusIndicator
                                      jobId={application.job.id}
                                      userRole="worker"
                                      className="w-full"
                                    />
                                  </div>

                                  {/* Cash Payment Option */}
                                  {(!getPaymentStatus(application.job.id) ||
                                    getPaymentStatus(application.job.id)
                                      ?.status !== "PAID") && (
                                      <div className="mt-2">
                                        <button
                                          onClick={() =>
                                            handleCashPayment(application.job.id)
                                          }
                                          className="btn bg-emerald-600 text-white hover:bg-emerald-700 w-full sm:w-auto"
                                        >
                                          Client Paid in Cash or Other Method
                                        </button>
                                        <p className="text-xs text-emerald-400 mt-2">
                                          Click this if the client has paid you
                                          directly via cash or another method to
                                          mark the job as fully complete.
                                        </p>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white mb-1">
                                💳 Deposit Status
                              </span>
                              <div className="flex items-center">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${application.depositStatus === "CAPTURED"
                                    ? "bg-emerald-900/30 text-emerald-300 border border-emerald-500/30"
                                    : application.depositStatus === "REFUNDED"
                                      ? "bg-blue-900/30 text-blue-300 border border-blue-500/30"
                                      : "bg-yellow-900/30 text-amber-300 border border-amber-500/30"
                                    }`}
                                >
                                  {application.depositStatus === "CAPTURED" &&
                                    "✅"}
                                  {application.depositStatus === "REFUNDED" &&
                                    "💰"}
                                  {application.depositStatus === "PENDING" &&
                                    "⏳"}
                                  <span className="ml-1">
                                    {application.depositStatus}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-white mb-1">
                                📅 Applied Date
                              </span>
                              <div className="text-slate-400 font-medium">
                                {new Date(
                                  application.createdAt
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Contact Client Section */}
                          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div>
                                <h4 className="font-medium text-blue-300 mb-1">
                                  Need to contact the client?
                                </h4>
                                <p className="text-sm text-blue-300">
                                  Send a message about this job
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  handleOpenChat(
                                    application.job.hirerId,
                                    application.job.id
                                  )
                                }
                                className="btn btn-primary btn-sm"
                              >
                                <svg
                                  className="w-4 h-4 mr-2"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9 8a9.013 9.013 0 01-5.314-1.757l-3.42 1.026a.756.756 0 01-.932-.932l1.026-3.42A9.013 9.013 0 013 12c0-4.962 4.037-9 9-9s9 4.037 9 9z"
                                  />
                                </svg>
                                Open Messages
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Past Jobs Section for Worker */}
                {pastAcceptedJobs.length > 0 && (
                  <div className="mt-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                      <svg
                        className="w-6 h-6 mr-2 text-gray-500"
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
                      Past Jobs
                    </h2>
                    <div className="opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
                      <div className="space-y-6">
                        {pastAcceptedJobs.map((application) => (
                          <div
                            key={application.id}
                            className="card bg-slate-900 border border-slate-700"
                          >
                            <div className="card-header flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                              <div>
                                <h2 className="text-xl font-semibold text-slate-300">
                                  {application.job.title}
                                </h2>
                                <div className="flex items-center text-green-700 mt-1 font-medium">
                                  <span className="mr-2">
                                    ✅ Completed & Paid
                                  </span>
                                  <span className="text-slate-500 text-sm">
                                    {new Date(
                                      application.job.updatedAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                                  Archived
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {applications.length > acceptedJobs.length && (
                  <div className="mt-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-gray-600"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      All Applications ({applications.length})
                    </h2>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {applications.map((application) => (
                        <div key={application.id} className="card card-hover">
                          <div className="card-header">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 text-sm">
                                {application.job.title}
                              </h3>
                              <div className="flex items-center text-gray-500 text-xs mt-1">
                                <svg
                                  className="w-3 h-3 mr-1"
                                  width="12"
                                  height="12"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                </svg>
                                {application.job.address}
                              </div>
                            </div>
                          </div>

                          <div className="card-body">
                            <div className="flex flex-wrap gap-2">
                              <StatusBadge
                                status={application.job.status}
                                type="job"
                              />
                              <StatusBadge
                                status={application.status}
                                type="application"
                              />
                            </div>
                          </div>

                          <div className="card-footer flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              Applied:{" "}
                              {new Date(
                                application.createdAt
                              ).toLocaleDateString()}
                            </div>
                            {application.status === "APPLIED" && (
                              <button
                                onClick={() =>
                                  handleWithdrawApplication(application.id)
                                }
                                className="btn btn-danger btn-xs"
                              >
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                )
              </div>
            )}

            {activeTab === "payments" && (
              <div className="animate-fade-in">
                <PaymentsList />
              </div>
            )}

            {activeTab === "messages" && (
              <div className="animate-fade-in">
                <MessageCenter
                  initialTargetUserId={targetUserIdForChat}
                  initialTargetJobId={targetJobIdForChat}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculate Active/Past Jobs for Hirer
  const activeHirerJobs = hirerJobs.filter((job) => {
    const isCompleted = job.status === "COMPLETED";
    // Check for 'PAID' status or a payments array with a PAID record
    const isPaid =
      job.status === "COMPLETED" &&
      job.payments?.some((p) => p.status === "PAID");
    // Actually the logic was: if completed AND paid -> Past. Else -> Active.
    // Simplification: Active = Not (Completed AND Paid)
    return !(isCompleted && isPaid);
  });

  const pastHirerJobs = hirerJobs.filter((job) => {
    const isCompleted = job.status === "COMPLETED";
    const isPaid = job.payments?.some((p) => p.status === "PAID");
    return isCompleted && isPaid;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ViewSwitcher />

        {/* Job Editing Policy Disclaimer */}
        <div className="mb-8 bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 flex items-start animate-fade-in">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-blue-300 font-medium text-sm mb-1">Job Editing Policy</h4>
            <p className="text-blue-200/80 text-sm">
              To protect the integrity of agreements with workers, <strong>jobs cannot be edited</strong> once posted.
              If you made a mistake or need to change details, please <strong className="text-white">delete the job</strong> and create a new one.
              This prevents "bait-and-switch" scenarios and ensures fairness.
            </p>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-700 to-wurkzi-700 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-slate-400 mt-2">
                Manage your jobs, payments, and messages
              </p>
            </div>
            <button
              onClick={() => navigate("/jobs/new")}
              className="btn btn-primary flex items-center"
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
              Post a Job
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl mb-8 w-fit border border-slate-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "overview"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "payments"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
          >
            Payments
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "messages"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
          >
            Messages
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === "overview" && (
            <div className="animate-fade-in">
              {activeHirerJobs.length === 0 && pastHirerJobs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-slate-900 rounded-2xl shadow-lg p-12 max-w-lg mx-auto border border-slate-700">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg
                        className="w-10 h-10 text-purple-600"
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
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Jobs Yet
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Post a job to get started!
                    </p>
                    <button
                      onClick={() => navigate("/jobs/new")}
                      className="btn btn-primary"
                    >
                      Create Job
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {activeHirerJobs.map((job) => (
                      <HirerJobCard
                        key={job.id}
                        job={job}
                        selectedJob={selectedJob}
                        setSelectedJob={setSelectedJob}
                        onAcceptApplication={handleAcceptApplication}
                        onRejectApplication={handleRejectApplication}
                        onDeleteJob={handleDeleteJob}
                        onPaymentComplete={() => fetchHirerData()} // Refresh data after payment
                        onOpenChat={handleOpenChat}
                      />
                    ))}
                  </div>

                  {pastHirerJobs.length > 0 && (
                    <div className="mt-12">
                      <h2 className="text-xl font-bold text-slate-300 mb-6">
                        Past Jobs
                      </h2>
                      <div className="space-y-4 opacity-75">
                        {pastHirerJobs.map((job) => (
                          <HirerJobCard key={job.id} job={job} readOnly />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "payments" && (
            <div className="animate-fade-in">
              <PaymentsList />
            </div>
          )}

          {activeTab === "messages" && (
            <div className="animate-fade-in">
              <MessageCenter
                initialTargetUserId={targetUserIdForChat}
                initialTargetJobId={targetJobIdForChat}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Sub-components to keep file clean ---

const HirerJobCard = ({
  job,
  selectedJob,
  setSelectedJob,
  onAcceptApplication,
  onRejectApplication,
  onDeleteJob,
  onPaymentComplete,
  onOpenChat,
  readOnly,
}) => {
  const navigate = useNavigate();
  const isExpanded = selectedJob === job.id;

  return (
    <div
      className={`card bg-slate-900 border border-slate-700 transition-all ${readOnly ? "grayscale hover:grayscale-0" : ""
        }`}
    >
      <div className="card-header flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
          <p className="text-slate-400 text-sm">{job.address}</p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={job.status} type="job" />
            <span className="text-xs text-slate-500">
              {job.applications?.length || 0} applications
            </span>
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            {job.status === "PENDING" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteJob(job.id);
                }}
                className="btn btn-danger btn-xs py-1 px-2 flex items-center bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-500 hover:text-white transition-all duration-200"
                title="Delete Job"
              >
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            )}
            <button
              onClick={() => setSelectedJob(isExpanded ? null : job.id)}
              className="btn btn-secondary btn-sm"
            >
              {isExpanded ? "Hide" : "View"}
            </button>
          </div>
        )}
      </div>

      {/* Only show body/actions if expanded */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-800">
          <div className="prose prose-invert max-w-none text-slate-300 text-sm mb-6">
            {job.fullDescription || job.initialDescription}
          </div>

          {/* Applications List */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-200">Applications</h4>
            {job.applications?.length === 0 ? (
              <p className="text-slate-500 text-sm italic">
                No applications yet.
              </p>
            ) : (
              job.applications?.map((app) => (
                <div
                  key={app.id}
                  className="bg-slate-800 p-3 rounded-lg border border-slate-700"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-white">
                      Worker Application
                    </span>
                    <StatusBadge status={app.status} type="application" />
                  </div>
                  <p className="text-slate-400 text-sm mb-3">{app.message}</p>

                  {app.status === "APPLIED" && job.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAcceptApplication(app.id)}
                        className="btn btn-success btn-xs"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => onRejectApplication(app.id)}
                        className="btn btn-danger btn-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {app.status === "ACCEPTED" && (
                    <div className="text-xs text-emerald-400 mt-2">
                      You accepted this application.
                      <button
                        onClick={() => onOpenChat(app.workerId, job.id)}
                        className="text-blue-400 ml-2 hover:underline"
                      >
                        Message Worker
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Payment Action if Completed */}
          {job.status === "COMPLETED" && (
            <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-800 rounded-lg">
              <h4 className="font-medium text-emerald-400 mb-2">
                Job Completed!
              </h4>
              <p className="text-slate-400 text-sm mb-4">
                Review the work and release final payment.
              </p>
              <FinalPaymentForm
                jobId={job.id}
                jobPrice={job.price}
                onPaymentComplete={onPaymentComplete}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PaymentsList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const data = await getMyPayments();
        setPayments(data);
      } catch (error) {
        console.error("Failed to load payments", error);
      } finally {
        setLoading(false);
      }
    };
    loadPayments();
  }, []);

  if (loading)
    return (
      <div className="text-center py-8 text-slate-400">Loading payments...</div>
    );
  if (payments.length === 0)
    return (
      <div className="text-center py-8 text-slate-400">
        No payment history found.
      </div>
    );

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center"
        >
          <div>
            <p className="text-white font-medium">
              {payment.job?.title || "Payment"}
            </p>
            <p className="text-slate-500 text-xs">
              {new Date(payment.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`block font-bold ${payment.status === "PAID"
                ? "text-emerald-400"
                : "text-amber-400"
                }`}
            >
              ${payment.amount}
            </span>
            <span className="text-xs text-slate-500 uppercase">
              {payment.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;

const StripeOnboardingCard = ({ stripeStatus }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStartOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      let onboardingUrl;

      if (stripeStatus.exists && stripeStatus.actionUrl) {
        // Account exists but needs completion
        onboardingUrl = stripeStatus.actionUrl;
      } else {
        // Create new account and get onboarding URL
        const result = await connectApi.createStripeAccountLink();
        onboardingUrl = result.onboardingUrl;
      }

      // Redirect to Stripe onboarding
      window.location.href = onboardingUrl;
    } catch (err) {
      console.error("Failed to start onboarding:", err);
      // Try to get the detailed message from our new error response format
      const serverMessage = err.response?.data?.message;
      const stripeError = err.response?.data?.raw_error?.message;
      const finalMessage =
        stripeError ||
        serverMessage ||
        "Failed to start onboarding. Please try again.";

      setError(finalMessage);
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (stripeStatus.error) {
      return "There was an error checking your account status.";
    }

    if (!stripeStatus.exists) {
      return "You need to set up a Stripe Connect account to receive payments and view available jobs.";
    }

    if (!stripeStatus.detailsSubmitted) {
      return "Your Stripe account setup is incomplete. Complete it now to start receiving payments and view available jobs.";
    }

    if (stripeStatus.requiresAction) {
      return "Your Stripe account requires additional information. Please complete the setup.";
    }

    if (!stripeStatus.payoutsEnabled) {
      return "Stripe is still reviewing your payout details. You can use Wurkzi while payout access is being confirmed.";
    }

    return "Setting up your payment account...";
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-700">
          <div className="text-center">
            <div className="bg-slate-800 rounded-full p-3 mx-auto mb-4 w-fit">
              <svg
                className="w-8 h-8 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">
              Complete Payment Setup
            </h2>

            <p className="text-slate-400 mb-6">{getStatusMessage()}</p>

            {stripeStatus.exists && (
              <div className="bg-slate-800 p-4 rounded-lg mb-6 text-left border border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">
                  Current Status:
                </h3>
                <div className="space-y-1 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Account Created:</span>
                    <span className="text-emerald-400">✓ Yes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Details Submitted:</span>
                    <span
                      className={
                        stripeStatus.detailsSubmitted
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {stripeStatus.detailsSubmitted ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Charges Enabled:</span>
                    <span
                      className={
                        stripeStatus.chargesEnabled
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {stripeStatus.chargesEnabled ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payouts Enabled:</span>
                    <span
                      className={
                        stripeStatus.payoutsEnabled
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {stripeStatus.payoutsEnabled ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleStartOnboarding}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting up...
                </div>
              ) : stripeStatus.exists ? (
                "Continue Setup"
              ) : (
                "Start Setup"
              )}
            </button>

            <p className="mt-4 text-xs text-gray-500">
              You'll be redirected to Stripe to securely complete your account
              setup. This is required to receive payments on the platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
