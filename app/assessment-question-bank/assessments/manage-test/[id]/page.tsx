// Single Test Management Page
"use client";
import * as React from "react";
import Sidebar from "../../../components/Sidebar";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

const pastelStatus = {
  published: "bg-blue-100 text-blue-700",
  drafted: "bg-gray-100 text-gray-700",
  ongoing: "bg-green-100 text-green-700",
  finished: "bg-pink-100 text-pink-700",
};

function getStatus(test: any) {
  const now = new Date();
  if (test.end && new Date(test.end) < now) return "finished";
  if (test.start && new Date(test.start) < now && test.end && new Date(test.end) > now) return "ongoing";
  if (test.online) return "published";
  return "drafted";
}

export default function ManageSingleTestPage() {
  const { id } = useParams();
  const router = useRouter();
  const [test, setTest] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const testSnap = await getDoc(doc(db, "test", id as string));
        if (!testSnap.exists()) throw new Error("Test not found");
        const data = testSnap.data();
        setTest({ ...data, id: testSnap.id });
      } catch (err: any) {
        setError(err.message || "Failed to fetch test.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const status = test ? getStatus(test) : "drafted";

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 bg-gray-50 flex flex-col items-center p-10">
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl font-extrabold text-blue-700 mb-6 text-center">Manage Test</h1>
          {error && <div className="text-red-500 text-center mb-4">{error}</div>}
          {loading ? (
            <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>
          ) : test && (
            <div className="bg-white/80 rounded-2xl shadow p-8 border border-blue-100 flex flex-col gap-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold text-blue-800">{test.name}</div>
                <span className={`px-4 py-1 rounded-full text-sm font-semibold ${pastelStatus[status] || pastelStatus.drafted}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </div>
              <div className="flex flex-wrap gap-6 text-blue-900 text-base">
                <div><span className="font-semibold">Class:</span> {test.classId?.id || '-'}</div>
                <div><span className="font-semibold">Start:</span> {test.start ? new Date(test.start).toLocaleString() : '-'}</div>
                <div><span className="font-semibold">End:</span> {test.end ? new Date(test.end).toLocaleString() : '-'}</div>
                <div><span className="font-semibold">Total Questions:</span> {test.totalQuestions || '-'}</div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 justify-center">
                <button className="bg-blue-100 text-blue-700 px-5 py-2 rounded-lg font-medium hover:bg-blue-200 transition" onClick={() => {/* Select Questions */}}>Select Questions</button>
                <button className="bg-purple-100 text-purple-700 px-5 py-2 rounded-lg font-medium hover:bg-purple-200 transition" onClick={() => {/* Prepare PDF */}}>Prepare PDF</button>
                <button className="bg-green-100 text-green-700 px-5 py-2 rounded-lg font-medium hover:bg-green-200 transition" onClick={() => {/* Generate Report */}}>Generate Report</button>
                <button className="bg-pink-100 text-pink-700 px-5 py-2 rounded-lg font-medium hover:bg-pink-200 transition" onClick={() => {/* Publish Test */}}>Publish</button>
                <button className="bg-red-100 text-red-700 px-5 py-2 rounded-lg font-medium hover:bg-red-200 transition" onClick={() => {/* Delete Test */}}>Delete</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 