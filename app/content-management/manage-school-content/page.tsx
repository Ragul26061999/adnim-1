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
import ContentSidebar from "../components/ContentSidebar";

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
      <main className="flex-1 bg-gray-50 p-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Manage School Content</h1>
          <p className="text-gray-500">Upload notes, videos, and manage lessons for your school here.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Notes */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow flex flex-col items-center border border-gray-100">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <FontAwesomeIcon icon={faFileAlt} className="text-3xl text-blue-600" />
            </div>
            <h2 className="font-semibold text-lg text-blue-800 mb-2">Upload Notes</h2>
            <p className="text-gray-500 text-center mb-4">Upload and manage your class notes for students to access anytime.</p>
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition"
              onClick={() => router.push("/content-management/manage-school-content/notes-management")}
            >
              Upload Notes
            </button>
          </div>
          {/* Upload Videos */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow flex flex-col items-center border border-gray-100">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <FontAwesomeIcon icon={faVideo} className="text-3xl text-blue-600" />
            </div>
            <h2 className="font-semibold text-lg text-blue-800 mb-2">Upload Videos</h2>
            <p className="text-gray-500 text-center mb-4">Share educational videos and lectures with your students easily.</p>
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition"
              onClick={() => router.push("/content-management/manage-school-content/video-management")}
            >
              Upload Videos
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 