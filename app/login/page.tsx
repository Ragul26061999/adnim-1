"use client";
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../../components/firebase";
import Image from "next/image";
import { FcGoogle } from "react-icons/fc";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/classaScreen");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google sign-in logic here
    alert("Google sign-in not implemented yet");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e3f0fc] to-[#b6d6f6] font-sans relative overflow-hidden">
      {/* Pastel SVG Blob for extra depth */}
      <svg className="absolute -top-32 -left-32 w-[600px] h-[600px] opacity-40 blur-2xl z-0" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_f_1_2)">
          <ellipse cx="300" cy="300" rx="300" ry="300" fill="#a5b4fc" fillOpacity="0.5"/>
        </g>
      </svg>
      <div className="flex w-full max-w-4xl min-h-[600px] rounded-3xl shadow-2xl overflow-hidden bg-white/80 backdrop-blur-md z-10">
        {/* Left: Info Panel */}
        <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-transparent relative">
          <div className="absolute inset-0 bg-transparent" />
          <div className="relative z-10 p-12">
            <div className="text-base font-semibold mb-2 text-gray-700">For school admins.</div>
            <div className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 text-black relative">
              Manage <span className="relative inline-block">schools</span> as easily<br />as sending a message.
            </div>
            <div className="text-[#3B82F6] text-lg font-medium mt-6">Organize classes, students, and assessments with ease.</div>
          </div>
        </div>
        {/* Right: Login Form */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-white/90 p-8 md:p-16 rounded-3xl">
          <h2 className="text-2xl font-bold mb-2 text-black flex items-center gap-2">Welcome, School Admin! <span className="text-xl">👋</span></h2>
          <div className="text-gray-700 text-sm mb-6">Sign in to your admin dashboard.</div>
          <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-200 text-gray-900 placeholder-gray-400 shadow-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-200 text-gray-900 placeholder-gray-400 shadow-sm"
              required
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-gray-700 text-sm">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="accent-purple-400 rounded"
                />
                Remember me
              </label>
              <a href="#" className="text-[#3B82F6] text-sm hover:underline">Forgot password?</a>
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button
              type="submit"
              className="mt-2 bg-[#3B82F6] text-white font-semibold py-2 rounded-xl shadow hover:bg-[#2563eb] transition text-lg border border-[#3B82F6]"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 