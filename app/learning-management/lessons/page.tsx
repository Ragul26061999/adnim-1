"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import LearningManagementSidebar from "../components/LearningManagementSidebar";
import LessonForm from "../../components/forms/LessonForm";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faBook,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

interface Lesson {
  id: string;
  name: string;
  description: string;
  content: string;
  subjectId: string;
  chapterId: string;
  orderIndex: number;
  createdAt: any;
  updatedAt?: any;
}

interface LessonWithDetails extends Lesson {
  subjectName: string;
  chapterName: string;
}

export default function LessonManagementPage() {
  const { schoolId, loading: authLoading } = useAuth();
  const [lessons, setLessons] = useState<LessonWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    console.log("AuthContext state:", { schoolId, authLoading });
    
    if (!authLoading) {
      if (schoolId) {
        fetchLessons();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator or teacher.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchLessons = async () => {
    if (!schoolId) return;

    console.log("Fetching lessons for school:", schoolId);
    setLoading(true);
    setError("");
    
    try {
      const lessonsQuery = query(
        collection(db, "lessons"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const lessonsSnapshot = await getDocs(lessonsQuery);
      console.log("Lessons found:", lessonsSnapshot.size);
      
      const lessonPromises = lessonsSnapshot.docs.map(async (lessonDoc) => {
        const lessonData = lessonDoc.data();
        const lesson: Lesson = {
          id: lessonDoc.id,
          name: lessonData.name,
          description: lessonData.description || "",
          content: lessonData.content || "",
          subjectId: lessonData.subjectId?.id || lessonData.subjectId,
          chapterId: lessonData.chapterId?.id || lessonData.chapterId,
          orderIndex: lessonData.orderIndex || 0,
          createdAt: lessonData.createdAt,
          updatedAt: lessonData.updatedAt,
        };

        // Fetch subject name
        let subjectName = lesson.subjectId;
        try {
          if (lesson.subjectId) {
            const subjectDoc = await getDoc(doc(db, "subjects", lesson.subjectId));
            if (subjectDoc.exists()) {
              subjectName = subjectDoc.data().name;
            }
          }
        } catch (error) {
          console.error("Error fetching subject name:", error);
        }

        // Fetch chapter name
        let chapterName = lesson.chapterId;
        try {
          if (lesson.chapterId) {
            const chapterDoc = await getDoc(doc(db, "chapters", lesson.chapterId));
            if (chapterDoc.exists()) {
              chapterName = chapterDoc.data().name;
            }
          }
        } catch (error) {
          console.error("Error fetching chapter name:", error);
        }

        return {
          ...lesson,
          subjectName: subjectName || "Unknown Subject",
          chapterName: chapterName || "Unknown Chapter",
        };
      });

      const lessonsWithDetails = await Promise.all(lessonPromises);
      // Sort by subject name, then by chapter name, then by order index
      lessonsWithDetails.sort((a, b) => {
        const subjectNameA = a.subjectName || "Unknown Subject";
        const subjectNameB = b.subjectName || "Unknown Subject";
        const chapterNameA = a.chapterName || "Unknown Chapter";
        const chapterNameB = b.chapterName || "Unknown Chapter";
        
        if (subjectNameA !== subjectNameB) {
          return subjectNameA.localeCompare(subjectNameB);
        }
        if (chapterNameA !== chapterNameB) {
          return chapterNameA.localeCompare(chapterNameB);
        }
        return a.orderIndex - b.orderIndex;
      });
      setLessons(lessonsWithDetails);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      setError("Failed to load lessons. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "lessons", lessonId));
      setLessons(lessons.filter(lesson => lesson.id !== lessonId));
    } catch (error) {
      console.error("Error deleting lesson:", error);
      setError("Failed to delete lesson");
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLesson(null);
    fetchLessons();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingLesson(null);
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show error if no school ID
  if (!schoolId) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <LearningManagementSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-4xl mb-4" />
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600 mb-4">
                You don't have permission to access this page. Please ensure you're logged in as a school administrator or teacher.
              </p>
              <button
                onClick={() => window.location.href = "/login"}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LearningManagementSidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Lesson Management</h1>
              <p className="text-gray-600">Manage lessons within chapters</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Lesson
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchLessons()}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try Again
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size="large" />
                <p className="mt-4 text-gray-600">Loading lessons...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lesson Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chapter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lessons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <FontAwesomeIcon icon={faBook} className="text-4xl text-gray-300 mb-4" />
                            <p className="text-lg font-medium mb-2">No lessons found</p>
                            <p className="text-sm">Create your first lesson to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      lessons.map((lesson) => (
                        <tr key={lesson.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {lesson.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {lesson.subjectName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {lesson.chapterName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {lesson.description || "No description"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {lesson.orderIndex}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {lesson.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditLesson(lesson)}
                                className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50 transition-colors"
                                title="Edit lesson"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                                title="Delete lesson"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <LessonForm
                lessonId={editingLesson?.id}
                initialData={editingLesson ? {
                  name: editingLesson.name,
                  description: editingLesson.description,
                  content: editingLesson.content,
                  subjectId: editingLesson.subjectId,
                  chapterId: editingLesson.chapterId,
                  orderIndex: editingLesson.orderIndex,
                } : undefined}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 