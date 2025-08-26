"use client";
import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThLarge,
  faBookOpen,
  faBookmark,
  faBook,
  faClipboardList,
  faCalendarAlt,
  faComments,
  faSignOutAlt,
  faArrowLeft,
  faChevronDown,
  faChevronRight,
  faGraduationCap,
  faList,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebaseClient";

interface SubNavItem {
  name: string;
  icon: any;
  href: string;
  badge?: number;
}

interface NavItem {
  name: string;
  icon: any;
  href: string;
  subItems?: SubNavItem[];
}

const navItems: NavItem[] = [
  { name: "Dashboard", icon: faThLarge, href: "/learning-management" },
  { 
    name: "Subject Management", 
    icon: faBookOpen, 
    href: "/learning-management/subjects",
    subItems: [
      { name: "View Subjects", icon: faList, href: "/learning-management/subjects" },
      { name: "Add Subject", icon: faPlus, href: "/learning-management/subjects?action=add" },
    ]
  },
  { 
    name: "Chapter Management", 
    icon: faBookmark, 
    href: "/learning-management/chapters",
    subItems: [
      { name: "View Chapters", icon: faList, href: "/learning-management/chapters" },
      { name: "Add Chapter", icon: faPlus, href: "/learning-management/chapters?action=add" },
    ]
  },
  { 
    name: "Lesson Management", 
    icon: faBook, 
    href: "/learning-management/lessons",
    subItems: [
      { name: "View Lessons", icon: faList, href: "/learning-management/lessons" },
      { name: "Add Lesson", icon: faPlus, href: "/learning-management/lessons?action=add" },
    ]
  },
  { name: "Assignment Management", icon: faClipboardList, href: "/learning-management/assignments" },
  { name: "Diary Management", icon: faCalendarAlt, href: "/learning-management/diary" },
  { name: "Discussion Management", icon: faComments, href: "/learning-management/discussions" },
];

export default function LearningManagementSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActiveItem = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isParentActive = (item: NavItem) => {
    if (isActiveItem(item.href)) return true;
    if (item.subItems) {
      return item.subItems.some(subItem => isActiveItem(subItem.href));
    }
    return false;
  };

  return (
    <aside className="h-screen w-72 bg-white border-r border-gray-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#007dc6] rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faGraduationCap} className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-gray-900 font-bold text-lg">Learning</h2>
              <p className="text-gray-600 text-sm">Management</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/classaScreen")}
            className="p-2 text-gray-500 hover:text-[#007dc6] hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Back to Main"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {navItems.map((item) => (
            <div key={item.name} className="group">
              <div
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isParentActive(item)
                    ? "bg-blue-50 text-[#007dc6] font-bold shadow-sm"
                    : "text-gray-700 hover:bg-blue-50 hover:text-[#007dc6]"
                }`}
                onClick={() => {
                  if (item.subItems) {
                    toggleExpanded(item.name);
                  } else {
                    router.push(item.href);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isParentActive(item) 
                      ? "bg-[#007dc6] text-white" 
                      : "bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-[#007dc6]"
                  }`}>
                    <FontAwesomeIcon icon={item.icon} className="text-sm" />
                  </div>
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                
                {item.subItems && (
                  <FontAwesomeIcon
                    icon={expandedItems.includes(item.name) ? faChevronDown : faChevronRight}
                    className={`text-xs transition-transform duration-200 ${
                      expandedItems.includes(item.name) ? "rotate-0" : "rotate-0"
                    }`}
                  />
                )}
              </div>

              {/* Sub Items */}
              {item.subItems && (
                <div className={`overflow-hidden transition-all duration-300 ${
                  expandedItems.includes(item.name) 
                    ? "max-h-96 opacity-100 mt-2" 
                    : "max-h-0 opacity-0"
                }`}>
                  <div className="ml-6 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 text-sm ${
                          isActiveItem(subItem.href)
                            ? "bg-[#007dc6] text-white shadow-sm"
                            : "text-gray-600 hover:bg-blue-50 hover:text-[#007dc6]"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                          isActiveItem(subItem.href)
                            ? "bg-blue-500"
                            : "bg-gray-200"
                        }`}>
                          <FontAwesomeIcon icon={subItem.icon} className="text-xs" />
                        </div>
                        <span>{subItem.name}</span>
                        {subItem.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {subItem.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-3 text-gray-700 hover:text-[#007dc6] hover:bg-blue-50 rounded-xl transition-all duration-200"
        >
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
          </div>
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
} 