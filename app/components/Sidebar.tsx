import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThLarge,
  faBookOpen,
  faGraduationCap,
  faClipboardList,
  faSchool,
  faGraduationCap as faLearning,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: faThLarge },
  { name: "Content Management", href: "/content-management", icon: faBookOpen },
  { name: "Assessment & QB", href: "/assessment-question-bank", icon: faClipboardList },
  { name: "School Management", href: "/school-management", icon: faSchool },
  { name: "Learning Management", href: "/learning-management", icon: faLearning },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="h-screen w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col py-8 px-4">
      <div className="flex items-center justify-center mb-8">
        <img
          src="/assets/images/edueronLogo.png"
          alt="Edueron Logo"
          className="object-contain h-16 w-32"
        />
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-base transition ${
              pathname === item.href || pathname.startsWith(item.href)
                ? "bg-blue-50 text-[#007dc6] font-bold"
                : "text-gray-700 hover:bg-blue-50 hover:text-[#007dc6]"
            }`}
          >
            <FontAwesomeIcon icon={item.icon} className="text-lg" />
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
} 