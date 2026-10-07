import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, UserPlus, CircleUserRound, AlertCircle, CheckCircle2 } from "lucide-react";
import API from "../../../api";

// Import candidate registration background image
import Can_Prof_bg from "../../../assets/images/Can_Prof_bg.png";

export default function CreateAccount() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const debounceTimerRef = useRef(null);

  // Validate and check email availability
  const checkEmail = async (emailToTest) => {
    const cleanEmail = emailToTest.trim().toLowerCase();

    if (!cleanEmail) {
      setEmailError("");
      setEmailAvailable(false);
      return;
    }

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setEmailError("Please enter a valid email address.");
      setEmailAvailable(false);
      return;
    }

    // Specific check for HR hardcoded email
    if (cleanEmail === "hrautocratengineers@gmail.com") {
      setEmailError("Email already existed");
      setEmailAvailable(false);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const res = await API.get("/auth/check-email", {
        params: { email: cleanEmail },
      });

      if (res.data && res.data.available === false) {
        setEmailError("Email already existed");
        setEmailAvailable(false);
      } else {
        setEmailError("");
        setEmailAvailable(true);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setEmailError("Email already existed");
      } else {
        setEmailError("");
      }
      setEmailAvailable(false);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setFormError("");
    setEmailAvailable(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const cleanEmail = val.trim().toLowerCase();
    if (!cleanEmail) {
      setEmailError("");
      return;
    }

    if (cleanEmail === "hrautocratengineers@gmail.com") {
      setEmailError("Email already existed");
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      checkEmail(val);
    }, 400);
  };

  const handleEmailBlur = () => {
    if (email) {
      checkEmail(email);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setFormError("");
    setSuccess("");

    if (!email || !password || !confirmPassword) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (emailError) {
      return;
    }

    if (email.trim().toLowerCase() === "hrautocratengineers@gmail.com") {
      setEmailError("Email already existed");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await API.post("/auth/register", {
        email: email.trim(),
        password: password.trim(),
        role: "CANDIDATE",
      });

      setSuccess("Candidate account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login", { state: { prefilledEmail: email.trim() } });
      }, 1500);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        const detail = err.response.data.detail;
        if (detail.toLowerCase().includes("exist") || detail.toLowerCase().includes("registered")) {
          setEmailError("Email already existed");
        } else {
          setFormError(detail);
        }
      } else {
        setFormError("Failed to create account. Please try again.");
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
      {/* 🔴 LEFT SIDE: Image Side (Candidate Background) */}
      <div className="hidden lg:flex lg:w-[95%] relative bg-slate-900 overflow-hidden">
        <img
          src={Can_Prof_bg}
          alt="Candidate Registration Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 🟢 RIGHT SIDE: Create Account Form */}
      <div className="w-full lg:w-[42%] min-h-screen flex items-center justify-center p-6 sm:p-12 bg-white">
        <form
          onSubmit={handleRegister}
          onKeyDown={handleKeyDown}
          className="w-full max-w-md bg-white p-0"
        >
          {/* Header Avatar Icon */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <CircleUserRound className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Create Candidate Account
            </h1>

            <p className="text-xs text-gray-500 mt-1 font-medium">
              Join the HR Management System to explore opportunities
            </p>
          </div>

          {/* General Form Error Status */}
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Success Status */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Email Field with Live Validation */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="register-email" className="block text-xs font-bold text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              {isCheckingEmail && (
                <span className="text-[11px] text-gray-400 font-medium">Checking...</span>
              )}
            </div>

            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${emailError ? "text-red-500" : "text-gray-400"}`} />

              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="candidate@gmail.com"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                className={`w-full pl-10 pr-4 py-2.5 bg-[#f8fafc] border rounded-xl
                           text-gray-800 placeholder-gray-400 text-sm font-normal
                           focus:outline-none transition ${
                             emailError
                               ? "border-red-500 focus:ring-2 focus:ring-red-500/50 bg-red-50/20"
                               : emailAvailable
                               ? "border-green-500 focus:ring-2 focus:ring-green-500/50"
                               : "border-gray-200 focus:ring-2 focus:ring-red-500/80 focus:border-transparent"
                           }`}
                required
              />
            </div>

            {/* Inline Email Error Message */}
            {emailError && (
              <p className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-fadeIn">
                <AlertCircle size={14} className="shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-4">
            <label htmlFor="register-password" className="block text-xs font-bold text-gray-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password (min 6 characters)"
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

          {/* Confirm Password */}
          <div className="mb-6">
            <label htmlFor="register-confirm-password" className="block text-xs font-bold text-gray-700 mb-1.5">
              Confirm Password <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-[#f8fafc] border border-gray-200 rounded-xl
                           text-gray-800 placeholder-gray-400 text-sm font-normal
                           focus:outline-none focus:ring-2 focus:ring-red-500/80 focus:border-transparent transition"
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading || !!emailError}
            className="w-full bg-[#e50914] hover:bg-red-700 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm
                       transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Candidate Account
              </>
            )}
          </button>

          {/* Footer Links */}
          <div className="text-center mt-6 text-xs text-gray-600 space-y-1.5">
            <p>
              Already have an account?{" "}
              <span
                onClick={() => navigate("/login")}
                className="text-red-600 font-bold cursor-pointer hover:underline"
              >
                Sign In
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
