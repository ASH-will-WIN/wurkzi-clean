import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role] = useState("MEMBER"); // Default role (hidden from user)
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const location = useLocation();
  const [referralCode] = useState(() => new URLSearchParams(location.search).get("ref") || "");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate terms agreement
    if (!agreedToTerms) {
      setError("You must agree to the terms and conditions.");
      return;
    }

    // Validate phone number
    if (!phone) {
      setError("Phone number is required.");
      return;
    }

    // Basic phone number validation (at least 10 digits)
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    try {
      const result = await register(name, email, password, role, phone, referralCode, smsNotificationsEnabled);
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
      console.error(err);
    }
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
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
              required
            />
          </div>

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
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-wurkzi-600 focus:ring-wurkzi-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="sms-opt-in" className="ml-3 text-sm text-slate-400">
              Text me important job updates and new messages. Message frequency varies; message and data rates may apply. Reply STOP to opt out.
            </label>
          </div>

          <button
            type="submit"
            disabled={!agreedToTerms}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-wurkzi-600 to-purple-600 hover:from-wurkzi-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            Create Account
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
