"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import SchoolSidebar from "../components/SchoolSidebar";
import StudentForm from "../../components/forms/StudentForm";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrash,
  faUser,
  faEnvelope,
  faPhone,
  faGraduationCap,
  faUsers,
  faExclamationTriangle,
  faSearch,
  faFilter,
  faUserGraduate,
  faCalendarAlt,
  faMapMarkerAlt,
  faIdCard,
  faUserTie
} from "@fortawesome/free-solid-svg-icons";
import { getStudentsBySchool } from "../../../lib/userManagement";

interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  rollNumber: string;
  classId: string;
  className: string;
  dateOfBirth: any;
  address: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

export default function StudentManagementPage() {
  const { schoolId, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    console.log("AuthContext state:", { schoolId, authLoading });
    
    if (!authLoading) {
      if (schoolId) {
        fetchStudents();
        fetchClasses();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchStudents = async () => {
    if (!schoolId) return;

    console.log("Fetching students for school:", schoolId);
    setLoading(true);
    setError("");
    
    try {
      // Use the new utility function
      const studentsData = await getStudentsBySchool(schoolId);
      console.log("Raw students data:", studentsData);

      // Enhanced data fetching with related information
      const studentPromises = studentsData.map(async (studentData: any) => {
        try {
          // Extract ID from DocumentReference safely
          const extractIdFromRef = (ref: any): string => {
            if (!ref) return "";
            if (typeof ref === 'string') return ref;
            if (ref.id) return ref.id;
            if (ref._path && ref._path.segments) {
              return ref._path.segments[ref._path.segments.length - 1];
            }
            if (ref.path) {
              return ref.path.split('/').pop() || "";
            }
            return "";
          };

          const classId = extractIdFromRef(studentData.classId);
          const parentId = extractIdFromRef(studentData.parentId);

          // Fetch class name
          let className = "Unknown Class";
          if (classId) {
            try {
              const classDoc = await getDoc(doc(db, "classes", classId));
              if (classDoc.exists()) {
                className = classDoc.data().name || "Unknown Class";
              }
            } catch (error) {
              console.error("Error fetching class:", error);
            }
          }

          // Fetch parent information
          let parentName = "Unknown Parent";
          let parentPhone = "";
          let parentEmail = "";
          
          if (parentId) {
            try {
              const parentDoc = await getDoc(doc(db, "parents", parentId));
              if (parentDoc.exists()) {
                const parentData = parentDoc.data();
                parentName = parentData.name || "Unknown Parent";
                parentPhone = parentData.phone || "";
                parentEmail = parentData.email || "";
              }
            } catch (error) {
              console.error("Error fetching parent:", error);
              // Fallback to stored parent data in student document
              parentName = studentData.parentName || "Unknown Parent";
              parentPhone = studentData.parentPhone || "";
              parentEmail = studentData.parentEmail || "";
            }
          } else {
            // Use fallback data stored in student document
            parentName = studentData.parentName || "Unknown Parent";
            parentPhone = studentData.parentPhone || "";
            parentEmail = studentData.parentEmail || "";
          }

          const student: Student = {
            id: studentData.id,
            userId: studentData.userId || "",
            name: studentData.name || "Unknown Student",
            email: studentData.email || "",
            phone: studentData.phone || "",
            rollNumber: studentData.rollNumber || "",
            classId: classId,
            className: className,
            dateOfBirth: studentData.dateOfBirth,
            address: studentData.address || "",
            parentId: parentId,
            parentName: parentName,
            parentPhone: parentPhone,
            parentEmail: parentEmail,
            isActive: studentData.isActive !== false, // Default to true if not specified
            createdAt: studentData.createdAt,
            updatedAt: studentData.updatedAt,
          };

          console.log("Processed student:", student);
          return student;

        } catch (error) {
          console.error("Error processing student data:", error);
          // Return basic student data even if related data fails
          return {
            id: studentData.id,
            userId: studentData.userId || "",
            name: studentData.name || "Unknown Student",
            email: studentData.email || "",
            phone: studentData.phone || "",
            rollNumber: studentData.rollNumber || "",
            classId: "",
            className: "Unknown Class",
            dateOfBirth: studentData.dateOfBirth,
            address: studentData.address || "",
            parentId: "",
            parentName: "Unknown Parent",
            parentPhone: "",
            parentEmail: "",
            isActive: true,
            createdAt: studentData.createdAt,
            updatedAt: studentData.updatedAt,
          };
        }
      });

      const studentsWithDetails = await Promise.all(studentPromises);
      
      // Sort by name
      studentsWithDetails.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log("Final students with details:", studentsWithDetails);
      setStudents(studentsWithDetails);
      
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!schoolId) return;
    
    try {
      const classesQuery = query(
        collection(db, "classes"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const classesSnapshot = await getDocs(classesQuery);
      
      const classesData = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      
      setClasses(classesData);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "students", studentId));
      setStudents(students.filter(student => student.id !== studentId));
    } catch (error) {
      console.error("Error deleting student:", error);
      setError("Failed to delete student");
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingStudent(null);
    fetchStudents();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingStudent(null);
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString();
    } catch (error) {
      return "Invalid date";
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = !classFilter || student.classId === classFilter;

    return matchesSearch && matchesClass && student.isActive;
  });

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SchoolSidebar />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="large" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SchoolSidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Management</h1>
              <p className="text-gray-600">Manage students and their information</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Student
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="relative">
                <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Total: {filteredStudents.length} students
                </span>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
              <div className="flex items-center gap-2 text-red-600">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : (
            <>
              {/* Students List */}
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faUserGraduate} className="text-gray-400 text-6xl mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No students found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || classFilter 
                      ? "Try adjusting your search or filter criteria" 
                      : "Start by adding your first student"}
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Student
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      {/* Student Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <FontAwesomeIcon icon={faUserGraduate} className="text-blue-600 text-lg" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                            <p className="text-sm text-gray-600">Roll: {student.rollNumber}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200"
                            title="Edit Student"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                            title="Delete Student"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>

                      {/* Student Details */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FontAwesomeIcon icon={faGraduationCap} className="text-gray-400 w-4" />
                          <span className="text-gray-600">{student.className}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 w-4" />
                          <span className="text-gray-600 truncate">{student.email}</span>
                        </div>
                        
                        {student.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <FontAwesomeIcon icon={faPhone} className="text-gray-400 w-4" />
                            <span className="text-gray-600">{student.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 w-4" />
                          <span className="text-gray-600">DOB: {formatDate(student.dateOfBirth)}</span>
                        </div>

                        {student.address && (
                          <div className="flex items-start gap-2 text-sm">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400 w-4 mt-0.5" />
                            <span className="text-gray-600 text-xs line-clamp-2">{student.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Parent Information */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <FontAwesomeIcon icon={faUserTie} className="text-green-600 text-sm" />
                          <span className="text-sm font-medium text-gray-700">Parent Information</span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            <strong>Name:</strong> {student.parentName}
                          </p>
                          
                          {student.parentEmail && (
                            <p className="text-sm text-gray-600 truncate">
                              <strong>Email:</strong> {student.parentEmail}
                            </p>
                          )}
                          
                          {student.parentPhone && (
                            <p className="text-sm text-gray-600">
                              <strong>Phone:</strong> {student.parentPhone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Added: {formatDate(student.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Student Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <StudentForm
              studentId={editingStudent?.id}
              initialData={editingStudent ? {
                name: editingStudent.name,
                email: editingStudent.email,
                phone: editingStudent.phone,
                rollNumber: editingStudent.rollNumber,
                classId: editingStudent.classId,
                parentName: editingStudent.parentName,
                parentPhone: editingStudent.parentPhone,
                parentEmail: editingStudent.parentEmail,
                dateOfBirth: editingStudent.dateOfBirth,
                address: editingStudent.address,
              } : undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
} 