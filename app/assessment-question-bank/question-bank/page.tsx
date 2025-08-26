"use client";
import * as React from "react";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faList, faUpload, faBook, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import { db } from '../../../lib/firebaseClient';
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { auth } from "../../../components/firebase";
import { doc, getDoc } from "firebase/firestore";

const SCHOOL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const EDUERON_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const PYQ_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCachedCount(key: string, ttl: number): number | null {
  if (typeof window === 'undefined') return null;
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    const { value, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp < ttl) {
      return value;
    }
  } catch {}
  return null;
}

function setCachedCount(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
}

export default function QuestionBankDashboard() {
  const router = useRouter();
  const [schoolCount, setSchoolCount] = useState<number | null>(null);
  const [edueronCount, setEdueronCount] = useState<number | null>(null);
  const [pyqCount, setPyqCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchSchoolCount() {
      const cacheKey = "schoolCount";
      const cached = getCachedCount(cacheKey, SCHOOL_CACHE_TTL);
      if (cached !== null) {
        setSchoolCount(cached);
        return;
      }
      try {
        const user = auth.currentUser;
        if (!user) return setSchoolCount(null);
        // Fetch user doc to get schoolId (as a DocumentReference)
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const schoolRef = userSnap.exists() ? userSnap.data().schoolId : null;
        if (!schoolRef) return setSchoolCount(null);
        // Query questionCollection for this school
        const q = query(collection(db, "questionCollection"), where("schoolID", "==", schoolRef));
        const snap = await getCountFromServer(q);
        setSchoolCount(snap.data().count);
        setCachedCount(cacheKey, snap.data().count);
      } catch {
        setSchoolCount(null);
      }
    }
    fetchSchoolCount();
  }, []);

  useEffect(() => {
    async function fetchCounts() {
      // Edueron
      const edueronCacheKey = "edueronCount";
      const edueronCached = getCachedCount(edueronCacheKey, EDUERON_CACHE_TTL);
      if (edueronCached !== null) {
        setEdueronCount(edueronCached);
      } else {
        try {
          const edueronQ = query(collection(db, "questionCollection"), where("sp", "==", true));
          const edueronSnap = await getCountFromServer(edueronQ);
          setEdueronCount(edueronSnap.data().count);
          setCachedCount(edueronCacheKey, edueronSnap.data().count);
        } catch {
          setEdueronCount(null);
        }
      }
      // PYQ
      const pyqCacheKey = "pyqCount";
      const pyqCached = getCachedCount(pyqCacheKey, PYQ_CACHE_TTL);
      if (pyqCached !== null) {
        setPyqCount(pyqCached);
      } else {
        try {
          const pyqQ = query(collection(db, "questionCollection"), where("previous", "==", true));
          const pyqSnap = await getCountFromServer(pyqQ);
          setPyqCount(pyqSnap.data().count);
          setCachedCount(pyqCacheKey, pyqSnap.data().count);
        } catch {
          setPyqCount(null);
        }
      }
    }
    fetchCounts();
  }, []);

  return (
    <div className="min-h-screen flex font-sans bg-[#F8F9FB]">
      <Sidebar />
      <main className="flex-1 bg-[#F8F9FB] flex flex-col items-center justify-center p-8 md:p-12 xl:p-16">
        <h1 className="text-3xl font-bold text-[#6C63FF] mb-2">Question Bank</h1>
        <p className="text-gray-500 mb-10">Organize, add, and edit questions for all your assessments.</p>
        {/* Count Containers Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-6xl mb-12">
          {/* Questions in School */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center">
            <div className="bg-[#C4B5FD] p-3 rounded-full mb-4">
              <FontAwesomeIcon icon={faBook} className="text-xl text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {schoolCount === null
                ? <span className="flex items-center justify-center"><svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg></span>
                : schoolCount.toLocaleString()}
            </div>
            <div className="text-gray-500">Questions in School</div>
          </div>
          {/* Questions in Edueron */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center">
            <div className="bg-[#6EE7B7] p-3 rounded-full mb-4">
              <FontAwesomeIcon icon={faLayerGroup} className="text-xl text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {edueronCount === null
                ? <span className="flex items-center justify-center"><svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg></span>
                : edueronCount.toLocaleString()}
            </div>
            <div className="text-gray-500">Questions in Edueron</div>
          </div>
          {/* Questions in PYQ */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center">
            <div className="bg-[#FBCFE8] p-3 rounded-full mb-4">
              <FontAwesomeIcon icon={faList} className="text-xl text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {pyqCount === null
                ? <span className="flex items-center justify-center"><svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg></span>
                : pyqCount.toLocaleString()}
            </div>
            <div className="text-gray-500">Questions in PYQ</div>
          </div>
          {/* Add Question */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center">
            <div className="bg-[#A5B4FC] p-3 rounded-full mb-4">
              <FontAwesomeIcon icon={faPlus} className="text-xl text-white" />
            </div>
            <button className="bg-[#6C63FF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#4338CA] transition text-base">Add Question</button>
          </div>
        </div>
        {/* Action Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl">
          {/* View School Questions */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center min-w-[260px]">
            <div className="bg-[#C4B5FD] p-3 rounded-full mb-4">
              <FontAwesomeIcon icon={faBook} className="text-xl text-white" />
            </div>
            <h2 className="font-bold text-lg text-gray-800 mb-2 text-center">View School Questions</h2>
            <p className="text-gray-500 text-center mb-6">Browse and manage all questions created by your school.</p>
            <button className="bg-[#6C63FF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#4338CA] transition text-base">View</button>
          </div>
          {/* View Edueron Questions */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center min-w-[260px]">
            <div className="bg-[#6EE7B7] p-3 rounded-full mb-4">
              <FontAwesomeIcon icon={faLayerGroup} className="text-xl text-white" />
            </div>
            <h2 className="font-bold text-lg text-gray-800 mb-2 text-center">View Edueron Questions</h2>
            <p className="text-gray-500 text-center mb-6">Explore Edueron's curated question bank for your use.</p>
            <button className="bg-[#6EE7B7] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#059669] transition text-base" onClick={() => router.push('/assessment-question-bank/questionbank/view-edueron-questions')}>View</button>
          </div>
          {/* View PYQ */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center min-w-[260px]">
            <div className="bg-[#FBCFE8] p-3 rounded-full mb-4">
              <FontAwesomeIcon icon={faList} className="text-xl text-white" />
            </div>
            <h2 className="font-bold text-lg text-gray-800 mb-2 text-center">View PYQ</h2>
            <p className="text-gray-500 text-center mb-6">Access previous year questions for NEET and JEE exams.</p>
            <button className="bg-[#FBCFE8] text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-[#F472B6] transition text-base" onClick={() => router.push('/assessment-question-bank/pyq')}>View</button>
          </div>
          {/* Bulk Upload */}
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center min-w-[260px]">
            <div className="bg-[#A5B4FC] p-3 rounded-full mb-4">
              <FontAwesomeIcon icon={faUpload} className="text-xl text-white" />
            </div>
            <h2 className="font-bold text-lg text-gray-800 mb-2 text-center">Bulk Upload</h2>
            <p className="text-gray-500 text-center mb-6">Upload multiple questions at once using a file.</p>
            <button className="bg-[#A5B4FC] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#6C63FF] transition text-base">Upload</button>
          </div>
        </div>
      </main>
    </div>
  );
} 