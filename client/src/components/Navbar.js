import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import UnreadMessagesBadge from "./UnreadMessagesBadge";

const Navbar = () => {
  const { isAuthenticated, logout, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getUserInitials = () => {
    if (profile?.displayName) {
      return profile.displayName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserRole = () => {
    return user?.user_metadata?.role || "USER";
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
        ? "bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shadow-lg shadow-black/10"
        : "bg-transparent border-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Brand */}
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="nav-brand flex items-center shrink-0 group">
            <div className="relative">
              <div className="absolute inset-0 bg-wurkzi-500/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <img
                src={logo}
                alt="Wurkzi Logo"
                className="w-10 h-10 object-contain mr-3 relative z-10 brightness-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
              />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Wurkzi
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className={`text-sm font-medium transition-colors duration-200 hover:text-white ${isActive('/dashboard') ? 'text-white' : 'text-slate-400'}`}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/"
                    className={`text-sm font-medium transition-colors duration-200 hover:text-white ${isActive('/') ? 'text-white' : 'text-slate-400'}`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/about"
                    className={`text-sm font-medium transition-colors duration-200 hover:text-white ${isActive('/about') ? 'text-white' : 'text-slate-400'}`}
                  >
                    About
                  </Link>
                  <Link
                    to="/how-it-works"
                    className={`text-sm font-medium transition-colors duration-200 hover:text-white ${isActive('/how-it-works') ? 'text-white' : 'text-slate-400'}`}
                  >
                    How it Works
                  </Link>
                </>
              )}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4 ml-6">
                <Link
                  to="/jobs"
                  className={`text-sm font-medium transition-colors duration-200 hover:text-white ${isActive('/jobs') ? 'text-white' : 'text-slate-400'}`}
                >
                  Jobs
                </Link>

                {(
                  <Link
                    to="/jobs/new"
                    className={`text-sm font-medium transition-colors duration-200 hover:text-white ${isActive('/jobs/new') ? 'text-white' : 'text-slate-400'}`}
                  >
                    Post Job
                  </Link>
                )}

                <Link
                  to="/referrals"
                  className={`text-sm font-medium transition-colors duration-200 hover:text-white ${isActive('/referrals') ? 'text-white' : 'text-slate-400'}`}
                >
                  Refer & Earn
                </Link>

                <Link
                  to="/leaderboard"
                  className={`text-sm font-medium transition-colors duration-200 hover:text-white ${isActive('/leaderboard') ? 'text-white' : 'text-slate-400'}`}
                >
                  Leaderboard
                </Link>

                <Link to="/messages" className="relative group p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
                  <UnreadMessagesBadge />
                  <span className="sr-only">Messages</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </Link>

                <div className="relative group flex items-center gap-3">
                  <div className="hidden lg:flex flex-col items-end mr-1">
                    <span className="text-xs font-bold text-wurkzi-400 uppercase tracking-wider border border-wurkzi-500/30 bg-wurkzi-500/10 px-2 py-0.5 rounded">
                      {getUserRole()}
                    </span>
                  </div>
                  <Link to="/profile" className="h-8 w-8 rounded-full bg-gradient-to-r from-wurkzi-600 to-purple-600 p-[2px] hover:shadow-lg hover:shadow-wurkzi-500/20 transition-all" title="Your profile">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="Your profile" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white">
                        {getUserInitials()}
                      </div>
                    )}
                  </Link>
                  <Link to="/profile" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Sign Out
                  </button>

                  {/* Desktop Delete Account option (hidden behind a small trigger or just put it clearly for compliance) */}
                  {/* For better UX, usually this is in a Settings page, but for compliance speed, we add a small icon or link */}
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                        import("../api/authApi").then(({ deleteAccount }) => {
                          deleteAccount().then(() => {
                            logout();
                            navigate("/");
                            alert("Your account has been deleted.");
                          }).catch(err => alert("Failed to delete account."));
                        });
                      }
                    }}
                    className="text-xs font-medium text-red-900/50 hover:text-red-500 transition-colors ml-2"
                    title="Delete Account"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-white hover:text-wurkzi-400 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-full bg-white text-slate-900 font-bold text-sm hover:bg-wurkzi-50 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:-translate-y-0.5"
                >
                  Join Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none transition-colors"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 absolute w-full left-0 animate-fade-in shadow-2xl">
          <div className="pt-2 pb-3 space-y-1 px-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/dashboard') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/about"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/about') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  to="/how-it-works"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/how-it-works') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  How it Works
                </Link>
              </>
            )}

            {isAuthenticated && (
              <>
                <Link
                  to="/jobs"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/jobs') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Jobs
                </Link>
                {(
                  <Link
                    to="/jobs/new"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/jobs/new') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Post Job
                  </Link>
                )}
                <Link
                  to="/referrals"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/referrals') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Refer & Earn
                </Link>
                <Link
                  to="/leaderboard"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/leaderboard') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Leaderboard
                </Link>
                <Link
                  to="/messages"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/messages') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Messages
                </Link>
                <Link
                  to="/profile"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/profile') ? 'text-white bg-wurkzi-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
              </>
            )}
          </div>
          <div className="pt-4 pb-4 border-t border-slate-800 px-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Your profile" className="h-10 w-10 rounded-full border border-slate-700 object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold border border-slate-700">
                          {getUserInitials()}
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">{profile?.displayName || user?.email}</div>
                      <div className="text-sm font-medium text-slate-500 capitalize">{getUserRole()} Account</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white focus:outline-none hover:bg-slate-700 transition-colors"
                  >
                    <span className="sr-only">Sign out</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>

                {/* Account Deletion (Danger Zone) */}
                <div className="mt-6 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete your account? This action cannot be undone and will remove all your data.")) {
                        import("../api/authApi").then(({ deleteAccount }) => {
                          deleteAccount().then(() => {
                            logout();
                            navigate("/");
                            alert("Your account has been deleted.");
                          }).catch(err => {
                            console.error(err);
                            alert("Failed to delete account. Please try again.");
                          });
                        });
                      }
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-3">
                <Link
                  to="/login"
                  className="block w-full px-4 py-3 text-center font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block w-full px-4 py-3 text-center font-bold text-slate-900 bg-white hover:bg-slate-200 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Join Now
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
