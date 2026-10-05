import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectApi } from "../api/connectApi";

const ConnectReturn = () => {
  const [status, setStatus] = useState("checking"); // checking, success, error
  const [message, setMessage] = useState("Checking your onboarding status...");
  const [accountStatus, setAccountStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Refresh the account status to get latest info
        const refreshResult = await connectApi.refreshStripeStatus();

        if (refreshResult.updated) {
          const statusData = refreshResult.status;
          setAccountStatus(statusData);

          if (statusData.detailsSubmitted && statusData.chargesEnabled) {
            setStatus("success");
            setMessage("Great! Your account setup is complete. You can now receive payments.");

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              navigate("/dashboard");
            }, 3000);
          } else if (statusData.detailsSubmitted && !statusData.chargesEnabled) {
            setStatus("pending");
            setMessage("Your information has been submitted and is being reviewed. You'll be notified when approved.");

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              navigate("/dashboard");
            }, 3000);
          } else {
            setStatus("incomplete");
            setMessage("Your onboarding is not yet complete. Please finish setting up your account.");
          }
        } else {
          throw new Error("Failed to refresh account status");
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setStatus("error");
        setMessage("There was an error checking your account status. Please try again.");
      }
    };

    checkStatus();
  }, [navigate]);

  const handleContinueSetup = async () => {
    try {
      const statusData = await connectApi.getStripeAccount();
      if (statusData.actionUrl) {
        window.location.href = statusData.actionUrl;
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error getting action URL:", error);
      setStatus("error");
      setMessage("Failed to continue setup. Please try again.");
    }
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  const getStatusIcon = () => {
    switch (status) {
      case "checking":
        return (
          <div className="animate-spin rounded-full w-8 h-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        );
      case "success":
        return (
          <div className="bg-green-100 rounded-full p-3 mx-auto mb-4 w-fit">
            <svg className="w-6 h-6 text-green-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "pending":
        return (
          <div className="bg-yellow-100 rounded-full p-3 mx-auto mb-4 w-fit">
            <svg className="w-6 h-6 text-yellow-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "incomplete":
        return (
          <div className="bg-orange-100 rounded-full p-3 mx-auto mb-4 w-fit">
            <svg className="w-6 h-6 text-orange-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case "error":
      default:
        return (
          <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-fit">
            <svg className="w-6 h-6 text-red-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
              {status === "checking" && "Checking Status..."}
              {status === "success" && "Setup Complete!"}
              {status === "pending" && "Review in Progress"}
              {status === "incomplete" && "Setup Incomplete"}
              {status === "error" && "Something Went Wrong"}
            </h2>

            <p className="text-slate-400 mb-6">{message}</p>

            {accountStatus && (
              <div className="bg-slate-800 p-4 rounded-lg mb-6 text-left border border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">Account Status:</h3>
                <div className="space-y-1 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Details Submitted:</span>
                    <span className={accountStatus.detailsSubmitted ? "text-green-600" : "text-red-600"}>
                      {accountStatus.detailsSubmitted ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Charges Enabled:</span>
                    <span className={accountStatus.chargesEnabled ? "text-green-600" : "text-red-600"}>
                      {accountStatus.chargesEnabled ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payouts Enabled:</span>
                    <span className={accountStatus.payoutsEnabled ? "text-green-600" : "text-red-600"}>
                      {accountStatus.payoutsEnabled ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {status === "incomplete" && (
                <button
                  onClick={handleContinueSetup}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Continue Setup
                </button>
              )}

              {(status === "success" || status === "pending") && (
                <div className="text-sm text-slate-500">
                  Redirecting to dashboard in 3 seconds...
                </div>
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

export default ConnectReturn;