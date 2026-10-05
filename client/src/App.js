import React, { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import JobsList from "./pages/JobsList";
import Home from "./pages/Home";
import JobDetail from "./pages/JobDetail";
import CreateJob from "./pages/CreateJob";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import Onboarding from "./pages/Onboarding.js";
import ConnectReturn from "./pages/ConnectReturn";
import ConnectRefresh from "./pages/ConnectRefresh";
import Terms from "./pages/Terms"; // Added import for Terms page
import About from "./pages/About"; // Added import for About page
import Mission from "./pages/Mission"; // Added import for Mission page
import HowItWorks from "./pages/HowItWorks"; // Added import for HowItWorks page
import Privacy from "./pages/Privacy"; // Added import for Privacy page
import Support from "./pages/Support"; // Added import for Support page
import Footer from "./components/Footer"; // Added import for Footer
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Referrals from "./pages/Referrals";
import Leaderboard from "./pages/Leaderboard";
import Staging from "./pages/Staging";
import Profile from "./pages/Profile";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isStagingPath = location.pathname === "/staging" || location.pathname.startsWith("/staging/");
  const isStagingHost = window.location.hostname === "staging.wurkzi.com";
  const isStaging = isStagingPath || isStagingHost;

  useEffect(() => {
    // Check for Supabase password reset token in the URL hash
    const hash = window.location.hash;
    if (hash && hash.includes("access_token") && (hash.includes("type=recovery") || hash.includes("type=magiclink") || !hash.includes("type="))) {
      console.log("Detected password reset token, redirecting to reset-password page");
      // Redirect to reset password page, preserving the hash so the page can parse the token
      navigate(`/reset-password${hash}`);
    }
  }, [navigate]);

  return (
    <div className={isStaging ? "App" : "App flex flex-col min-h-screen bg-slate-950"}>
      {!isStaging && <Navbar />}
      <main className={isStaging ? "" : "flex-grow pt-20"}>
        {isStaging ? (
          <Routes>
            <Route path="*" element={<Staging />} />
          </Routes>
        ) : (
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/connect-return" element={<ConnectReturn />} />
          <Route path="/connect-refresh" element={<ConnectRefresh />} />
          <Route path="/terms" element={<Terms />} />{" "}
          {/* Added route for Terms and Conditions */}
          <Route path="/about" element={<About />} />{" "}
          {/* Added route for About page */}
          <Route path="/mission" element={<Mission />} />{" "}
          {/* Added route for Mission page */}
          <Route path="/how-it-works" element={<HowItWorks />} />{" "}
          {/* Added route for How It Works page */}
          <Route path="/privacy" element={<Privacy />} />{" "}
          {/* Added route for Privacy page */}
          <Route path="/support" element={<Support />} />{" "}
          {/* Added route for Support page */}
          {/* Protected Routes */}
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <JobsList />
              </ProtectedRoute>
            }
          />
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route
            path="/jobs/new"
            element={
              <ProtectedRoute>
                <CreateJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:id"
            element={
              <ProtectedRoute>
                <JobDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referrals"
            element={
              <ProtectedRoute>
                <Referrals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          </Routes>
        )}
      </main>
      {!isStaging && <Footer />}
    </div>
  );
}

export default App;
