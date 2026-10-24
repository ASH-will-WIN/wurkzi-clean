import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneVerificationSkipped, setPhoneVerificationSkipped] = useState(false);
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [role] = useState("MEMBER"); // Default role (hidden from user)
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const location = useLocation();
  const [referralCode] = useState(() => new URLSearchParams(location.search).get("ref") || "");
  const { register, requestPhoneVerification } = useAuth();
  const navigate = useNavigate();

  const validatePhoneAndTerms = () => {
    setError("");

    // Validate terms agreement
    if (!agreedToTerms) {
      setError("You must agree to the terms and conditions.");
      return false;
    }

    if (!smsNotificationsEnabled) {
      setError("You must opt in to text message notifications to create an account.");
      return false;
    }

    // Validate phone number
    if (!phone) {
      setError("Phone number is required.");
      return false;
    }

    // Accept US numbers with or without +1, and international numbers with +country code.
    const trimmedPhone = phone.trim();
    const phoneDigits = trimmedPhone.replace(/\D/g, "");
    const hasOnlyPhoneCharacters = /^\+?[\d\s().-]+$/.test(trimmedPhone);
    const validPhone = trimmedPhone.startsWith("+")
      ? /^[1-9]\d{7,14}$/.test(phoneDigits)
      : phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith("1"));
    if (!hasOnlyPhoneCharacters || !validPhone) {
      setError("Please enter a valid phone number.");
      return false;
    }
    return true;
  };

  const handleSendPhoneCode = async () => {
    if (!validatePhoneAndTerms()) return;
    setSendingPhoneCode(true);
    try {
      const result = await requestPhoneVerification(phone);
      setPhoneCodeSent(true);
      setPhoneVerificationSkipped(Boolean(result?.verificationSkipped));
      setPhoneVerificationCode("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not send a verification code.");
    } finally {
      setSendingPhoneCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePhoneAndTerms()) return;
    if (!phoneCodeSent) {
      await handleSendPhoneCode();
      return;
    }
    if (!phoneVerificationSkipped && !/^\d{4,10}$/.test(phoneVerificationCode.trim())) {
      setError("Enter the verification code sent to your phone.");
      return;
    }

    setCreatingAccount(true);
    try {
      const result = await register(name, email, password, role, phone, phoneVerificationSkipped ? "" : phoneVerificationCode.trim(), referralCode, smsNotificationsEnabled);
      if (result?.requiresEmailVerification) {
        navigate("/verify-email", { state: { email: result.email || email, sent: true } });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      // Display server error message if available
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to register.");
      }
    } finally {
      setCreatingAccount(false);
    }
  };

  const handlePhoneChange = (value) => {
    setPhone(value);
    setPhoneCodeSent(false);
    setPhoneVerificationSkipped(false);
    setPhoneVerificationCode("");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4 py-20">
      {/* Background Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-wurkzi-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl relative z-10 animate-fade-in text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-slate-400 mb-8">Join the Wurkzi community today</p>

        {referralCode && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Referral code <span className="font-bold">{referralCode}</span> will be applied when you join.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
              required
            />
          </div>

          <div className="text-left">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
              required
            />
          </div>

          <div className="text-left">
            <label htmlFor="registration-phone" className="block text-sm font-medium text-slate-300 mb-1">
              Phone Number *
            </label>
            <input
              id="registration-phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              autoComplete="tel"
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Required. Enter a number where you can receive Wurkzi texts.</p>
          </div>

          {phoneCodeSent && !phoneVerificationSkipped && (
            <div className="text-left space-y-2">
              <label htmlFor="phone-verification-code" className="block text-sm font-medium text-slate-300">
                Text message code
              </label>
              <input
                id="phone-verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4,10}"
                maxLength={10}
                placeholder="Enter your code"
                value={phoneVerificationCode}
                onChange={(e) => setPhoneVerificationCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
                required
              />
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>We sent a one-time code to {phone}.</span>
                <button type="button" onClick={handleSendPhoneCode} disabled={sendingPhoneCode || creatingAccount} className="shrink-0 text-wurkzi-400 hover:text-white disabled:opacity-50">
                  {sendingPhoneCode ? "Sending…" : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {phoneVerificationSkipped && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-sm text-amber-200" role="status">
              Phone verification is temporarily unavailable, so you can continue without a code.
            </p>
          )}

          <div className="text-left">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
              required
            />
          </div>
          {/* Removed User Role Toggle Section */}

          {/* Terms and Conditions */}
          <div className="flex items-start mt-4">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-wurkzi-600 focus:ring-wurkzi-500 focus:ring-offset-slate-900"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-slate-400">
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="font-medium text-wurkzi-400 hover:text-wurkzi-300 hover:underline"
                >
                  Terms, EULA & Zero Tolerance Policy
                </Link>
              </label>
            </div>
          </div>

          <div className="flex items-start text-left">
            <input
              id="sms-opt-in"
              type="checkbox"
              checked={smsNotificationsEnabled}
              onChange={(e) => setSmsNotificationsEnabled(e.target.checked)}
              required
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-wurkzi-600 focus:ring-wurkzi-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="sms-opt-in" className="ml-3 text-sm text-slate-400">
              Required: I agree to receive important job updates and new message notifications by text. Message frequency varies; message and data rates may apply. Reply STOP to opt out.
            </label>
          </div>

          <button
            type="submit"
            disabled={!agreedToTerms || !smsNotificationsEnabled || sendingPhoneCode || creatingAccount}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-wurkzi-600 to-purple-600 hover:from-wurkzi-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {sendingPhoneCode ? "Sending code…" : creatingAccount ? "Creating account…" : phoneVerificationSkipped ? "Create account" : phoneCodeSent ? "Verify phone & create account" : "Text me a verification code"}
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <p className="text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-wurkzi-400 hover:text-white font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
          <div className="mt-4">
            <Link
              to="/"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
