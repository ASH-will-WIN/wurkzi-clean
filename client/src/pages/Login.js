import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/jobs/new");
    } catch (err) {
      setError("Failed to log in. Please check your credentials.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-wurkzi-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl relative z-10 animate-fade-in text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-slate-400 mb-8">Sign in to continue to Wurkzi</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
              required
            />
            <div className="mt-2 text-right">
              <Link to="/forgot-password" size="sm" className="text-sm text-wurkzi-400 hover:text-white transition-colors">
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-wurkzi-600 to-purple-600 hover:from-wurkzi-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all duration-300 hover:-translate-y-0.5"
          >
            Sign In
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <p className="text-slate-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-wurkzi-400 hover:text-white font-medium transition-colors">
              Create one now
            </Link>
          </p>
          <div className="mt-4">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
