import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/authApi";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            await forgotPassword(email);
            setMessage("If an account exists for this email, you will receive a password reset link shortly.");
        } catch (err) {
            setError("Failed to send reset email. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-wurkzi-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>

            <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl relative z-10 animate-fade-in text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
                <p className="text-slate-400 mb-8">Enter your email and we'll send you a link to reset your password.</p>

                {!message ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="text-left">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 bg-gradient-to-r from-wurkzi-600 to-purple-600 hover:from-wurkzi-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                        >
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm">
                                {error}
                            </div>
                        )}
                    </form>
                ) : (
                    <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-200 text-sm mb-6">
                        {message}
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-700/50">
                    <Link to="/login" className="text-wurkzi-400 hover:text-white font-medium transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
