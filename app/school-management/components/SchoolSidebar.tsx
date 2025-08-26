"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThLarge,
  faGraduationCap,
  faChalkboardTeacher,
  faUsers,
  faSignOutAlt,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebaseClient";

const navItems = [
  { name: "Dashboard", icon: faThLarge, href: "/school-management" },
  { name: "Class Management", icon: faGraduationCap, href: "/school-management/classes" },
  { name: "Teacher Management", icon: faChalkboardTeacher, href: "/school-management/teachers" },
  { name: "Student Management", icon: faUsers, href: "/school-management/students" },
];

export default function SchoolSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <aside className="flex flex-col justify-between bg-white w-64 min-h-screen px-4 py-8 border-r border-gray-200 shadow-sm">
      <div>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/classaScreen")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span className="text-sm">Back to Main</span>
          </button>
        </div>
        
        <div className="flex items-center justify-left mb-4">
          <img
            src="/assets/images/classa logo.png"
            alt="Classa Logo"
            className="object-contain h-22 w-46"
          />
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">School Management</h2>
          <p className="text-sm text-gray-600">Manage classes, teachers, and school operations</p>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition font-medium text-base ${
                pathname === item.href
                  ? "bg-blue-50 text-[#007dc6] font-bold"
                  : "text-gray-700 hover:bg-blue-50 hover:text-[#007dc6]"
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="text-lg" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-[#007dc6] hover:bg-blue-50 transition font-medium text-base"
      >
        <FontAwesomeIcon icon={faSignOutAlt} className="text-lg" />
        Sign Out
      </button>
    </aside>
  );
} 