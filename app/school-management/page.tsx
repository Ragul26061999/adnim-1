"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { db } from "../../lib/firebaseClient";
import { useAuth } from "../contexts/AuthContext";
import SchoolSidebar from "./components/SchoolSidebar";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap,
  faChalkboardTeacher,
  faBookOpen,
  faUsers,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

interface DashboardStats {
  totalClasses: number;
  totalTeachers: number;
  totalSubjects: number;
  totalStudents: number;
}

interface ClassData {
  id: string;
  name: string;
}

interface SubjectData {
  id: string;
  name: string;
}

export default function SchoolManagementDashboard() {
  const { schoolId, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    totalStudents: 0,
  });
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    console.log("AuthContext state:", { schoolId, authLoading });
    
    if (!authLoading) {
      if (schoolId) {
        fetchDashboardData();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchDashboardData = async () => {
    if (!schoolId) return;

    console.log("Fetching dashboard data for school:", schoolId);
    setLoading(true);
    setError("");
    
    try {
      const schoolRef = doc(db, "school", schoolId);
      
      // Fetch classes
      const classesQuery = query(
        collection(db, "classes"),
        where("schoolId", "==", schoolRef)
      );
      const classesSnapshot = await getDocs(classesQuery);
      console.log("Classes found:", classesSnapshot.size);
      
      const classesData: ClassData[] = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      
      // Fetch teachers
      const teachersQuery = query(
        collection(db, "teachers"),
        where("schoolId", "==", schoolRef)
      );
      const teachersSnapshot = await getDocs(teachersQuery);
      console.log("Teachers found:", teachersSnapshot.size);
      
      // Fetch subjects
      const subjectsQuery = query(
        collection(db, "subjects"),
        where("schoolId", "==", schoolRef)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      console.log("Subjects found:", subjectsSnapshot.size);
      
      const subjectsData: SubjectData[] = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      
      // Fetch students
      const studentsQuery = query(
        collection(db, "students"),
        where("schoolId", "==", schoolRef)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      console.log("Students found:", studentsSnapshot.size);

      setStats({
        totalClasses: classesSnapshot.size,
        totalTeachers: teachersSnapshot.size,
        totalSubjects: subjectsSnapshot.size,
        totalStudents: studentsSnapshot.size,
      });
      
      setClasses(classesData.sort((a, b) => a.name.localeCompare(b.name)));
      setSubjects(subjectsData.sort((a, b) => a.name.localeCompare(b.name)));
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">School Management Dashboard</h1>
            <p className="text-gray-600">Welcome to your school management system</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchDashboardData()}
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
                  title="Total Classes"
                  value={stats.totalClasses}
                  icon={faGraduationCap}
                  color="#3B82F6"
                />
                <StatCard
                  title="Total Teachers"
                  value={stats.totalTeachers}
                  icon={faChalkboardTeacher}
                  color="#10B981"
                />
                <StatCard
                  title="Total Subjects"
                  value={stats.totalSubjects}
                  icon={faBookOpen}
                  color="#F59E0B"
                />
                <StatCard
                  title="Total Students"
                  value={stats.totalStudents}
                  icon={faUsers}
                  color="#EF4444"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <a
                      href="/school-management/classes"
                      className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faGraduationCap} className="text-blue-600" />
                        <span className="font-medium text-blue-900">Manage Classes</span>
                      </div>
                    </a>
                    <a
                      href="/school-management/teachers"
                      className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faChalkboardTeacher} className="text-green-600" />
                        <span className="font-medium text-green-900">Manage Teachers</span>
                      </div>
                    </a>
                    <a
                      href="/school-management/students"
                      className="block w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faUsers} className="text-red-600" />
                        <span className="font-medium text-red-900">Manage Students</span>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Classes ({stats.totalClasses})
                  </h2>
                  {classes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No classes created yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {classes.map((cls, index) => (
                        <div key={cls.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-blue-600">{index + 1}.</span>
                          <span className="text-sm text-gray-700">{cls.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <a
                      href="/school-management/classes"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View all classes →
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Subjects ({stats.totalSubjects})
                  </h2>
                  {subjects.length === 0 ? (
                    <p className="text-gray-500 text-sm">No subjects created yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {subjects.map((subject, index) => (
                        <div key={subject.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-yellow-600">•</span>
                          <span className="text-sm text-gray-700">{subject.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <a
                      href="/learning-management/subjects"
                      className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                    >
                      View all subjects →
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">School management system initialized</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Dashboard loaded successfully</span>
                  </div>
                  {stats.totalClasses > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">{stats.totalClasses} classes configured</span>
                    </div>
                  )}
                  {stats.totalTeachers > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">{stats.totalTeachers} teachers added</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
} 