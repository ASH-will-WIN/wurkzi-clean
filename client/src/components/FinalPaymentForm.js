import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";
import { createFinalPayment, confirmFinalPayment } from "../api/paymentApi";

// Load Stripe outside of the component to avoid re-creating on every render
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const FinalPaymentForm = ({ jobId, onPaymentComplete, jobPrice }) => {
  // const [amount, setAmount] = useState("");
  const [amount, setAmount] = useState(jobPrice || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);

  useEffect(() => {
    setAmount(jobPrice || 0);
  }, [jobPrice]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create the final payment
      const { payment, clientSecret: secret } = await createFinalPayment({
        jobId,
        amount: parseFloat(amount),
      });

      setCurrentPayment(payment);
      setClientSecret(secret);
      setShowPaymentForm(true);
    } catch (error) {
      console.error("Payment error:", error);
      const code = error.response?.data?.error;
      if (code === "worker_not_onboarded" || code === "worker_not_ready") {
        setError(
          "Worker is not ready to receive payouts. Ask them to complete Stripe onboarding."
        );
      } else {
        setError(error.response?.data?.message || "Failed to create payment");
      }
    } finally {
      setLoading(false);
    }
  };

  const onPaymentSuccess = async () => {
    try {
      // Confirm the payment in our database
      if (currentPayment) {
        await confirmFinalPayment(currentPayment.id);
      }

      setShowPaymentForm(false);
      setAmount("");
      setClientSecret(null);
      setCurrentPayment(null);

      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (error) {
      console.error("Failed to confirm payment:", error);
      setError(
        "Payment completed but failed to update status. Please contact support."
      );
    }
  };

  const onPaymentError = (errorMsg) => {
    setError(`Payment failed: ${errorMsg}`);
    setShowPaymentForm(false);
    setClientSecret(null);
    setCurrentPayment(null);
  };

  if (showPaymentForm && clientSecret) {
    return (
      <div className="bg-slate-900 rounded-lg shadow-md p-6 border border-slate-700">
        <h3 className="text-lg font-medium text-white mb-4">
          Final Payment
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Complete the payment to pay the worker for the completed job.
        </p>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm
            clientSecret={clientSecret}
            onPaymentSuccess={onPaymentSuccess}
            onPaymentError={onPaymentError}
            isFinalPayment={true}
            amount={currentPayment?.amount || amount}
          />
        </Elements>
      </div>
    );
  }

  console.log(jobPrice);

  return (
    <div className="bg-slate-900 rounded-lg shadow-md p-6 border border-slate-700">
      <h3 className="text-lg font-medium text-white mb-4">Final Payment</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider"
          >
            Payment Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-slate-400 text-xl font-bold">$</span>
            </div>
            <input
              type="number"
              id="amount"
              value={amount}
              readOnly
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full pl-10 pr-4 py-4 border-2 border-slate-700 rounded-xl bg-slate-800 text-white text-2xl font-bold cursor-not-allowed focus:outline-none"
              required
            />
          </div>
          <p className="text-sm text-slate-500 mt-2">
            The total agreed price. The 10% platform fee and any referral rewards
            are calculated securely when you create the payment.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 px-6 text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 ${loading
            ? "bg-slate-700 cursor-not-allowed opacity-50"
            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
            }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              <span>Preparing Payment...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Create Payment</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <p className="text-sm text-emerald-300">
          <strong>💡 Alternative Payment:</strong> You may use cash or an alternative payment method and transfer directly to the worker. The worker will verify once the payment has been complete in this case.
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          <strong>Note:</strong> This will create a secure card payment if you prefer not to use cash.
        </p>
      </div>
    </div>
  );
};

export default FinalPaymentForm;
