import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn, CircleUserRound, AlertCircle } from "lucide-react";
import API from "../../../api";

// ✅ Import your local image
import HR_Login_bg from "../../../assets/images/HR_Login_bg.png"; // Ensure extension matches (.png or .jpg)

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(location.state?.prefilledEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email address and password");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email: email.trim(),
        password: password.trim(),
      });

      const { access_token, user_id, role, is_profile_created } = res.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem(
        "loggedInUser",
        JSON.stringify({
          email: email.trim(),
          role,
          id: user_id,
        })
      );

      if (role === "HR") {
        navigate("/hr/dashboard");
      } else if (role === "CANDIDATE") {
        if (!is_profile_created) {
          navigate("/candidate/profile");
        } else {
          navigate("/candidate/dashboard");
        }
      } else {
        navigate("/");
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Invalid email or password. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      const isStart = e.target.selectionStart === 0 && e.target.selectionEnd === 0;
      if (isStart) {
        const inputs = Array.from(e.currentTarget.querySelectorAll("input"));
        const idx = inputs.indexOf(e.target);
        if (idx > 0) {
          inputs[idx - 1].focus();
          e.preventDefault();
        }
      }
    } else if (e.key === "ArrowRight") {
      const isEnd = e.target.selectionStart === e.target.value.length && e.target.selectionEnd === e.target.value.length;
      if (isEnd) {
        const inputs = Array.from(e.currentTarget.querySelectorAll("input"));
        const idx = inputs.indexOf(e.target);
        if (idx < inputs.length - 1) {
          inputs[idx + 1].focus();
          e.preventDefault();
        }
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-gray-800">
      {/* 🔴 LEFT SIDE: Clean Image Side (No Text or Wordings) */}
      <div className="hidden lg:flex lg:w-[95%] relative bg-slate-900 overflow-hidden">
        <img
          src={HR_Login_bg}
          alt="HR Login Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 🟢 RIGHT SIDE: Original Login Form */}
      <div className="w-full lg:w-[42%] min-h-screen flex items-center justify-center p-6 sm:p-12 bg-white">
        <form
          onSubmit={handleLogin}
          onKeyDown={handleKeyDown}
          className="w-full max-w-md bg-white p-0"
        >
          {/* Header Avatar Icon */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <CircleUserRound className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome Back
            </h1>

            <p className="text-xs text-gray-500 mt-1 font-medium">
              Sign in to access your profile
            </p>
          </div>

          {/* Status Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="login-email" className="block text-xs font-bold text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="me@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#f8fafc] border border-gray-200 rounded-xl
                           text-gray-800 placeholder-gray-400 text-sm font-normal
                           focus:outline-none focus:ring-2 focus:ring-red-500/80 focus:border-transparent transition"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-6">
            <label htmlFor="login-password" className="block text-xs font-bold text-gray-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-[#f8fafc] border border-gray-200 rounded-xl
                           text-gray-800 placeholder-gray-400 text-sm font-normal
                           focus:outline-none focus:ring-2 focus:ring-red-500/80 focus:border-transparent transition"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e50914] hover:bg-red-700 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm
                       transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Login
              </>
            )}
          </button>

          {/* Footer Links */}
          <div className="text-center mt-6 text-xs text-gray-600 space-y-1.5">
            <p>
              Don't have an account?{" "}
              <span
                onClick={() => navigate("/create-account")}
                className="text-red-600 font-bold cursor-pointer hover:underline"
              >
                Create Account
              </span>
            </p>
            <p>
              <span
                onClick={() => navigate("/forgot-password")}
                className="text-gray-500 cursor-pointer hover:text-gray-700 hover:underline"
              >
                Forgot your password?
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}