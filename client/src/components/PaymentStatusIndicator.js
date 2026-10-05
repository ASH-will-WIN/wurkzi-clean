import React, { useState, useEffect } from "react";
import { getPaymentsForJob } from "../api/paymentApi";

const PaymentStatusIndicator = ({ jobId, userRole = "worker", className = "" }) => {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        setLoading(true);
        const payments = await getPaymentsForJob(jobId);

        // Find the main payment (not deposit)
        const mainPayment = payments.find(p => p.amount > 5);
        setPayment(mainPayment);
      } catch (err) {
        console.error("Failed to fetch payment status:", err);
        setError("Failed to load payment status");
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchPaymentStatus();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className={`payment-indicator payment-processing ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        Loading payment status...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`payment-indicator payment-failed ${className}`}>
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  }

  if (!payment) {
    return (
      <div className={`payment-indicator payment-pending-action ${className}`}>
        <div className="flex items-center text-gray-500">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No payment recorded</span>
        </div>
      </div>
    );
  }

  const getPaymentDisplay = () => {
    const { status, amount, workerAmount, platformFee, depositRefund } = payment;

    switch (status?.toLowerCase()) {
      case "paid":
      case "completed":
        return {
          className: "payment-completed",
          icon: (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          emoji: "💰",
          title: userRole === "worker" ? "Payment Received!" : "Payment Sent!",
          description: userRole === "worker"
            ? `You received $${workerAmount}`
            : `Paid $${amount} (worker gets $${workerAmount}, platform fee $${platformFee})`
        };

      case "processing":
      case "pending":
        return {
          className: "payment-processing",
          icon: (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          ),
          emoji: "🔄",
          title: "Payment Processing",
          description: userRole === "worker"
            ? `$${workerAmount} payment is being processed`
            : `$${amount} payment is being processed`
        };

      case "failed":
      case "cancelled":
        return {
          className: "payment-failed",
          icon: (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          emoji: "❌",
          title: "Payment Failed",
          description: "Payment processing failed. Please contact support."
        };

      default:
        return {
          className: "payment-pending",
          icon: (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          emoji: "⏳",
          title: "Payment Pending",
          description: userRole === "worker"
            ? "Waiting for payment to be processed"
            : "Ready to process payment"
        };
    }
  };

  const paymentDisplay = getPaymentDisplay();

  return (
    <div className={`${paymentDisplay.className} ${className} animate-fade-in`}>
      <div className="flex items-center">
        {paymentDisplay.icon}
        <div className="flex-1">
          <div className="flex items-center">
            <span className="text-xl mr-2">{paymentDisplay.emoji}</span>
            <span className="font-semibold">{paymentDisplay.title}</span>
          </div>
          <div className="text-sm opacity-90 mt-1">
            {paymentDisplay.description}
          </div>
        </div>
      </div>

      {payment.status?.toLowerCase() === "paid" && (
        <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-current border-opacity-20">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium">Total Amount:</span>
              <div className="font-semibold">${parseFloat(payment.amount).toFixed(2)}</div>
            </div>
            {userRole === "worker" && (
              <div>
                <span className="font-medium">You Received:</span>
                <div className="font-semibold text-emerald-300">
                  ${parseFloat(payment.workerAmount).toFixed(2)}
                </div>
              </div>
            )}
            {userRole === "hirer" && (
              <>
                <div>
                  <span className="font-medium">Worker Gets:</span>
                  <div className="font-semibold">${payment.workerAmount}</div>
                </div>
                <div>
                  <span className="font-medium">Platform Fee:</span>
                  <div className="font-semibold">${payment.platformFee}</div>
                </div>
              </>
            )}
          </div>
          {payment.createdAt && (
            <div className="mt-2 text-xs opacity-75">
              Processed: {new Date(payment.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentStatusIndicator;