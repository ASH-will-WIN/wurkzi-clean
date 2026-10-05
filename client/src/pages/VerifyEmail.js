import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeEmailVerification, resendVerification } = useAuth();
  const [email, setEmail] = useState(location.state?.email || "");
  const [message, setMessage] = useState(location.state?.sent ? "Check your inbox for a confirmation link." : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const callbackError = params.get("error_description") || params.get("error");
    if (callbackError) {
      setError(callbackError.replace(/\+/g, " "));
      return;
    }
    if (!accessToken) return;

    let active = true;
    setBusy(true);
    completeEmailVerification(accessToken, refreshToken)
      .then(() => {
        if (active) navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.error || "This confirmation link is invalid or expired.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => { active = false; };
  }, [completeEmailVerification, navigate]);

  const handleResend = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await resendVerification(email);
      setMessage("If this account needs verification, a new confirmation email has been sent.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not resend the confirmation email.");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/50 bg-slate-900/70 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-wurkzi-500/15 text-2xl text-wurkzi-300" aria-hidden="true">✉</div>
        <h1 className="text-2xl font-bold text-white">Verify your email</h1>
        <p className="mt-3 text-slate-400">Open the confirmation link we emailed you to finish setting up your Wurkzi account.</p>
        {busy && <p role="status" className="mt-5 text-sm text-wurkzi-300">Confirming your email…</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <form onSubmit={handleResend} className="mt-6 space-y-3">
          <label htmlFor="verification-email" className="sr-only">Email address</label>
          <input
            id="verification-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-wurkzi-500"
          />
          <button disabled={busy} type="submit" className="w-full rounded-xl bg-gradient-to-r from-wurkzi-600 to-purple-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
            Resend confirmation email
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-400">Already confirmed? <Link to="/login" className="text-wurkzi-300 hover:text-white">Sign in</Link></p>
      </div>
    </div>
  );
};

export default VerifyEmail;
