"use client";
import * as React from "react";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faCalendarAlt, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

export default function ManageAssessments() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-10">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Manage Assessments</h1>
        <p className="text-gray-500 mb-10">Create, schedule, and review assessments for your students.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-5xl">
          {/* Create Assessment Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-10 shadow flex flex-col items-center border border-gray-100">
            <div className="bg-blue-100 p-6 rounded-full mb-6 shadow-lg">
              <FontAwesomeIcon icon={faPlus} className="text-4xl text-blue-600" />
            </div>
            <h2 className="font-bold text-xl text-blue-900 mb-2">Create Assessment</h2>
            <p className="text-gray-700 text-center mb-6">Start a new assessment for your class or subject.</p>
            <button className="bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-800 transition text-lg" onClick={() => setShowDialog(true)}>New Assessment</button>
          </div>
          {/* Manage Assessment Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-10 shadow flex flex-col items-center border border-gray-100">
            <div className="bg-blue-100 p-6 rounded-full mb-6 shadow-lg">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-4xl text-blue-600" />
            </div>
            <h2 className="font-bold text-xl text-blue-900 mb-2">Manage Assessment</h2>
            <p className="text-gray-700 text-center mb-6">See, edit, and manage all your assessments.</p>
            <button className="bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-800 transition text-lg" onClick={() => router.push('/assessment-question-bank/assessments/manage-tests')}>Manage Assessments</button>
          </div>
          {/* View Completed Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-10 shadow flex flex-col items-center border border-gray-100">
            <div className="bg-blue-100 p-6 rounded-full mb-6 shadow-lg">
              <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-blue-600" />
            </div>
            <h2 className="font-bold text-xl text-blue-900 mb-2">View Completed</h2>
            <p className="text-gray-700 text-center mb-6">Browse completed assessments and their results.</p>
            <button 
              onClick={() => router.push('/assessment-question-bank/assessments/completed')}
              className="bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-800 transition text-lg"
            >
              Completed Assessments
            </button>
          </div>
        </div>
        {/* Modal Dialog for Assessment Type Selection */}
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full relative flex flex-col items-center border border-gray-200">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-blue-500 text-2xl font-bold transition"
                onClick={() => setShowDialog(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Select Assessment Type</h2>
              <div className="flex flex-col gap-3 w-full">
                <button className="bg-blue-100 text-blue-900 px-5 py-3 rounded-lg font-medium border border-blue-100 hover:bg-blue-200 hover:text-blue-900 transition" onClick={() => { setShowDialog(false); router.push('/assessment-question-bank/assessments/custom-test-creation'); }}>Create Custom Test</button>
                <button className="bg-purple-100 text-purple-900 px-5 py-3 rounded-lg font-medium border border-purple-100 hover:bg-purple-200 hover:text-purple-900 transition" onClick={() => {/* handle NEET mock */}}>Create NEET MOCK</button>
                <button className="bg-green-100 text-green-900 px-5 py-3 rounded-lg font-medium border border-green-100 hover:bg-green-200 hover:text-green-900 transition" onClick={() => {/* handle JEE mock */}}>Create JEE Mock</button>
                <button className="bg-pink-100 text-pink-900 px-5 py-3 rounded-lg font-medium border border-pink-100 hover:bg-pink-200 hover:text-pink-900 transition" onClick={() => {/* handle PYQ test */}}>Create PYQ test</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 