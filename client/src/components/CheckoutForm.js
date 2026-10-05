// src/components/CheckoutForm.js

import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const CheckoutForm = ({ clientSecret, onPaymentSuccess, onPaymentError, isFinalPayment = false, amount = 5.00 }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError(null);

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      }
    );

    if (error) {
      setError(error.message);
      onPaymentError(error.message);
      setProcessing(false);
    } else if (
      paymentIntent.status === "succeeded" ||
      paymentIntent.status === "requires_capture"
    ) {
      // The 'requires_capture' status is what we expect for the deposit.
      onPaymentSuccess();
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: 'Inter, system-ui, sans-serif',
        "::placeholder": {
          color: "#94a3b8",
        },
      },
      invalid: {
        color: "#f87171",
      },
    },
  };

  const commonStyles = {
    cardContainer: "bg-slate-800 border-2 border-slate-700 rounded-xl p-6 mb-6 shadow-inner focus-within:border-wurkzi-500 transition-all duration-200",
    buttonBase: "w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed",
    icon: "w-6 h-6 mr-3"
  };

  if (isFinalPayment) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-2xl">💳</span>
          <h4 className="text-xl font-bold text-white">Complete Final Payment</h4>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Amount to charge:</span>
            <span className="text-2xl font-bold text-emerald-400">${amount}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center italic">
            Worker receives: ${Number(amount).toFixed(2)} (The worker gets the full amount)
          </p>
        </div>

        <div className={commonStyles.cardContainer}>
          <CardElement options={cardElementOptions} />
        </div>

        <button
          disabled={!stripe || processing}
          type="submit"
          className={`${commonStyles.buttonBase} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20`}
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <svg className={commonStyles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Pay ${amount}</span>
            </>
          )}
        </button>
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-shake">
            {error}
          </div>
        )}
      </form>
    );
  }

  // Default deposit payment form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">🛡️</span>
        <h4 className="text-xl font-bold text-white">Secure $5.00 Deposit</h4>
      </div>

      <div className={commonStyles.cardContainer}>
        <CardElement options={cardElementOptions} />
      </div>

      <button
        disabled={!stripe || processing}
        type="submit"
        className={`${commonStyles.buttonBase} bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20`}
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <svg className={commonStyles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Confirm & Submit Application</span>
          </>
        )}
      </button>
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </form>
  );
};

export default CheckoutForm;
