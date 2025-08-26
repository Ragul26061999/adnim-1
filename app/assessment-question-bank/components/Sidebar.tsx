"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faBook,
  faTasks,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebaseClient";

const navItems = [
  {
    name: "Dashboard",
    icon: faChartBar,
    href: "/assessment-question-bank/dashboard",
  },
  {
    name: "Question Bank",
    icon: faBook,
    href: "/assessment-question-bank/question-bank",
  },
  {
    name: "Assessments",
    icon: faTasks,
    href: "/assessment-question-bank/assessments",
  },
  {
    name: "Results",
    icon: faChartBar,
    href: "/assessment-question-bank/results",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <aside className="flex flex-col justify-between bg-white w-64 min-h-screen px-4 py-8 border-r border-gray-200 shadow-sm">
      <div>
        <div
          className="flex items-center justify-left mb-8 cursor-pointer select-none"
          onClick={() => router.push("/classaScreen")}
        >
          <img
            src="/assets/images/classa logo.png"
            alt="Classa Logo"
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
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-4 py-3 mt-8 rounded-xl text-gray-400 hover:text-[#007dc6] hover:bg-blue-50 transition font-medium text-base"
      >
        <FontAwesomeIcon icon={faSignOutAlt} className="text-lg" />
        Sign Out
      </button>
    </aside>
  );
}
