import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { loginUser, registerUser } from "../api/authApi";
import { apiClient } from "../api/apiClient";
import { getMyProfile } from "../api/profileApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const refreshProfile = useCallback(async () => {
    const nextProfile = await getMyProfile();
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    if (token) {
      // Set the auth token for all future requests
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Fetch user data from local storage or an API endpoint if needed
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) {
        setUser(storedUser);
      }
      refreshProfile().catch((error) => {
        console.error("Failed to load profile:", error);
        setProfile(null);
      });
    }
    setLoading(false);
  }, [token, refreshProfile]);

  const login = async (email, password) => {
    const { user, session } = await loginUser({ email, password });
    localStorage.setItem("token", session.access_token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(session.access_token);
    setUser(user);
    apiClient.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${session.access_token}`;
    await refreshProfile();

    // Note: Onboarding status will be checked on Dashboard load
  };

  const register = async (name, email, password, role, phone, referralCode) => {
    const { user, session } = await registerUser({
      name,
      email,
      password,
      role,
      phone,
      referralCode,
    });
    localStorage.setItem("token", session.access_token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(session.access_token);
    setUser(user);
    apiClient.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${session.access_token}`;
    await refreshProfile();

    // Note: Onboarding status will be checked on Dashboard load
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setProfile(null);
    delete apiClient.defaults.headers.common["Authorization"];
  };

  const value = {
    user,
    profile,
    token,
    login,
    register,
    logout,
    refreshProfile,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
