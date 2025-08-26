"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ContentSidebar from "../components/ContentSidebar";
import { db } from "../../../lib/firebaseClient";
import { collection, getDocs, query, where, doc } from "firebase/firestore";

interface Lesson {
  id: string;
  name: string;
  image?: string;
}

export default function LessonList() {
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapterId");
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLessons() {
      setLoading(true);
      try {
        if (!chapterId) return setLessons([]);
        const chapterRef = doc(db, "chapters", chapterId);
        const q = query(collection(db, "lessons"), where("chapterID", "==", chapterRef));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: d.name || d.title || "",
            image: d.image || d.coverImg || d.icon || "",
          };
        });
        setLessons(data);
      } catch {
        setLessons([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLessons();
  }, [chapterId]);

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <ContentSidebar />
      <main className="flex-1 bg-gray-50 p-10">
        <h1 className="text-3xl font-bold text-[#007dc6] mb-8">Lessons</h1>
        {loading ? (
          <div className="text-center text-gray-400 text-lg py-20">Loading lessons...</div>
        ) : lessons.length === 0 ? (
          <div className="text-center text-gray-400 text-lg py-20">No lessons found for this chapter.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white/80 backdrop-blur-md rounded-2xl shadow border border-gray-100 flex flex-col items-center p-4 gap-2 hover:shadow-xl transition group cursor-pointer"
                onClick={() => router.push(`/content-management/lesson-details?lessonId=${lesson.id}`)}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {lesson.image ? (
                    <img
                      src={lesson.image}
                      alt={lesson.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl text-gray-300">
                      <i className="fa fa-book-open" />
                    </span>
                  )}
                </div>
                <div className="text-base font-semibold text-gray-800 group-hover:text-[#007dc6] text-center">
                  {lesson.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 