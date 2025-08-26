"use client";
import React, { useState, useEffect } from "react";
import ContentSidebar from "../components/ContentSidebar";
import { db } from "../../../lib/firebaseClient";
import { collection, getDocs, query, where, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

// Types
interface Chapter {
  id: string;
  name: string;
  topics: string[];
  image?: string;
  number?: number;
}
interface Subject {
  id: string;
  name: string;
  description?: string;
  image?: string;
  ref: any; // DocumentReference
}

// Mock data fallback
const mockSubjects: Subject[] = [
  { id: "1", name: "Chemistry - 12th", ref: null },
  { id: "2", name: "Biology - 12th", ref: null },
  { id: "3", name: "Physics - 12th", ref: null },
  { id: "4", name: "Chemistry - 11th", ref: null },
  { id: "5", name: "Biology - 11th", ref: null },
  { id: "6", name: "Physics - 11th", ref: null },
];
const mockChapters: Record<string, Chapter[]> = {
  "2": [
    {
      id: "1",
      name: "Sexual Reproduction in Flowering Plants",
      topics: [
        "Double Fertilization",
        "Flower Structure",
        "Apomixis & Polyembryony",
      ],
    },
    {
      id: "2",
      name: "Human Reproduction",
      topics: [
        "Male Reproductive System",
        "Female Reproductive System",
        "Menstrual Cycle",
        "Gametogenesis",
      ],
    },
  ],
  "1": [
    {
      id: "1",
      name: "Organic Chemistry",
      topics: ["Hydrocarbons", "Alcohols", "Aldehydes"],
    },
  ],
};

export default function EdueronContent() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const q = query(collection(db, "subjects"), where("sp", "==", true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: d.name || "",
            description: d.description || "",
            image: d.image || "",
            ref: docSnap.ref,
          };
        });
        setSubjects(data);
        setSelectedSubject(data[0] ?? null);
      } catch {
        setSubjects([]);
        setSelectedSubject(null);
      }
    }
    fetchSubjects();
  }, []);

  useEffect(() => {
    async function fetchChapters() {
      if (!selectedSubject) return setChapters([]);
      try {
        const q = query(
          collection(db, "chapters"),
          where("subjectID", "==", selectedSubject.ref)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: d.name || "",
            topics: Array.isArray(d.topics) ? d.topics : [],
            image: d.image || "",
            number: typeof d.number === 'number' ? d.number : undefined,
          };
        });
        setChapters(data.sort((a, b) => (a.number ?? 0) - (b.number ?? 0)));
      } catch {
        setChapters([]);
      }
    }
    fetchChapters();
  }, [selectedSubject]);

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <ContentSidebar />
      {/* Main Content */}
      <main className="flex-1 bg-gray-50 p-10">
        <h1 className="text-3xl font-bold text-[#007dc6] mb-6">Edueron Content</h1>
        {/* Subject List (horizontal scroll) */}
      <div className="flex space-x-4 overflow-x-auto pb-4 mb-8">
        {subjects.map((subject) => (
          <button
            key={subject.id}
              onClick={() => setSelectedSubject(subject)}
            className={`min-w-[180px] flex flex-col items-center justify-center rounded-2xl shadow transition border-2 px-6 py-4 ${
                selectedSubject?.id === subject.id
                  ? "border-[#007dc6] bg-white"
                  : "border-gray-200 bg-blue-50 hover:bg-white"
            }`}
          >
              {subject.image && (
                <img src={subject.image} alt={subject.name} className="w-12 h-12 object-contain mb-2 rounded-full bg-blue-50" />
              )}
              <span className="font-semibold text-[#007dc6] text-lg">{subject.name}</span>
              {subject.description && (
                <span className="text-xs text-gray-500 mt-1 text-center">{subject.description}</span>
              )}
          </button>
        ))}
      </div>
      {/* Chapter List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {chapters.map((chapter: Chapter) => (
          <div
            key={chapter.id}
              className="bg-white rounded-2xl shadow border border-gray-100 flex flex-col md:flex-row p-4 gap-4 hover:shadow-lg transition cursor-pointer"
              onClick={() => router.push(`/content-management/lesson-list?chapterId=${chapter.id}`)}
          >
              {chapter.image && (
            <img
              src={chapter.image}
              alt={chapter.name}
                  className="w-20 h-20 object-cover rounded-xl p-2 mb-2 md:mb-0 md:mr-4"
            />
              )}
            <div className="flex-1 flex flex-col justify-center">
                <h2 className="font-bold text-black text-lg mb-2">{chapter.name}</h2>
                <div className="flex flex-col gap-2">
                  {chapter.topics.map((topic, idx) => (
                    <div key={idx} className="flex items-center text-gray-700">
                      <span className="mr-2">
                        <i className="fa fa-book-open text-[#007dc6]" />
                      </span>
                      {topic}
                    </div>
                  ))}
                </div>
            </div>
          </div>
        ))}
      </div>
      </main>
    </div>
  );
} 