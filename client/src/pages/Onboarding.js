import React, { useEffect, useState } from "react";
import { connectApi } from "../api/connectApi";
import { useNavigate } from "react-router-dom";

const Onboarding = () => {
  const [loading, setLoading] = useState(true);
  const [stripeUrl, setStripeUrl] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const createOnboardingLink = async () => {
      try {
        const { onboardingUrl } = await connectApi.createStripeAccountLink();
        setStripeUrl(onboardingUrl);
        setLoading(false);
      } catch (err) {
        console.error("Failed to create onboarding link:", err);
        setError("Failed to create onboarding link. Please try again.");
        setLoading(false);
      }
    };

    createOnboardingLink();
  }, []);

  const handleContinue = () => {
    if (stripeUrl) {
      window.location.href = stripeUrl;
    }
  };

  if (loading) {
    return <div>Loading onboarding page...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="onboarding-page">
      <h1>Complete Stripe Connect Onboarding</h1>
      <p>
        To continue using Wurkzi as a worker or client, you need to complete
        your Stripe Connect onboarding. This will allow you to receive payments
        securely.
      </p>
      <div className="onboarding-actions">
        <button onClick={handleContinue} className="btn-primary">
          Continue to Stripe Onboarding
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
