"use client";
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebaseClient";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <header className="w-full bg-white shadow px-6 py-4 flex items-center justify-between">
      <div className="text-xl font-bold text-blue-700">Edueron Admin</div>
      <div className="flex items-center gap-4">
        <div className="text-gray-500">User</div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
} 