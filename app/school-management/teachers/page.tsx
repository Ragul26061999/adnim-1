"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import SchoolSidebar from "../components/SchoolSidebar";
import TeacherForm from "../../components/forms/TeacherForm";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faChalkboardTeacher,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

interface Teacher {
  id: string;
  name: string;
  email: string;
  teacherId: string;
  userId: string;
  classes: string[];
  subjects: string[];
  createdAt: any;
  updatedAt?: any;
}

interface TeacherWithDetails extends Teacher {
  classNames: string[];
  subjectNames: string[];
}

export default function TeacherManagementPage() {
  const { schoolId, loading: authLoading } = useAuth();
  const [teachers, setTeachers] = useState<TeacherWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    console.log("AuthContext state:", { schoolId, authLoading });
    
    if (!authLoading) {
      if (schoolId) {
        fetchTeachers();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchTeachers = async () => {
    if (!schoolId) return;

    console.log("Fetching teachers for school:", schoolId);
    setLoading(true);
    setError("");
    
    try {
      const teachersQuery = query(
        collection(db, "teachers"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const teachersSnapshot = await getDocs(teachersQuery);
      console.log("Teachers found:", teachersSnapshot.size);
      
      const teacherPromises = teachersSnapshot.docs.map(async (teacherDoc) => {
        const teacherData = teacherDoc.data();
        const teacher: Teacher = {
          id: teacherDoc.id,
          name: teacherData.name || "",
          email: teacherData.email || "",
          teacherId: teacherData.teacherId,
          userId: teacherData.userId?.id || teacherData.userId,
          classes: teacherData.classes?.map((ref: any) => ref.id) || [],
          subjects: teacherData.subjects?.map((ref: any) => ref.id) || [],
          createdAt: teacherData.createdAt,
          updatedAt: teacherData.updatedAt,
        };

        // Fetch class names
        const classNames = await Promise.all(
          teacher.classes.map(async (classId) => {
            try {
              const classDoc = await getDoc(doc(db, "classes", classId));
              return classDoc.exists() ? classDoc.data().name : classId;
            } catch (error) {
              console.error("Error fetching class name:", error);
              return classId;
            }
          })
        );

        // Fetch subject names
        const subjectNames = await Promise.all(
          teacher.subjects.map(async (subjectId) => {
            try {
              const subjectDoc = await getDoc(doc(db, "subjects", subjectId));
              return subjectDoc.exists() ? subjectDoc.data().name : subjectId;
            } catch (error) {
              console.error("Error fetching subject name:", error);
              return subjectId;
            }
          })
        );

        return {
          ...teacher,
          classNames,
          subjectNames,
        };
      });

      const teachersWithDetails = await Promise.all(teacherPromises);
      setTeachers(teachersWithDetails);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setError("Failed to load teachers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm("Are you sure you want to delete this teacher?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "teachers", teacherId));
      setTeachers(teachers.filter(teacher => teacher.id !== teacherId));
    } catch (error) {
      console.error("Error deleting teacher:", error);
      setError("Failed to delete teacher");
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTeacher(null);
    fetchTeachers();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTeacher(null);
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
        <SchoolSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-4xl mb-4" />
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600 mb-4">
                You don't have permission to access this page. Please ensure you're logged in as a school administrator.
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
      <SchoolSidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Management</h1>
              <p className="text-gray-600">Manage teachers and their assignments</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Teacher
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchTeachers()}
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
                <p className="mt-4 text-gray-600">Loading teachers...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teacher Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teacher ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Classes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subjects
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
                    {teachers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <FontAwesomeIcon icon={faChalkboardTeacher} className="text-4xl text-gray-300 mb-4" />
                            <p className="text-lg font-medium mb-2">No teachers found</p>
                            <p className="text-sm">Create your first teacher to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      teachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {teacher.name || "Unknown"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{teacher.email || "No email"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {teacher.teacherId}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {teacher.classNames.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-700 mb-1">Classes:</div>
                                  <ol className="list-decimal list-inside space-y-1 text-xs">
                                    {teacher.classNames.map((className, index) => (
                                      <li key={index} className="text-gray-600">{className}</li>
                                    ))}
                                  </ol>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">No classes</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {teacher.subjectNames.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-700 mb-1">Subjects:</div>
                                  <ol className="list-decimal list-inside space-y-1 text-xs">
                                    {teacher.subjectNames.map((subjectName, index) => (
                                      <li key={index} className="text-gray-600">{subjectName}</li>
                                    ))}
                                  </ol>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">No subjects</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {teacher.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditTeacher(teacher)}
                                className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50 transition-colors"
                                title="Edit teacher"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id)}
                                className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                                title="Delete teacher"
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
              <TeacherForm
                teacherId={editingTeacher?.id}
                initialData={editingTeacher ? {
                  name: editingTeacher.name,
                  email: editingTeacher.email,
                  teacherId: editingTeacher.teacherId,
                  classes: editingTeacher.classes,
                  subjects: editingTeacher.subjects,
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