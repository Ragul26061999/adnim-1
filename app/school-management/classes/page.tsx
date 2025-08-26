"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import SchoolSidebar from "../components/SchoolSidebar";
import ClassForm from "../../components/forms/ClassForm";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import Button from "../../components/shared/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faEye, 
  faGraduationCap,
  faExclamationTriangle 
} from "@fortawesome/free-solid-svg-icons";

interface Class {
  id: string;
  name: string;
  createdAt: any;
  createdBy: any;
  studentCount?: number;
  teacherCount?: number;
}

export default function ClassManagement() {
  const { schoolId, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    console.log("AuthContext state:", { schoolId, authLoading });
    
    if (!authLoading) {
      if (schoolId) {
        fetchClasses();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchClasses = async () => {
    if (!schoolId) return;

    console.log("Fetching classes for school:", schoolId);
    setLoading(true);
    setError("");
    
    try {
      const classesQuery = query(
        collection(db, "classes"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const classesSnapshot = await getDocs(classesQuery);
      console.log("Classes found:", classesSnapshot.size);
      
      const classesWithCounts = await Promise.all(
        classesSnapshot.docs.map(async (classDoc) => {
          const classData = classDoc.data();
          const classId = classDoc.id;

          // Get student count for this class
          const studentsQuery = query(
            collection(db, "students"),
            where("classId", "==", doc(db, "classes", classId))
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          const studentCount = studentsSnapshot.size;

          // Get teacher count for this class
          const teachersQuery = query(
            collection(db, "teachers"),
            where("classes", "array-contains", doc(db, "classes", classId))
          );
          const teachersSnapshot = await getDocs(teachersQuery);
          const teacherCount = teachersSnapshot.size;

          return {
            id: classId,
            ...classData,
            studentCount,
            teacherCount,
          } as Class;
        })
      );
      
      setClasses(classesWithCounts);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setError("Failed to load classes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = () => {
    setEditingClass(null);
    setShowForm(true);
  };

  const handleEditClass = (classItem: Class) => {
    setEditingClass(classItem);
    setShowForm(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      try {
        await deleteDoc(doc(db, "classes", classId));
        fetchClasses();
      } catch (error) {
        console.error("Error deleting class:", error);
        setError("Failed to delete class");
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingClass(null);
    fetchClasses();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingClass(null);
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Management</h1>
              <p className="text-gray-600">Create and manage school classes</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateClass}
              className="flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Class
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchClasses()}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try Again
              </button>
            </div>
          )}

          {showForm && (
            <div className="mb-8">
              <ClassForm
                classId={editingClass?.id}
                initialData={editingClass ? { name: editingClass.name } : undefined}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size="large" />
                <p className="mt-4 text-gray-600">Loading classes...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Classes List</h2>
              </div>
              
              {classes.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-4xl text-gray-300 mb-4" />
                    <p className="text-lg font-medium mb-2">No classes found</p>
                    <p className="text-sm">Create your first class to get started</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Students
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teachers
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
                      {classes.map((classItem) => (
                        <tr key={classItem.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {classItem.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {classItem.studentCount || 0} students
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {classItem.teacherCount || 0} teachers
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {classItem.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEditClass(classItem)}
                                className="p-2 rounded-full hover:bg-indigo-50"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteClass(classItem.id)}
                                className="p-2 rounded-full hover:bg-red-50"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 