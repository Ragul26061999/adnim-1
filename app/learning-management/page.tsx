"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { db } from "../../lib/firebaseClient";
import { useAuth } from "../contexts/AuthContext";
import LearningManagementSidebar from "./components/LearningManagementSidebar";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faBookmark,
  faBook,
  faGraduationCap,
  faClipboardList,
  faCalendarAlt,
  faComments,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

interface LearningStats {
  totalSubjects: number;
  totalChapters: number;
  totalLessons: number;
  totalClasses: number;
}

export default function LearningManagementDashboard() {
  const { schoolId, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<LearningStats>({
    totalSubjects: 0,
    totalChapters: 0,
    totalLessons: 0,
    totalClasses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    console.log("AuthContext state:", { schoolId, authLoading });
    
    if (!authLoading) {
      if (schoolId) {
        fetchDashboardStats();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator or teacher.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchDashboardStats = async () => {
    if (!schoolId) return;

    console.log("Fetching dashboard stats for school:", schoolId);
    setLoading(true);
    setError("");
    
    try {
      const schoolRef = doc(db, "school", schoolId);
      
      // Fetch subjects count
      const subjectsQuery = query(
        collection(db, "subjects"),
        where("schoolId", "==", schoolRef)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      console.log("Subjects found:", subjectsSnapshot.size);
      
      // Fetch chapters count
      const chaptersQuery = query(
        collection(db, "chapters"),
        where("schoolId", "==", schoolRef)
      );
      const chaptersSnapshot = await getDocs(chaptersQuery);
      console.log("Chapters found:", chaptersSnapshot.size);
      
      // Fetch lessons count
      const lessonsQuery = query(
        collection(db, "lessons"),
        where("schoolId", "==", schoolRef)
      );
      const lessonsSnapshot = await getDocs(lessonsQuery);
      console.log("Lessons found:", lessonsSnapshot.size);
      
      // Fetch classes count
      const classesQuery = query(
        collection(db, "classes"),
        where("schoolId", "==", schoolRef)
      );
      const classesSnapshot = await getDocs(classesQuery);
      console.log("Classes found:", classesSnapshot.size);

      setStats({
        totalSubjects: subjectsSnapshot.size,
        totalChapters: chaptersSnapshot.size,
        totalLessons: lessonsSnapshot.size,
        totalClasses: classesSnapshot.size,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError("Failed to load dashboard statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }: {
    title: string;
    value: number;
    icon: any;
    color: string;
  }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <FontAwesomeIcon icon={icon} className="text-xl" style={{ color }} />
        </div>
      </div>
    </div>
  );

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Management Dashboard</h1>
            <p className="text-gray-600">Manage your school's curriculum and content</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchDashboardStats()}
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
                <p className="mt-4 text-gray-600">Loading dashboard data...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total Subjects"
                  value={stats.totalSubjects}
                  icon={faBookOpen}
                  color="#10B981"
                />
                <StatCard
                  title="Total Chapters"
                  value={stats.totalChapters}
                  icon={faBookmark}
                  color="#F59E0B"
                />
                <StatCard
                  title="Total Lessons"
                  value={stats.totalLessons}
                  icon={faBook}
                  color="#8B5CF6"
                />
                <StatCard
                  title="Total Classes"
                  value={stats.totalClasses}
                  icon={faGraduationCap}
                  color="#3B82F6"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <a
                      href="/learning-management/subjects"
                      className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faBookOpen} className="text-green-600" />
                        <span className="font-medium text-green-900">Manage Subjects</span>
                      </div>
                    </a>
                    <a
                      href="/learning-management/chapters"
                      className="block w-full text-left px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faBookmark} className="text-yellow-600" />
                        <span className="font-medium text-yellow-900">Manage Chapters</span>
                      </div>
                    </a>
                    <a
                      href="/learning-management/lessons"
                      className="block w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faBook} className="text-purple-600" />
                        <span className="font-medium text-purple-900">Manage Lessons</span>
                      </div>
                    </a>
                    <a
                      href="/learning-management/assignments"
                      className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faClipboardList} className="text-blue-600" />
                        <span className="font-medium text-blue-900">Manage Assignments</span>
                      </div>
                    </a>
                    <a
                      href="/learning-management/diary"
                      className="block w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-indigo-600" />
                        <span className="font-medium text-indigo-900">Manage Diary</span>
                      </div>
                    </a>
                    <a
                      href="/learning-management/discussions"
                      className="block w-full text-left px-4 py-3 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faComments} className="text-teal-600" />
                        <span className="font-medium text-teal-900">Manage Discussions</span>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Content Progress</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Subjects Created</span>
                      <span className="text-sm font-medium text-gray-900">{stats.totalSubjects}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Chapters Created</span>
                      <span className="text-sm font-medium text-gray-900">{stats.totalChapters}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Lessons Created</span>
                      <span className="text-sm font-medium text-gray-900">{stats.totalLessons}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Lessons per Subject</span>
                      <span className="text-sm font-medium text-gray-900">
                        {stats.totalSubjects > 0 ? (stats.totalLessons / stats.totalSubjects).toFixed(1) : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
} 