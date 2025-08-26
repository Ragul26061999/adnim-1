"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThLarge,
  faBookOpen,
  faUsers,
  faHeadphonesAlt,
  faSignOutAlt,
  faFileAlt,
  faVideo,
  faChalkboardTeacher,
} from "@fortawesome/free-solid-svg-icons";
import ContentSidebar from "./components/ContentSidebar";

const navItems = [
  { name: "Dashboard", icon: faThLarge },
  { name: "Manage School Content", icon: faBookOpen },
  { name: "Edueron Content", icon: faUsers },
  { name: "Help Center", icon: faHeadphonesAlt },
];

export default function ManageSchoolContent() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <ContentSidebar />
      <main className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-10">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Content Management</h1>
        <p className="text-gray-500 mb-10">Manage your school content and Edueron resources here.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl">
          {/* Manage School Content Card */}
          <div className="bg-gradient-to-br from-blue-200 to-blue-100/80 backdrop-blur-lg rounded-3xl p-10 shadow-2xl flex flex-col items-center border border-blue-100 glass-card hover:scale-105 transition-transform duration-300">
            <div className="bg-blue-500/90 p-6 rounded-full mb-6 shadow-lg">
              <FontAwesomeIcon icon={faBookOpen} className="text-5xl text-white" />
            </div>
            <h2 className="font-bold text-2xl text-blue-900 mb-2">Manage School Content</h2>
            <p className="text-gray-700 text-center mb-6">Upload notes, videos, and manage lessons for your school in one place.</p>
            <button
              className="bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-800 transition text-lg"
              onClick={() => router.push("/content-management/manage-school-content")}
            >
              Go to School Content
            </button>
          </div>
          {/* View Edueron Content Card */}
          <div className="bg-gradient-to-br from-purple-200 to-pink-100/80 backdrop-blur-lg rounded-3xl p-10 shadow-2xl flex flex-col items-center border border-pink-100 glass-card hover:scale-105 transition-transform duration-300">
            <div className="bg-purple-500/90 p-6 rounded-full mb-6 shadow-lg">
              <FontAwesomeIcon icon={faUsers} className="text-5xl text-white" />
            </div>
            <h2 className="font-bold text-2xl text-purple-900 mb-2">View Edueron Content</h2>
            <p className="text-gray-700 text-center mb-6">Browse premium Edueron resources, curated for your institution.</p>
            <button
              className="bg-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:bg-purple-800 transition text-lg"
              onClick={() => router.push("/content-management/edueron-content")}
            >
              Go to Edueron Content
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 