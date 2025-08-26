"use client";
import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const stats = [
  { label: "Students", value: 15000, icon: "/icons/students.svg" },
  { label: "Teachers", value: 200, icon: "/icons/teachers.svg" },
  { label: "Awards", value: 5600, icon: "/icons/awards.svg" },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-10 flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome.</h1>
            <p className="text-base text-gray-500 font-medium">Navigate the future of education with Schoooli.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl shadow p-6 flex flex-col items-center justify-center">
                <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-full bg-purple-100">
                  {/* Replace with <img src={stat.icon} ... /> or Heroicon if available */}
                  <span className="text-purple-600 text-2xl font-bold">{stat.value.toString().charAt(0)}</span>
                </div>
                <div className="text-2xl font-extrabold text-gray-800 mb-1">{stat.value.toLocaleString()}</div>
                <div className="text-md text-gray-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
} 