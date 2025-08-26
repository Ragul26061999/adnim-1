"use client";
import * as React from "react";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookMedical, faBookOpen } from "@fortawesome/free-solid-svg-icons";

export default function PYQDashboard() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex font-sans bg-[#F8F9FB]">
      <Sidebar />
      <main className="flex-1 bg-[#F8F9FB] flex flex-col items-center justify-center p-8 md:p-12 xl:p-16">
        <h1 className="text-3xl font-bold text-[#6C63FF] mb-2">Previous Year Questions (PYQ)</h1>
        <p className="text-gray-500 mb-10">Select NEET or JEE to view previous year questions.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl">
          {/* NEET PYQ Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center">
            <div className="bg-[#A5B4FC] p-4 rounded-full mb-6">
              <FontAwesomeIcon icon={faBookMedical} className="text-2xl text-white" />
            </div>
            <h2 className="font-bold text-xl text-gray-800 mb-2">NEET PYQ</h2>
            <p className="text-gray-500 text-center mb-6">Browse and practice previous year NEET questions.</p>
            <button className="bg-[#6C63FF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#4338CA] transition text-base" onClick={() => router.push('/assessment-question-bank/pyq/neet')}>View NEET PYQ</button>
          </div>
          {/* JEE PYQ Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center">
            <div className="bg-[#6EE7B7] p-4 rounded-full mb-6">
              <FontAwesomeIcon icon={faBookOpen} className="text-2xl text-white" />
            </div>
            <h2 className="font-bold text-xl text-gray-800 mb-2">JEE PYQ</h2>
            <p className="text-gray-500 text-center mb-6">Browse and practice previous year JEE questions.</p>
            <button className="bg-[#6EE7B7] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#059669] transition text-base" onClick={() => router.push('/assessment-question-bank/pyq/jee')}>View JEE PYQ</button>
          </div>
        </div>
      </main>
    </div>
  );
} 