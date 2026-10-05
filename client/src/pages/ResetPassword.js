import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { resetPassword } from "../api/authApi";

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Supabase appends the access_token and refresh_token in the URL fragment (hash)
    const getTokens = () => {
        const hash = location.hash;
        if (!hash) return null;

        // Remove the leading '#'
        const updateHash = hash.substring(1);
        const params = new URLSearchParams(updateHash);

        return {
            access_token: params.get("access_token"),
            refresh_token: params.get("refresh_token")
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        const tokens = getTokens();
        if (!tokens || !tokens.access_token || !tokens.refresh_token) {
            setError("Invalid or expired reset link. Please request a new one.");
            return;
        }

        setLoading(true);
        try {
            await resetPassword({
                password,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token
            });
            setSuccess(true);
            setTimeout(() => navigate("/login"), 3000);
        } catch (err) {
            setError("Failed to reset password. The link may have expired.");
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

            <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl relative z-10 animate-fade-in text-center">
                <h2 className="text-3xl font-bold text-white mb-2">New Password</h2>
                <p className="text-slate-400 mb-8">Set your new password below.</p>

                {!success ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="text-left">
                            <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
                                required
                            />
                        </div>

                        <div className="text-left">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-wurkzi-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 bg-gradient-to-r from-wurkzi-600 to-purple-600 hover:from-wurkzi-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm">
                                {error}
                            </div>
                        )}
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-200 text-sm">
                            Password updated successfully! Redirecting you to login...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
