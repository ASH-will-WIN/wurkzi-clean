const { supabase } = require("../db");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({
        error: "Invalid token",
        details: error?.message || "No user data found",
      });
    }

    // Standardize the user object structure
    req.user = {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
      emailConfirmedAt: data.user.email_confirmed_at || data.user.confirmed_at || null,
    };

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    res.status(500).json({
      error: "auth_middleware_failed",
      message: "Authentication middleware failed",
      details: error.message,
    });
  }
};

const requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.emailConfirmedAt) {
    return res.status(403).json({
      error: "Please verify your email to use this feature.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  return next();
};

authMiddleware.requireVerifiedEmail = requireVerifiedEmail;
module.exports = authMiddleware;
