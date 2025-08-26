"use client";
import * as React from "react";
import Sidebar from "../components/Sidebar";
import { useRouter, useSearchParams } from "next/navigation";

const classes = [
  { id: "class1", name: "Class 10" },
  { id: "class2", name: "Class 11" },
  { id: "class3", name: "Class 12" },
];

export default function CreateTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testType = searchParams.get("type") || "Custom Test";
  const [testName, setTestName] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [selectedClass, setSelectedClass] = React.useState("");
  const [studentMode, setStudentMode] = React.useState("whole");

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-10">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h1 className="text-2xl font-bold text-blue-700 mb-2 text-center">Create {testType}</h1>
          <form className="flex flex-col gap-6 mt-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Test Name</label>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
                placeholder="Enter test name"
                value={testName}
                onChange={e => setTestName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-gray-700 font-semibold mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-gray-700 font-semibold mb-1">End Time</label>
                <input
                  type="datetime-local"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Select Class</label>
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 mb-2">Assign To</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="studentMode"
                    value="whole"
                    checked={studentMode === "whole"}
                    onChange={() => setStudentMode("whole")}
                    className="accent-blue-600"
                  />
                  <span className="text-gray-700">Whole Class</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="studentMode"
                    value="selective"
                    checked={studentMode === "selective"}
                    onChange={() => setStudentMode("selective")}
                    className="accent-blue-600"
                  />
                  <span className="text-gray-700">Selective Students</span>
                </label>
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition text-lg"
            >
              Create Test
            </button>
          </form>
        </div>
      </main>
    </div>
  );
} 