import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import UnreadMessagesBadge from "./UnreadMessagesBadge";
import { connectMessageRealtime, disconnectMessageRealtime } from "../api/messageRealtime";
import { getNotifications, getNotificationPreferences, markAllNotificationsRead, markNotificationRead, updateNotificationPreferences } from "../api/notificationApi";

const Navbar = () => {
  const { isAuthenticated, logout, user, profile, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsOptedOut, setSmsOptedOut] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setNotificationUnreadCount(data.unreadCount);
      setNotificationError("");
    } catch (error) {
      setNotificationError("Could not load notifications.");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    let live = true;
    Promise.all([getNotifications(), getNotificationPreferences()]).then(([data, preferences]) => {
      if (!live) return;
      setNotifications(data.notifications);
      setNotificationUnreadCount(data.unreadCount);
      setSmsEnabled(Boolean(preferences.smsNotificationsEnabled));
      setSmsOptedOut(Boolean(preferences.smsOptedOut));
    }).catch(() => { if (live) setNotificationError("Could not load notifications."); });
    const socket = connectMessageRealtime(token);
    const onNotification = (notification) => {
      if (notification?.id) {
        setNotifications((items) => [notification, ...items.filter((item) => item.id !== notification.id)].slice(0, 20));
        if (!(notification.readAt || notification.isRead)) setNotificationUnreadCount((count) => count + 1);
      }
      refreshNotifications();
    };
    socket?.on("notification:new", onNotification);
    return () => {
      live = false;
      socket?.off("notification:new", onNotification);
      disconnectMessageRealtime();
    };
  }, [isAuthenticated, token, refreshNotifications]);

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

  const openNotification = async (notification) => {
    const wasUnread = !(notification.readAt || notification.isRead);
    setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() } : item));
    if (wasUnread) setNotificationUnreadCount((count) => Math.max(0, count - 1));
    try { await markNotificationRead(notification.id); } catch (error) { /* navigation should remain immediate */ }
    setNotificationsOpen(false);
    setIsMenuOpen(false);
    navigate(notification.href || "/dashboard");
  };

  const handleMarkAllRead = async () => {
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
    setNotificationUnreadCount(0);
    try { await markAllNotificationsRead(); } catch (error) { refreshNotifications(); }
  };

  const handleSmsChange = async (event) => {
    const enabled = event.target.checked;
    const previous = smsEnabled;
    setSmsEnabled(enabled);
    setSmsSaving(true);
    try {
      const preferences = await updateNotificationPreferences({ smsNotificationsEnabled: enabled });
      setSmsEnabled(Boolean(preferences.smsNotificationsEnabled));
    } catch (error) {
      setSmsEnabled(previous);
      setNotificationError(error.response?.data?.message || "Could not update SMS preference.");
    } finally { setSmsSaving(false); }
  };

  const unreadNotification = (item) => !(item.readAt || item.isRead);
  const notificationTitle = (item) => item.title || item.subject || "Wurkzi update";
  const notificationBody = (item) => item.body || item.message || item.content || "You have a new update.";
  const notificationDate = (item) => {
    const date = new Date(item.createdAt || item.sentAt || "");
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
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

                <button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-expanded={notificationsOpen} aria-label={`Notifications${notificationUnreadCount ? `, ${notificationUnreadCount} unread` : ""}`} className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-wurkzi-400">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
                  {notificationUnreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}</span>}
                </button>

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
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && <button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-expanded={notificationsOpen} aria-label={`Notifications${notificationUnreadCount ? `, ${notificationUnreadCount} unread` : ""}`} className="relative rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-wurkzi-400">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
              {notificationUnreadCount > 0 && <span className="absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}</span>}
            </button>}
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

      {isAuthenticated && notificationsOpen && <div className="absolute right-3 top-[4.5rem] z-[60] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl" role="dialog" aria-label="Notifications">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div><h2 className="font-semibold text-white">Notifications</h2><p className="text-xs text-slate-400">{notificationUnreadCount ? `${notificationUnreadCount} unread` : "You're all caught up"}</p></div>
          {notificationUnreadCount > 0 && <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-wurkzi-300 hover:text-white">Mark all read</button>}
        </div>
        <div className="max-h-[min(55vh,24rem)] overflow-y-auto">
          {notificationError && <p className="px-4 py-3 text-sm text-red-300" role="alert">{notificationError}</p>}
          {notifications.length ? notifications.slice(0, 20).map((item) => <button type="button" key={item.id} onClick={() => openNotification(item)} className={`block w-full border-b border-slate-800 px-4 py-3 text-left transition hover:bg-slate-800 focus:outline-none focus-visible:bg-slate-800 ${unreadNotification(item) ? "bg-slate-800/50" : ""}`}>
            <div className="flex items-start gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unreadNotification(item) ? "bg-wurkzi-400" : "bg-transparent"}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-white">{notificationTitle(item)}</span><span className="mt-0.5 block line-clamp-2 text-sm text-slate-300">{notificationBody(item)}</span><span className="mt-1 block text-xs text-slate-500">{notificationDate(item)}</span></span></div>
          </button>) : !notificationError && <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</p>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">
          <div className="min-w-0">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={smsEnabled} disabled={smsSaving || smsOptedOut} onChange={handleSmsChange} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-wurkzi-500 focus:ring-wurkzi-400" />SMS alerts</label>
            <p className="ml-6 mt-1 text-xs text-slate-500">{smsOptedOut ? "Reply START to a Wurkzi text to opt in again." : "Job updates and message alerts. Reply STOP to opt out; message and data rates may apply."}</p>
          </div>
          <span className="shrink-0 text-xs text-slate-500">{smsSaving ? "Saving…" : ""}</span>
        </div>
      </div>}

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
