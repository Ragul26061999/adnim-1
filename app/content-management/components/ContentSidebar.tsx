"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThLarge,
  faBookOpen,
  faUsers,
  faHeadphonesAlt,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { name: "Dashboard", icon: faThLarge, href: "/content-management" },
  { name: "Manage School Content", icon: faBookOpen, href: "/content-management/manage-school-content" },
  { name: "Edueron Content", icon: faUsers, href: "/content-management/edueron-content" },
  { name: "Help Center", icon: faHeadphonesAlt, href: "#" },
];

export default function ContentSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <aside className="flex flex-col justify-between bg-white w-64 min-h-screen px-4 py-8 border-r border-gray-200 shadow-sm">
      <div>
        <div
          className="flex items-center justify-left cursor-pointer select-none mb-2"
          onClick={() => router.push("/classaScreen")}
        >
          <img 
            src="/assets/images/classa logo.png" 
            alt="Edueron Logo" 
            className="object-contain h-22 w-46" 
          />
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
      <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-[#007dc6] hover:bg-blue-50 transition font-medium text-base">
        <FontAwesomeIcon icon={faSignOutAlt} className="text-lg" />
        Log Out
      </a>
    </aside>
  );
} 