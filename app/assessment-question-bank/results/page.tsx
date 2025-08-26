"use client";
import * as React from "react";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faFileDownload,
  faChartPie,
  faCheckCircle,
  faUserFriends,
  faClipboardList,
  faPenFancy,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";
import { db } from "@/lib/firebaseClient";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export default function ResultsDashboard() {
  const router = useRouter();
  const [tests, setTests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userSchoolId, setUserSchoolId] = React.useState<string | null>(null);
  const [selectedTest, setSelectedTest] = React.useState<any | null>(null);

  const CACHE_KEY = "results_tests_cache";
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        if (userData && userData.schoolId) {
          // schoolId is a DocumentReference
          setUserSchoolId(userData.schoolId.path);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      // Try cache first
      let cached: { value: any[]; timestamp: number } | null = null;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) cached = JSON.parse(raw);
      } catch {}
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setTests(cached.value);
        setLoading(false);
        return;
      }
      // Fetch from Firestore
      const snap = await getDocs(collection(db, "test"));
      const testList: any[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        testList.push({
          id: docSnap.id,
          name: d.name,
          start: d.start?.toDate ? d.start.toDate() : d.start,
          end: d.end?.toDate ? d.end.toDate() : d.end,
          online: d.online,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt,
          schoolId:
            d.schoolID?.path ||
            (typeof d.schoolID === "string" ? d.schoolID : null),
        });
      });
      setTests(testList);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ value: testList, timestamp: Date.now() })
        );
      } catch {}
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const filteredTests = userSchoolId
    ? tests.filter((t) => t.schoolId === userSchoolId)
    : [];
  const sortedByEnd = [...filteredTests].sort(
    (a, b) =>
      (b.end ? new Date(b.end).getTime() : 0) -
      (a.end ? new Date(a.end).getTime() : 0)
  );
  const last5Tests = sortedByEnd.slice(0, 5);
  const completedCount = filteredTests.filter(
    (t) => t.end && new Date(t.end) < now
  ).length;
  const draftedCount = filteredTests.filter((t) => t.online === false).length;
  const upcomingTests = filteredTests.filter(
    (t) => t.start && new Date(t.start) > now
  );

  // Handler for View button
  const handleViewResults = () => {
    // For now, just navigate to /assessment-question-bank/results/view
    router.push("/assessment-question-bank/results/view");
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#F8F9FB]">
      <Sidebar />
      <main className="flex-1 bg-[#F8F9FB] flex flex-col items-center justify-center p-8 md:p-12 xl:p-16">
        <h1 className="text-3xl font-bold text-[#22A699] mb-2 text-center">
          Results & Reports
        </h1>
        <p className="text-gray-500 mb-10 text-center">
          View results, analytics, and download detailed reports.
        </p>
        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full max-w-6xl mb-12">
          {/* Last 5 Tests */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-start min-w-[220px]">
            <div className="bg-[#A5B4FC] p-3 rounded-full mb-4 self-center">
              <FontAwesomeIcon
                icon={faClipboardList}
                className="text-xl text-white"
              />
            </div>
            <div className="text-lg font-bold text-gray-800 mb-2 text-center w-full">
              Last 5 Tests
            </div>
            <ul className="text-xs text-gray-500 pl-2">
              {last5Tests.map((test) => (
                <li key={test.id} className="mb-1 list-disc list-inside">
                  {test.name} <span className="text-gray-300">|</span>{" "}
                  {test.end ? new Date(test.end).toLocaleDateString() : "-"}
                </li>
              ))}
            </ul>
          </div>
          {/* Tests Completed */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center min-w-[220px]">
            <div className="bg-[#6EE7B7] p-3 rounded-full mb-4">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="text-xl text-white"
              />
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1 text-center w-full">
              {completedCount}
            </div>
            <div className="text-gray-500 text-center w-full">
              Tests Completed
            </div>
          </div>
          {/* Drafted Tests */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center min-w-[220px]">
            <div className="bg-[#A5B4FC] p-3 rounded-full mb-4">
              <FontAwesomeIcon
                icon={faPenFancy}
                className="text-xl text-white"
              />
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1 text-center w-full">
              {draftedCount}
            </div>
            <div className="text-gray-500 text-center w-full">
              Drafted Tests
            </div>
          </div>
          {/* Upcoming Tests */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-start min-w-[220px]">
            <div className="bg-[#FBCFE8] p-3 rounded-full mb-4 self-center">
              <FontAwesomeIcon
                icon={faCalendarAlt}
                className="text-xl text-white"
              />
            </div>
            <div className="text-lg font-bold text-gray-800 mb-2 text-center w-full">
              Upcoming Tests
            </div>
            {upcomingTests.length === 0 ? (
              <div className="text-xs text-gray-400 pl-2 text-center w-full">
                No upcoming tests
              </div>
            ) : (
              <ul className="text-xs text-gray-500 pl-2">
                {upcomingTests.slice(0, 5).map((test) => (
                  <li key={test.id} className="mb-1 list-disc list-inside">
                    {test.name} <span className="text-gray-300">|</span>{" "}
                    {test.start
                      ? new Date(test.start).toLocaleDateString()
                      : "-"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* Action Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
          {/* View Results */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center min-w-[260px]">
            <div className="bg-[#6EE7B7] p-3 rounded-full mb-4">
              <FontAwesomeIcon
                icon={faChartBar}
                className="text-xl text-white"
              />
            </div>
            <h2 className="font-bold text-lg text-gray-800 mb-2 text-center w-full">
              View Results
            </h2>
            <p className="text-gray-500 text-center mb-6">
              See all student results for your assessments.
            </p>
            <button
              className="bg-[#6EE7B7] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#059669] transition text-base"
              onClick={handleViewResults}
            >
              View
            </button>
          </div>
          {/* Analytics Overview */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center min-w-[260px]">
            <div className="bg-[#A5B4FC] p-3 rounded-full mb-4">
              <FontAwesomeIcon
                icon={faChartPie}
                className="text-xl text-white"
              />
            </div>
            <h2 className="font-bold text-lg text-gray-800 mb-2 text-center w-full">
              Analytics Overview
            </h2>
            <p className="text-gray-500 text-center mb-6">
              Get a quick overview of assessment analytics.
            </p>
            <button className="bg-[#A5B4FC] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#6C63FF] transition text-base">
              View
            </button>
          </div>
          {/* Download Reports */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center min-w-[260px]">
            <div className="bg-[#FDE68A] p-3 rounded-full mb-4">
              <FontAwesomeIcon
                icon={faFileDownload}
                className="text-xl text-white"
              />
            </div>
            <h2 className="font-bold text-lg text-gray-800 mb-2 text-center w-full">
              Download Reports
            </h2>
            <p className="text-gray-500 text-center mb-6">
              Download detailed reports for offline analysis.
            </p>
            <button className="bg-[#FDE68A] text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-[#FBBF24] transition text-base">
              Download
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
