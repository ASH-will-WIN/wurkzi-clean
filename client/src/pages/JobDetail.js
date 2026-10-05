import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getJobById, getJobImages, deleteJob } from "../api/jobApi";
import {
  createApplication,
  getApplicationsForJob,
  acceptApplication,
  rejectApplication,
  confirmApplicationDeposit,
} from "../api/applicationApi";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { createConversation } from "../api/messageApi";
import StatusBadge from "../components/StatusBadge";
import ImageGallery from "../components/ImageGallery";
import { getReviewsForJob, createReview } from "../api/reviewApi";
// Removed job-specific StartConversation import
// --- STRIPE IMPORTS ---
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "../components/CheckoutForm";
// --- Load Stripe outside of the component to avoid re-creating on every render ---
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
const JobDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  // --- NEW STATE FOR PAYMENT ---
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [pendingApplicationId, setPendingApplicationId] = useState(null);
  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const handleStartChat = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setStartingChat(true);
    setChatError("");

    try {
      const conversation = await createConversation({
        participantId: job.hirerId,
        jobId: job.id,
      });

      // Navigate to messages with conversation state
      navigate("/messages", {
        state: {
          conversationId: conversation.id,
        },
      });
    } catch (error) {
      setChatError("Failed to start chat. Please try again.");
      console.error("Error starting chat:", error);
    } finally {
      setStartingChat(false);
    }
  };

  const isHirer = user?.id === job?.hirerId;

  const fetchJobAndApps = async () => {
    try {
      setLoading(true);
      setImagesLoading(true);

      // Fetch job data first to check hirer status
      const jobData = await getJobById(id);
      setJob(jobData);
      if (jobData.status === "COMPLETED") {
        setReviews(await getReviewsForJob(id));
      }

      // Fetch applications and images in parallel
      const promises = [fetchJobImages(id)];
      if (user?.id === jobData.hirerId) {
        promises.push(getApplicationsForJob(id));
      }

      const results = await Promise.all(promises);

      if (user?.id === jobData.hirerId) {
        setApplications(results[1] || []);
      }
    } catch (error) {
      console.error("Failed to fetch job details:", error);
    } finally {
      setLoading(false);
      setImagesLoading(false);
    }
  };

  const canReview = job?.status === "COMPLETED" &&
    (job?.hirerId === user?.id || job?.applications?.some((app) => app.workerId === user?.id && app.status === "ACCEPTED"));
  const hasReviewed = reviews.some((review) => review.reviewerId === user?.id);

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const review = await createReview(id, { rating: reviewRating, comment: reviewComment });
      setReviews((current) => [...current, review]);
      setReviewComment("");
    } catch (error) {
      setReviewError(error.response?.data?.message || "Could not submit your review.");
    } finally {
      setReviewSubmitting(false);
    }
  };


  const fetchJobImages = async (jobId) => {
    try {
      setImagesLoading(true);
      const imageData = await getJobImages(jobId);
      setImages(imageData || []);
    } catch (error) {
      console.error("Failed to fetch job images:", error);
      setImages([]); // Set empty array on error
    } finally {
      setImagesLoading(false);
    }
  };
  useEffect(() => {
    fetchJobAndApps();
  }, [id, user]);
  // --- MODIFIED APPLICATION HANDLER ---
  const handleApply = async (e) => {
    e.preventDefault();

    if (!message || message.trim() === "") {
      alert("Please enter a reason for your application.");
      return;
    }

    if (/\d/.test(message)) {
      alert("Application messages cannot contain numbers. Please describe your experience without using digits.");
      return;
    }

    try {
      // Step 1: Create the application on your backend
      const applicationData = await createApplication({ jobId: id, message });
      if (applicationData.clientSecret) {
        setPendingApplicationId(applicationData.application.id);
        setClientSecret(applicationData.clientSecret);
        setShowPaymentForm(true);
      } else {
        alert("Application submitted using your $5 referral credit.");
        setMessage("");
        fetchJobAndApps();
      }
    } catch (error) {
      alert(
        `Error: ${error.response?.data?.message ||
        "Could not start application process."
        }`
      );
    }
  };
  const onPaymentSuccess = async () => {
    try {
      await confirmApplicationDeposit(pendingApplicationId);
      alert("Application submitted successfully! Check your dashboard for next steps.");
      setShowPaymentForm(false);
      setPendingApplicationId(null);
      setClientSecret(null);
      setMessage("");
      fetchJobAndApps();
    } catch (error) {
      setChatError(error.response?.data?.message || "We couldn't confirm the deposit yet. Please refresh your application status.");
    }
  };
  const onPaymentError = (errorMsg) => {
    alert(`Payment failed: ${errorMsg}`);
  };
  const handleAccept = async (appId) => {
    try {
      await acceptApplication(appId);
      // Show success message and refresh data
      fetchJobAndApps();
    } catch (error) {
      console.error("Failed to accept application:", error);
    }
  };
  const handleReject = async (appId) => {
    try {
      await rejectApplication(appId);
      // Show success message and refresh data
      fetchJobAndApps();
    } catch (error) {
      console.error("Failed to reject application:", error);
    }
  };

  const handleDeleteJob = async () => {
    if (window.confirm("Are you sure you want to delete this job? This will automatically refund all worker deposits and cannot be undone.")) {
      try {
        setLoading(true);
        await deleteJob(id);
        alert("Job deleted successfully.");
        navigate("/dashboard");
      } catch (error) {
        alert(error.response?.data?.message || "Failed to delete job.");
        setLoading(false);
      }
    }
  };
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen bg-slate-950">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-800 rounded w-1/4 mb-6"></div>
          <div className="h-20 bg-slate-800 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center min-h-screen bg-slate-950">
        <div className="text-slate-400">
          <h2 className="text-2xl font-semibold text-white mb-2">Job not found</h2>
          <p>The job you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const hasApplied = job?.applications?.some(
    (app) => app.workerId === user?.id && app.status !== "WITHDRAWN"
  );

  const currentUserApplication = job?.applications?.find(
    (app) => app.workerId === user?.id && app.status !== "WITHDRAWN"
  );


  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen bg-slate-950">
      {job.status === "COMPLETED" && (
        <div className="card p-6 mb-6 border border-emerald-500/30">
          <h2 className="text-xl font-semibold text-white mb-2">Job reviews</h2>
          {reviews.length > 0 && (
            <div className="space-y-3 mb-5">
              {reviews.map((review) => (
                <div key={review.id} className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-amber-400">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                  {review.comment && <p className="text-slate-300 mt-1">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
          {canReview && !hasReviewed ? (
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <label className="block text-slate-300">Your rating
                <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="ml-3 bg-slate-800 text-white rounded px-2 py-1">
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                </select>
              </label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} maxLength={1000} placeholder="Share your experience (optional)" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3" />
              {reviewError && <p className="text-red-400 text-sm">{reviewError}</p>}
              <button disabled={reviewSubmitting} className="btn btn-primary">{reviewSubmitting ? "Submitting..." : "Leave review"}</button>
            </form>
          ) : canReview ? <p className="text-slate-400">You have submitted your review for this job.</p> : <p className="text-slate-400">Reviews are available to the poster and accepted worker.</p>}
        </div>
      )}
      {/* Job Header */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {job.title}
            </h1>

            <p className="text-xl font-semibold text-emerald-400 mb-2">
              ${job.price}
              {job.estimatedTime && (
                <span className="text-slate-400 text-base font-normal ml-3">
                  • Est. {Math.floor(job.estimatedTime / 60) > 0 ? `${Math.floor(job.estimatedTime / 60)} hrs ` : ''}
                  {job.estimatedTime % 60 > 0 ? `${job.estimatedTime % 60} mins` : ''}
                </span>
              )}
            </p>

            <div className="flex items-center text-slate-400 mb-4">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isHirer || hasApplied
                ? `${job.address}, ${job.city}, ${job.state}`
                : `Restricted - ${job.city}, ${job.state}`}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={job.status} type="job" />
          {/* Report Job Button (Compliance) */}
          {user && (
            <button
              onClick={() => {
                const reason = window.prompt("Please provide a reason for reporting this job:");
                if (reason) {
                  import("../api/reportApi").then(({ createReport }) => {
                    createReport({ jobId: job.id, reason }).then(() => {
                      alert("Thank you. We have received your report and will review it shortly.");
                    }).catch(err => {
                      console.error(err);
                      alert("Failed to submit report.");
                    });
                  });
                }
              }}
              className="text-xs text-slate-500 hover:text-red-400 underline transition-colors"
            >
              Report Job
            </button>
          )}
        </div>
      </div>

      {/* Delete Job Button for Hirer */}
      {isHirer && job.status === "PENDING" && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleDeleteJob}
            className="btn btn-danger flex items-center bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 shadow-lg shadow-red-900/20"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Job
          </button>
        </div>
      )}

      {/* Location Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Switched card to span full width if overview is gone, or just kept location separate? 
            Original layout: 2 cols overview, 1 col location. 
            If I remove overview, location looks lonely. 
            Maybe move location to side of full description? 
            Or just keep Location as a single full width or separate card.
            Let's keep Location in the grid but make it full width or better yet, 
            put it above or below description.
            
            Actually, the user wants "one description". 
            Let's remove the "Job Overview" card entirely.
            And maybe make Location a small card or move it.
            
            Let's just keep Location card and maybe make it full width or 1/3 and leave space?
            Or better: Move Location into the sidebar of description if possible.
            
            Simplest: Remove Overview col, keep Location col.
            But Grid is 3 cols. 
            If I remove col-span-2, Location (1 col) will be left.
        */}

        <div className="md:col-span-3 card p-6 bg-slate-900 border border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Location
          </h2>
          <div className="space-y-1">
            <p className="text-white font-semibold">
              {job.city}, {job.state}
            </p>
            {job.generalLocation && (
              <p className="text-slate-400 text-sm italic">
                {job.generalLocation}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="card mb-6 p-8 bg-slate-900 border border-slate-800">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center border-b border-slate-800 pb-4">
          <svg className="w-6 h-6 mr-3 text-wurkzi-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Job Description
        </h2>
        <div className="prose max-w-none">
          <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
            {job.fullDescription}
          </p>
        </div>
      </div>

      <div className="card mb-6 p-6 bg-slate-900 border border-slate-800">
        <h2 className="text-xl font-bold text-white mb-2">Resources</h2>
        {job.providesResources ? (
          <p className="text-emerald-300">The poster will provide the resources needed for this job.</p>
        ) : (
          <>
            <p className="text-amber-300 mb-2">The worker will need to provide the following resources:</p>
            <p className="text-slate-300 whitespace-pre-wrap">{job.requiredResources}</p>
          </>
        )}
      </div>

      {/* Job Images Section */}
      {
        (images.length > 0 || imagesLoading) && (
          <div className="card mb-6">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-white">Job Images</h2>
              {imagesLoading && (
                <div className="flex items-center text-gray-500">
                  <svg
                    className="animate-spin w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading images...
                </div>
              )}
            </div>

            {isHirer || hasApplied ? (
              <ImageGallery images={images} className="mt-4" />
            ) : (
              <div className="text-center py-8">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <p className="text-slate-400 text-lg">Job images are restricted</p>
                <p className="text-slate-500 text-sm mt-1">
                  Your application must be accepted to view images
                </p>
              </div>
            )}
          </div>
        )
      }
      {
        isHirer ? (
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">
              Applications for this Job ({applications.length})
            </h3>

            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="border border-slate-700 rounded-lg p-5 bg-slate-800"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <svg
                              className="w-5 h-5 text-blue-600"
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              Worker Application
                            </p>
                            <p className="text-sm text-slate-500">
                              ID: {app.workerId.substring(0, 8)}...
                            </p>
                          </div>
                        </div>

                        {app.message && (
                          <div className="mt-3 p-3 bg-slate-900 rounded-md border border-slate-700">
                            <p className="text-sm text-slate-300">
                              <span className="font-medium text-white">
                                Message:
                              </span>{" "}
                              {app.message}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 text-sm text-slate-500">
                          Applied: {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="ml-4">
                        <StatusBadge status={app.status} type="application" />
                      </div>
                    </div>

                    {job.status === "PENDING" && app.status === "APPLIED" && (
                      <div className="flex space-x-3 pt-4 border-t border-slate-700">
                        <button
                          onClick={() => handleAccept(app.id)}
                          className="btn btn-success btn-sm"
                        >
                          Accept Application
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Reject Application
                        </button>
                        {/* Removed job-specific conversation button */}
                      </div>
                    )}

                    {app.status === "ACCEPTED" && (
                      <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-500/30 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg
                              className="w-5 h-5 text-emerald-400 mr-2"
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <p className="text-sm text-emerald-300 font-medium">
                              Application accepted! Waiting for worker to start
                              the job.
                            </p>
                          </div>
                          {/* Removed job-specific conversation button */}
                        </div>
                      </div>
                    )}

                    {app.status === "REJECTED" && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                        <div className="flex items-center">
                          <svg
                            className="w-5 h-5 text-red-400 mr-2"
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
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-sm text-red-300">
                            Application rejected. $5 deposit has been refunded.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="w-16 h-16 text-slate-700 mx-auto mb-4"
                  width="64"
                  height="64"
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
                <p className="text-slate-400 text-lg">No applications yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Applications will appear here when workers apply
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Add messaging button for workers who have already applied */}
            {!isHirer && hasApplied && (
              <div className="card mb-6">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-white">
                    Contact Job Client
                  </h3>
                </div>
                <div className="card-body">
                  <p className="text-slate-400 mb-4">
                    Have questions about this job? Message the client directly.
                  </p>
                  {/* Chat Button for workers who have applied */}
                  {user &&
                    user.id !== job?.hirerId &&
                    job?.status === "PENDING" && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleStartChat}
                          disabled={startingChat || !job}
                          className="btn btn-primary flex items-center"
                        >
                          {startingChat ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Starting Chat...
                            </>
                          ) : (
                            <>
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
                              Chat with Client
                            </>
                          )}
                        </button>
                      </div>
                    )}

                  {chatError && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-sm">{chatError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {job.status === "PENDING" && !showPaymentForm && !hasApplied && (
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-6">
                  Apply for this Job
                </h3>

                {/* Application Flow */}
                {!hasApplied && (
                  <>
                    {/* PROMINENT PAYMENT NOTICE */}
                    <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 rounded-xl p-5 mb-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-12 h-12 bg-amber-500/30 rounded-full flex items-center justify-center mr-4">
                          <svg
                            className="w-6 h-6 text-amber-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-amber-300 mb-2">
                            💰 $5 Refundable Deposit Required
                          </h4>
                          <p className="text-amber-200/80 mb-3">
                            To apply for this job, you must pay a <span className="font-bold text-white">$5 deposit</span> upfront.
                            Your application will only be submitted after payment is complete.
                          </p>
                          <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-sm text-slate-300 font-medium mb-2">What happens to your deposit:</p>
                            <ul className="text-sm text-slate-400 space-y-1">
                              <li className="flex items-center">
                                <svg className="w-4 h-4 text-emerald-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span><strong className="text-emerald-400">Refunded</strong> if your application is rejected</span>
                              </li>
                              <li className="flex items-center">
                                <svg className="w-4 h-4 text-emerald-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span><strong className="text-emerald-400">Platform Fee</strong> kept on successful job</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleApply} className="space-y-6">
                      <div>
                        <label className="block text-white font-medium mb-2">
                          Why are you a good fit for this job?
                        </label>
                        <textarea
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-4 focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[120px]"
                          placeholder="Tell the client about your experience and how you can help..."
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full btn btn-primary py-4 text-lg font-bold flex items-center justify-center transition-all bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none shadow-lg shadow-amber-900/20"
                      >
                        <svg
                          className="w-6 h-6 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                        Pay $5 Deposit & Apply
                      </button>

                      <p className="text-center text-xs text-slate-500">
                        You will be redirected to a secure payment page to complete your deposit.
                      </p>
                    </form>
                  </>
                )}
              </div>
            )}

            {hasApplied && (
              <div className="card p-6 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-6">
                <p className="text-amber-300 font-medium">
                  You have already applied for this job. Please wait for the hirer to review your application.
                </p>
              </div>
            )}

            {showPaymentForm && clientSecret && (
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-6">
                  Complete Your Payment
                </h3>
                <div className="mb-6">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center text-amber-400 mb-2">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium">
                        Almost there! Payment required to submit.
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Your application will <strong className="text-white">NOT be submitted</strong> until you complete the $5 deposit payment below.
                    </p>
                  </div>
                </div>

                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    clientSecret={clientSecret}
                    onPaymentSuccess={onPaymentSuccess}
                    onPaymentError={onPaymentError}
                  />
                </Elements>
              </div>
            )}

            {job.status !== "PENDING" && (
              <div className="card">
                <div className="text-center py-8">
                  <svg
                    className="w-16 h-16 text-slate-700 mx-auto mb-4"
                    width="40"
                    height="40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="text-slate-400 text-lg font-medium">
                    Applications Closed
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    This job is no longer accepting applications
                  </p>
                </div>
              </div>
            )}
          </>
        )
      }
    </div >
  );
};
export default JobDetail;
