"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import LearningManagementSidebar from "../components/LearningManagementSidebar";
import ChapterForm from "../../components/forms/ChapterForm";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faBookmark,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

interface Chapter {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  orderIndex: number;
  createdAt: any;
  updatedAt?: any;
}

interface ChapterWithDetails extends Chapter {
  subjectName: string;
}

export default function ChapterManagementPage() {
  const { schoolId, loading: authLoading } = useAuth();
  const [chapters, setChapters] = useState<ChapterWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    console.log("AuthContext state:", { schoolId, authLoading });
    
    if (!authLoading) {
      if (schoolId) {
        fetchChapters();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator or teacher.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchChapters = async () => {
    if (!schoolId) return;

    console.log("Fetching chapters for school:", schoolId);
    setLoading(true);
    setError("");
    
    try {
      const chaptersQuery = query(
        collection(db, "chapters"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const chaptersSnapshot = await getDocs(chaptersQuery);
      console.log("Chapters found:", chaptersSnapshot.size);
      
      const chapterPromises = chaptersSnapshot.docs.map(async (chapterDoc) => {
        const chapterData = chapterDoc.data();
        const chapter: Chapter = {
          id: chapterDoc.id,
          name: chapterData.name,
          description: chapterData.description || "",
          subjectId: chapterData.subjectId?.id || chapterData.subjectId,
          orderIndex: chapterData.orderIndex || 0,
          createdAt: chapterData.createdAt,
          updatedAt: chapterData.updatedAt,
        };

        // Fetch subject name
        let subjectName = chapter.subjectId;
        try {
          if (chapter.subjectId) {
            const subjectDoc = await getDoc(doc(db, "subjects", chapter.subjectId));
            if (subjectDoc.exists()) {
              subjectName = subjectDoc.data().name;
            }
          }
        } catch (error) {
          console.error("Error fetching subject name:", error);
        }

        return {
          ...chapter,
          subjectName: subjectName || "Unknown Subject",
        };
      });

      const chaptersWithDetails = await Promise.all(chapterPromises);
      // Sort by subject name, then by order index
      chaptersWithDetails.sort((a, b) => {
        const subjectNameA = a.subjectName || "Unknown Subject";
        const subjectNameB = b.subjectName || "Unknown Subject";
        
        if (subjectNameA !== subjectNameB) {
          return subjectNameA.localeCompare(subjectNameB);
        }
        return a.orderIndex - b.orderIndex;
      });
      setChapters(chaptersWithDetails);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      setError("Failed to load chapters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm("Are you sure you want to delete this chapter?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "chapters", chapterId));
      setChapters(chapters.filter(chapter => chapter.id !== chapterId));
    } catch (error) {
      console.error("Error deleting chapter:", error);
      setError("Failed to delete chapter");
    }
  };

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingChapter(null);
    fetchChapters();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingChapter(null);
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Chapter Management</h1>
              <p className="text-gray-600">Manage chapters within subjects</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Chapter
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchChapters()}
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
                <p className="mt-4 text-gray-600">Loading chapters...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chapter Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
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
                    {chapters.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <FontAwesomeIcon icon={faBookmark} className="text-4xl text-gray-300 mb-4" />
                            <p className="text-lg font-medium mb-2">No chapters found</p>
                            <p className="text-sm">Create your first chapter to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      chapters.map((chapter) => (
                        <tr key={chapter.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {chapter.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {chapter.subjectName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {chapter.description || "No description"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {chapter.orderIndex}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {chapter.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditChapter(chapter)}
                                className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50 transition-colors"
                                title="Edit chapter"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button
                                onClick={() => handleDeleteChapter(chapter.id)}
                                className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                                title="Delete chapter"
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
              <ChapterForm
                chapterId={editingChapter?.id}
                initialData={editingChapter ? {
                  name: editingChapter.name,
                  description: editingChapter.description,
                  subjectId: editingChapter.subjectId,
                  orderIndex: editingChapter.orderIndex,
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