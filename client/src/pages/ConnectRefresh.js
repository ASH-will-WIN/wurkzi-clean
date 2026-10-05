import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectApi } from "../api/connectApi";

const ConnectRefresh = () => {
  const [status, setStatus] = useState("refreshing"); // refreshing, ready, error
  const [message, setMessage] = useState("Refreshing your onboarding session...");
  const [onboardingUrl, setOnboardingUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const refreshOnboarding = async () => {
      try {
        // Get fresh account status and onboarding link
        const statusData = await connectApi.getStripeAccount();

        if (statusData.detailsSubmitted && statusData.chargesEnabled) {
          // Already complete, go to dashboard
          setStatus("complete");
          setMessage("Your account setup is already complete!");
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } else if (statusData.actionUrl) {
          // Need to continue onboarding
          setStatus("ready");
          setMessage("Ready to continue your account setup.");
          setOnboardingUrl(statusData.actionUrl);

          // Auto-redirect after 3 seconds
          setTimeout(() => {
            window.location.href = statusData.actionUrl;
          }, 3000);
        } else {
          // Need to create new account
          const newAccount = await connectApi.createStripeAccountLink();
          setStatus("ready");
          setMessage("Ready to start your account setup.");
          setOnboardingUrl(newAccount.onboardingUrl);

          // Auto-redirect after 3 seconds
          setTimeout(() => {
            window.location.href = newAccount.onboardingUrl;
          }, 3000);
        }
      } catch (error) {
        console.error("Error refreshing onboarding:", error);
        setStatus("error");
        setMessage("There was an error refreshing your onboarding session. Please try again.");
      }
    };

    refreshOnboarding();
  }, [navigate]);

  const handleContinue = () => {
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
    }
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  const getStatusIcon = () => {
    switch (status) {
      case "refreshing":
        return (
          <div className="animate-spin rounded-full w-8 h-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        );
      case "ready":
        return (
          <div className="bg-blue-100 rounded-full p-3 mx-auto mb-4 w-fit">
            <svg className="w-6 h-6 text-blue-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      case "complete":
        return (
          <div className="bg-green-100 rounded-full p-3 mx-auto mb-4 w-fit">
            <svg className="w-6 h-6 text-green-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "error":
      default:
        return (
          <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-fit">
            <svg className="w-6 h-6 text-red-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-700">
          <div className="text-center">
            {getStatusIcon()}

            <h2 className="text-xl font-semibold text-white mb-4">
              {status === "refreshing" && "Refreshing Session..."}
              {status === "ready" && "Ready to Continue"}
              {status === "complete" && "Setup Complete!"}
              {status === "error" && "Refresh Failed"}
            </h2>

            <p className="text-slate-400 mb-6">{message}</p>

            {status === "ready" && onboardingUrl && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-400 mb-2">
                  Automatically redirecting in 3 seconds...
                </p>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {status === "ready" && onboardingUrl && (
                <button
                  onClick={handleContinue}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue Setup Now
                </button>
              )}

              {status === "complete" && (
                <div className="text-sm text-slate-500">
                  Redirecting to dashboard in 2 seconds...
                </div>
              )}

              {status === "error" && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try Again
                </button>
              )}

              <button
                onClick={handleGoToDashboard}
                className="w-full flex justify-center py-2 px-4 border border-slate-700 rounded-md shadow-sm text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wurkzi-500"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectRefresh;