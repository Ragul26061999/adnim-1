"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import LearningManagementSidebar from "../components/LearningManagementSidebar";
import AssignmentForm from "../../components/forms/AssignmentForm";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faClipboardList,
  faExclamationTriangle,
  faDownload,
  faCalendarAlt,
  faBook,
  faBookOpen,
  faUsers,
  faFileAlt,
  faClipboard,
  faClock,
  faBookmark,
  faGraduationCap,
  faCheckCircle,
  faTimesCircle,
  faTimes,
  faCheck,
  faUserGraduate,
  faChartBar,
  faStar,
  faSpinner
} from "@fortawesome/free-solid-svg-icons";

interface Assignment {
  id: string;
  topic: string;
  description: string;
  classId: string;
  subjectId: string;
  chapterId: string;
  lessonId: string;
  attachmentUrl?: string;
  attachmentName?: string;
  startDate: any;
  endDate: any;
  createdAt: any;
  updatedAt?: any;
}

interface AssignmentWithDetails extends Assignment {
  className: string;
  subjectName: string;
  chapterName: string;
  lessonName: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  assignmentTopic: string;
  classId: any;
  subjectId: any;
  schoolId: any;
  submissionUrl: string;
  originalFileName: string;
  fileSize: number;
  submittedAt: any;
  status: string;
  grade: number | null;
  feedback: string | null;
  gradedAt: any | null;
  gradedBy: string | null;
}

interface Student {
  id: string;
  name: string;
  email: string;
  submission?: Submission;
}

export default function AssignmentManagementPage() {
  const { schoolId, loading: authLoading, user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "overdue" | "completed">("all");
  
  // Submissions modal state
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [gradingLoading, setGradingLoading] = useState<string | null>(null);

  useEffect(() => {
    console.log("AuthContext state:", { schoolId, authLoading });
    
    if (!authLoading) {
      if (schoolId) {
        fetchAssignments();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator or teacher.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchAssignments = async () => {
    if (!schoolId) return;

    console.log("Fetching assignments for school:", schoolId);
    setLoading(true);
    setError("");
    
    try {
      const assignmentsQuery = query(
        collection(db, "assignments"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      console.log("Assignments found:", assignmentsSnapshot.size);
      
      const assignmentPromises = assignmentsSnapshot.docs.map(async (assignmentDoc) => {
        const assignmentData = assignmentDoc.data();
        const assignment: Assignment = {
          id: assignmentDoc.id,
          topic: assignmentData.topic || "",
          description: assignmentData.description || "",
          classId: assignmentData.classId?.id || assignmentData.classId || "",
          subjectId: assignmentData.subjectId?.id || assignmentData.subjectId || "",
          chapterId: assignmentData.chapterId?.id || assignmentData.chapterId || "",
          lessonId: assignmentData.lessonId?.id || assignmentData.lessonId || "",
          attachmentUrl: assignmentData.attachmentUrl || "",
          attachmentName: assignmentData.attachmentName || "",
          startDate: assignmentData.startDate,
          endDate: assignmentData.endDate,
          createdAt: assignmentData.createdAt,
          updatedAt: assignmentData.updatedAt,
        };

        // Fetch related data
        const [className, subjectName, chapterName, lessonName] = await Promise.all([
          fetchName("classes", assignment.classId),
          fetchName("subjects", assignment.subjectId),
          fetchName("chapters", assignment.chapterId),
          fetchName("lessons", assignment.lessonId),
        ]);

        return {
          ...assignment,
          className: className || "Unknown Class",
          subjectName: subjectName || "Unknown Subject",
          chapterName: chapterName || "N/A",
          lessonName: lessonName || "N/A",
        };
      });

      const assignmentsWithDetails = await Promise.all(assignmentPromises);
      // Sort by end date (most recent first)
      assignmentsWithDetails.sort((a, b) => {
        if (a.endDate && b.endDate) {
          return b.endDate.toDate().getTime() - a.endDate.toDate().getTime();
        }
        return 0;
      });
      setAssignments(assignmentsWithDetails);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setError("Failed to load assignments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchName = async (collection: string, id: string): Promise<string> => {
    if (!id) return "";
    
    try {
      const docRef = doc(db, collection, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().name || docSnap.data().topic || "";
      }
    } catch (error) {
      console.error(`Error fetching ${collection} name:`, error);
    }
    return "";
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "assignments", assignmentId));
      setAssignments(assignments.filter(assignment => assignment.id !== assignmentId));
    } catch (error) {
      console.error("Error deleting assignment:", error);
      setError("Failed to delete assignment");
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAssignment(null);
    fetchAssignments();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAssignment(null);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Not submitted";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (error) {
      return "Invalid date";
    }
  };

  const isOverdue = (endDate: any) => {
    if (!endDate) return false;
    const now = new Date();
    const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    return end < now;
  };

  const getStatusColor = (assignment: AssignmentWithDetails) => {
    if (isOverdue(assignment.endDate)) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    const now = new Date();
    const start = assignment.startDate?.toDate() || new Date();
    const end = assignment.endDate?.toDate() || new Date();
    
    if (now >= start && now <= end) {
      return "bg-green-100 text-green-800 border-green-200";
    }
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getStatusText = (assignment: AssignmentWithDetails) => {
    if (isOverdue(assignment.endDate)) {
      return "Overdue";
    }
    const now = new Date();
    const start = assignment.startDate?.toDate() || new Date();
    const end = assignment.endDate?.toDate() || new Date();
    
    if (now >= start && now <= end) {
      return "Active";
    }
    return "Upcoming";
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = assignment.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.subjectName.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === "all") return matchesSearch;
    
    const now = new Date();
    const endDate = assignment.endDate?.toDate ? assignment.endDate.toDate() : new Date(assignment.endDate);
    
    if (filterStatus === "active") {
      return matchesSearch && endDate > now;
    } else if (filterStatus === "overdue") {
      return matchesSearch && endDate < now;
    } else if (filterStatus === "completed") {
      return matchesSearch && endDate < now;
    }

    return matchesSearch;
  });

  const handleViewSubmissions = async (assignment: AssignmentWithDetails) => {
    setSelectedAssignment(assignment);
    setShowSubmissions(true);
    setSubmissionsLoading(true);

    try {
      // Fetch all submissions for this assignment
      const submissionsQuery = query(
        collection(db, "assignment_submitted"),
        where("assignmentId", "==", assignment.id)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissionsList = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];

      console.log("[DEBUG] Submissions fetched:", submissionsList);

      // Fetch students from both collections
      const [studentsFromStudentsCollection, studentsFromUsersCollection] = await Promise.all([
        // Query students collection
        getDocs(query(
          collection(db, "students"),
          where("schoolId", "==", doc(db, "school", schoolId!)),
          where("classId", "==", doc(db, "classes", assignment.classId))
        )),
        // Query users collection for students
        getDocs(query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("schoolId", "==", doc(db, "school", schoolId!)),
          where("class_id", "==", doc(db, "classes", assignment.classId))
        ))
      ]);

      console.log("[DEBUG] Students from students collection:", studentsFromStudentsCollection.docs.map(d => ({id: d.id, ...d.data()})));
      console.log("[DEBUG] Students from users collection:", studentsFromUsersCollection.docs.map(d => ({id: d.id, ...d.data()})));
      
      const studentsList: Student[] = [];
      
      // Process students from students collection
      studentsFromStudentsCollection.docs.forEach(studentDoc => {
        const studentData = studentDoc.data();
        // Match submission by studentDoc.id or by userId (for robustness)
        const submission = submissionsList.find(s => s.studentId === studentDoc.id || s.studentId === studentData.userId);
        studentsList.push({
          id: studentDoc.id,
          name: studentData.name || "Unknown Student",
          email: studentData.email || "",
          submission
        });
      });

      // Process students from users collection (who don't have corresponding student records)
      studentsFromUsersCollection.docs.forEach(userDoc => {
        const userData = userDoc.data();
        // Check if this user already exists in studentsList by email or by userId
        const existingStudent = studentsList.find(s => s.email === userData.email || s.id === userDoc.id);
        if (!existingStudent) {
          // Match submission by userDoc.id (uid)
          const submission = submissionsList.find(s => s.studentId === userDoc.id);
          studentsList.push({
            id: userDoc.id,
            name: userData.display_name || userData.email?.split('@')[0] || "Unknown Student",
            email: userData.email || "",
            submission
          });
        }
      });

      console.log("[DEBUG] Final students list:", studentsList);

      setSubmissions(submissionsList);
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setError("Failed to load submissions");
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleDownloadSubmission = (submissionUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = submissionUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGradeSubmission = async (submissionId: string, grade: number | null, status: "approved" | "rejected", feedback?: string) => {
    setGradingLoading(submissionId);
    
    try {
      const submissionRef = doc(db, "assignment_submitted", submissionId);
      await updateDoc(submissionRef, {
        grade: grade,
        feedback: feedback || null,
        gradedAt: Timestamp.now(),
        gradedBy: user?.uid,
        status: status === "approved" ? "graded" : "rejected",
      });

      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, grade, feedback: feedback || null, status: status === "approved" ? "graded" : "rejected" }
          : sub
      ));

      setStudents(prev => prev.map(student => 
        student.submission?.id === submissionId
          ? { ...student, submission: { ...student.submission, grade, feedback: feedback || null, status: status === "approved" ? "graded" : "rejected" } }
          : student
      ));

    } catch (error) {
      console.error("Error grading submission:", error);
      setError("Failed to grade submission");
    } finally {
      setGradingLoading(null);
    }
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
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignment Management</h1>
              <p className="text-gray-600">Create and manage assignments for students</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Assignment
            </button>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="overdue">Overdue</option>
                  <option value="completed">Upcoming</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchAssignments()}
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
                <p className="mt-4 text-gray-600">Loading assignments...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                      <p className="text-3xl font-bold text-gray-900">{assignments.length}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <FontAwesomeIcon icon={faClipboard} className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active</p>
                      <p className="text-3xl font-bold text-green-600">
                        {assignments.filter(a => getStatusText(a) === "Active").length}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <FontAwesomeIcon icon={faClock} className="text-green-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-3xl font-bold text-red-600">
                        {assignments.filter(a => getStatusText(a) === "Overdue").length}
                      </p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-lg">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {assignments.filter(a => getStatusText(a) === "Upcoming").length}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignments Grid */}
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faClipboardList} className="text-gray-400 text-6xl mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No assignments found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || filterStatus !== "all" 
                      ? "Try adjusting your search or filter criteria" 
                      : "Create your first assignment to get started"}
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Assignment
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAssignments.map((assignment) => (
                    <div key={assignment.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                      {/* Status Badge */}
                      <div className={`px-4 py-2 text-xs font-medium border-b ${getStatusColor(assignment)}`}>
                        {getStatusText(assignment)}
                      </div>
                      
                      <div className="p-6">
                        {/* Assignment Header */}
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                            {assignment.topic}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {assignment.description}
                          </p>
                        </div>

                        {/* Assignment Details */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faUsers} className="text-gray-400 text-sm" />
                            <span className="text-sm text-gray-600">{assignment.className}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faBook} className="text-gray-400 text-sm" />
                            <span className="text-sm text-gray-600">{assignment.subjectName}</span>
                          </div>
                          
                          {assignment.chapterName !== "N/A" && (
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faBookmark} className="text-gray-400 text-sm" />
                              <span className="text-sm text-gray-600">{assignment.chapterName}</span>
                            </div>
                          )}
                          
                          {assignment.lessonName !== "N/A" && (
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faGraduationCap} className="text-gray-400 text-sm" />
                              <span className="text-sm text-gray-600">{assignment.lessonName}</span>
                            </div>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <div className="flex justify-between items-center text-sm">
                            <div>
                              <span className="text-gray-500">Start:</span>
                              <span className="ml-1 text-gray-900">{formatDate(assignment.startDate)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">End:</span>
                              <span className="ml-1 text-gray-900">{formatDate(assignment.endDate)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Attachment */}
                        {assignment.attachmentUrl && (
                          <div className="mb-4">
                            <a
                              href={assignment.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <FontAwesomeIcon icon={faFileAlt} />
                              <span>{assignment.attachmentName || "View Attachment"}</span>
                              <FontAwesomeIcon icon={faDownload} className="text-xs" />
                            </a>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t">
                          <button
                            onClick={() => handleEditAssignment(assignment)}
                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                            Delete
                          </button>
                          <button
                            onClick={() => handleViewSubmissions(assignment)}
                            className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <FontAwesomeIcon icon={faEye} />
                            View Submissions
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <AssignmentForm
                assignmentId={editingAssignment?.id}
                initialData={editingAssignment ? {
                  topic: editingAssignment.topic,
                  description: editingAssignment.description,
                  classId: editingAssignment.classId,
                  subjectId: editingAssignment.subjectId,
                  chapterId: editingAssignment.chapterId,
                  lessonId: editingAssignment.lessonId,
                  attachmentUrl: editingAssignment.attachmentUrl,
                  attachmentName: editingAssignment.attachmentName,
                  startDate: editingAssignment.startDate,
                  endDate: editingAssignment.endDate,
                } : undefined}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </div>
          </div>
        </div>
      )}

      {showSubmissions && selectedAssignment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Submissions for: {selectedAssignment.topic}
                  </h2>
                  <p className="text-gray-600">
                    Class: {selectedAssignment.className} | Subject: {selectedAssignment.subjectName}
                  </p>
                </div>
                <button
                  onClick={() => setShowSubmissions(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-xl" />
                </button>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faUsers} className="text-blue-600 text-xl" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Students</p>
                      <p className="text-2xl font-bold text-blue-900">{students.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-xl" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Submitted</p>
                      <p className="text-2xl font-bold text-green-900">
                        {students.filter(s => s.submission).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faClock} className="text-orange-600 text-xl" />
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Pending</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {students.filter(s => !s.submission).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faStar} className="text-purple-600 text-xl" />
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Graded</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {students.filter(s => s.submission?.status === "graded").length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {submissionsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner size="large" />
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div key={student.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FontAwesomeIcon icon={faUserGraduate} className="text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{student.name}</h4>
                              <p className="text-sm text-gray-600">{student.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Status</p>
                              <div className="flex items-center gap-2 mt-1">
                                {student.submission ? (
                                  <>
                                    <FontAwesomeIcon 
                                      icon={student.submission.status === "graded" ? faCheckCircle : 
                                            student.submission.status === "rejected" ? faTimesCircle : faClipboard} 
                                      className={student.submission.status === "graded" ? "text-green-600" : 
                                                student.submission.status === "rejected" ? "text-red-600" : "text-orange-600"} 
                                    />
                                    <span className={`capitalize text-sm font-medium ${
                                      student.submission.status === "graded" ? "text-green-600" : 
                                      student.submission.status === "rejected" ? "text-red-600" : "text-orange-600"
                                    }`}>
                                      {student.submission.status}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <FontAwesomeIcon icon={faTimesCircle} className="text-gray-400" />
                                    <span className="text-sm text-gray-500">Not submitted</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-700">Submitted At</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatDate(student.submission?.submittedAt)}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-700">Grade</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {student.submission?.grade !== null && student.submission?.grade !== undefined 
                                  ? `${student.submission.grade}/100` 
                                  : "Not graded"}
                              </p>
                            </div>
                          </div>

                          {student.submission?.feedback && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700">Feedback</p>
                              <p className="text-sm text-gray-600 mt-1 bg-gray-100 p-3 rounded-lg">
                                {student.submission.feedback}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-6">
                          {student.submission?.submissionUrl && (
                            <>
                              <button
                                onClick={() => window.open(student.submission!.submissionUrl, "_blank")}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                <FontAwesomeIcon icon={faEye} />
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadSubmission(
                                  student.submission!.submissionUrl, 
                                  student.submission!.originalFileName
                                )}
                                className="bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                <FontAwesomeIcon icon={faDownload} />
                                Download
                              </button>
                            </>
                          )}

                          {student.submission && student.submission.status === "submitted" && (
                            <div className="flex gap-2 mt-2">
                              {gradingLoading === student.submission.id ? (
                                <div className="flex justify-center py-2">
                                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-400" />
                                </div>
                              ) : (
                                <>
                                  <GradingModal 
                                    student={student}
                                    onGrade={handleGradeSubmission}
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {students.length === 0 && (
                    <div className="text-center py-12">
                      <FontAwesomeIcon icon={faUsers} className="text-gray-400 text-6xl mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No students found</h3>
                      <p className="text-gray-500">
                        No students are enrolled in this class yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Grading Modal Component
function GradingModal({ student, onGrade }: { student: Student; onGrade: (id: string, grade: number | null, status: "approved" | "rejected", feedback?: string) => void }) {
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [grade, setGrade] = useState<number>(85);
  const [feedback, setFeedback] = useState<string>("");

  const handleApprove = () => {
    if (student.submission) {
      onGrade(student.submission.id, grade, "approved", feedback);
      setShowGradingModal(false);
    }
  };

  const handleReject = () => {
    if (student.submission) {
      onGrade(student.submission.id, 0, "rejected", feedback || "Needs improvement");
      setShowGradingModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowGradingModal(true)}
        className="bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
      >
        <FontAwesomeIcon icon={faStar} />
        Grade
      </button>

      {showGradingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Grade Submission - {student.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Provide feedback to the student..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleApprove}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faCheck} />
                Approve
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faTimes} />
                Reject
              </button>
              <button
                onClick={() => setShowGradingModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 