"use client";
import * as React from "react";
import Sidebar from "../../components/Sidebar";
import { db, auth } from "@/lib/firebaseClient";
import { collection, query, where, getDocs, doc, getDoc, Timestamp, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

type Student = {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
};

export default function CreateCustomTestPage() {
  const testType = "Custom Test";
  const [testName, setTestName] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [selectedClass, setSelectedClass] = React.useState("");
  const [studentMode, setStudentMode] = React.useState("whole");
  const [showStudentModal, setShowStudentModal] = React.useState(false);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
  const [totalQuestions, setTotalQuestions] = React.useState(0);
  const [classes, setClasses] = React.useState<{ id: string; name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = React.useState(true);
  const [loadingStudents, setLoadingStudents] = React.useState(false);
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [userSchoolId, setUserSchoolId] = React.useState<string | null>(null);
  const router = useRouter();

  // Helper function to extract school ID from document reference
  const extractSchoolId = (schoolRef: any): string | null => {
    if (!schoolRef) return null;
    
    // If it's a string, extract the ID
    if (typeof schoolRef === 'string') {
      const parts = schoolRef.split('/');
      return parts[parts.length - 1];
    }
    
    // If it's a DocumentReference object
    if (schoolRef.path) {
      const parts = schoolRef.path.split('/');
      return parts[parts.length - 1];
    }
    
    // If it has an id property
    if (schoolRef.id) {
      return schoolRef.id;
    }
    
    return null;
  };

  // Fetch current user's school ID and classes
  React.useEffect(() => {
    let unsubscribe: any;
    setLoadingClasses(true);
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user document to get schoolId
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          if (userData && userData.schoolId) {
            // Extract school ID from the document reference
            const schoolId = extractSchoolId(userData.schoolId);
            console.log("Extracted school ID:", schoolId);
            setUserSchoolId(schoolId);
            
            if (schoolId) {
              // Query classes where schoolId matches
              const classesQuery = query(
                collection(db, "classes"),
                where("schoolId", "==", doc(db, "school", schoolId))
              );
              const classesSnap = await getDocs(classesQuery);
              const classList: { id: string; name: string }[] = [];
              classesSnap.forEach((docSnap) => {
                const data = docSnap.data();
                classList.push({ id: docSnap.id, name: data.name });
              });
              setClasses(classList);
            } else {
              setClasses([]);
            }
          } else {
            setClasses([]);
          }
        } catch (error) {
          console.error("Error fetching classes:", error);
          setClasses([]);
        } finally {
          setLoadingClasses(false);
        }
      }
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Fetch students when class is selected and selective mode is chosen
  React.useEffect(() => {
    if (studentMode === "selective" && selectedClass && userSchoolId) {
      setShowStudentModal(true);
      setLoadingStudents(true);
      fetchStudentsForClass();
    }
  }, [studentMode, selectedClass, userSchoolId]);

  const fetchStudentsForClass = async () => {
    if (!selectedClass || !userSchoolId) return;
    
    try {
      console.log("Fetching students for class:", selectedClass, "school:", userSchoolId);
      
      // Query students by classId and schoolId
      const studentsQuery = query(
        collection(db, "students"),
        where("classId", "==", doc(db, "classes", selectedClass)),
        where("schoolId", "==", doc(db, "school", userSchoolId)),
        where("isActive", "==", true)
      );
      
      const studentSnap = await getDocs(studentsQuery);
      console.log("Found students:", studentSnap.size);
      
      const studentList: Student[] = [];
      studentSnap.forEach((docSnap) => {
        const data = docSnap.data();
        studentList.push({
          id: docSnap.id,
          name: data.name || "Unknown Student",
          email: data.email || "",
          rollNumber: data.rollNumber || ""
        });
      });
      
      setStudents(studentList);
      console.log("Processed students:", studentList);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!testName.trim()) newErrors.testName = "Test name is required.";
    if (!startTime) newErrors.startTime = "Start time is required.";
    if (!endTime) newErrors.endTime = "End time is required.";
    if (!selectedClass) newErrors.selectedClass = "Class is required.";
    if (!studentMode) newErrors.studentMode = "Assign To is required.";
    if (studentMode === "selective" && selectedStudents.length === 0) {
      newErrors.selectedStudents = "Select at least one student.";
    }
    if (!totalQuestions || totalQuestions < 1) {
      newErrors.totalQuestions = "Total questions must be greater than 0.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setSubmitError("");
    if (!validateForm()) return;
    setSubmitting(true);
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      
      const testDoc = {
        name: testName,
        classId: doc(db, "classes", selectedClass),
        start: new Date(startTime),
        end: new Date(endTime),
        createdBy: doc(db, "users", user.uid),
        createdAt: Timestamp.now(),
        totalQuestions: totalQuestions,
        wholeClass: studentMode === "whole",
        online: false, // Start as draft
        status: "drafted",
        ...(studentMode === "selective" && {
          userID: selectedStudents.map(id => doc(db, "students", id))
        })
      };
      
      await addDoc(collection(db, "test"), testDoc);
      setSubmitSuccess(true);
      
      // Reset form
      setTestName("");
      setStartTime("");
      setEndTime("");
      setSelectedClass("");
      setStudentMode("whole");
      setSelectedStudents([]);
      setTotalQuestions(0);
      setErrors({});
      
    } catch (err: any) {
      console.error("Error creating test:", err);
      setSubmitError(err.message || "Failed to create test.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const closeStudentModal = () => {
    setShowStudentModal(false);
    if (selectedStudents.length === 0) {
      setStudentMode("whole");
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10">
        {/* Header */}
        <div className="w-full max-w-2xl mb-8">
          <h1 className="text-3xl lg:text-4xl font-light text-slate-800 mb-2 tracking-tight">
            Create Test
          </h1>
          <p className="text-slate-500 font-light">Design a custom assessment for your students</p>
        </div>

        {/* Main Form Card */}
        <div className="w-full max-w-2xl bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 overflow-hidden">
          <div className="p-8 lg:p-10">
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* Test Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Test Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className={`w-full bg-slate-50/50 border-2 ${
                      errors.testName ? 'border-red-300' : 'border-slate-200/50'
                    } rounded-2xl px-4 py-4 text-slate-800 placeholder-slate-400 
                    focus:outline-none focus:border-blue-300 focus:bg-white/80 
                    transition-all duration-200 font-light text-lg`}
                    placeholder="Enter test name"
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {errors.testName && (
                  <p className="text-red-400 text-sm font-light mt-2">{errors.testName}</p>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    className={`w-full bg-slate-50/50 border-2 ${
                      errors.startTime ? 'border-red-300' : 'border-slate-200/50'
                    } rounded-2xl px-4 py-4 text-slate-800 
                    focus:outline-none focus:border-blue-300 focus:bg-white/80 
                    transition-all duration-200 font-light`}
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                  {errors.startTime && (
                    <p className="text-red-400 text-sm font-light mt-2">{errors.startTime}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    className={`w-full bg-slate-50/50 border-2 ${
                      errors.endTime ? 'border-red-300' : 'border-slate-200/50'
                    } rounded-2xl px-4 py-4 text-slate-800 
                    focus:outline-none focus:border-blue-300 focus:bg-white/80 
                    transition-all duration-200 font-light`}
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                  {errors.endTime && (
                    <p className="text-red-400 text-sm font-light mt-2">{errors.endTime}</p>
                  )}
                </div>
              </div>

              {/* Class Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Select Class
                </label>
                {loadingClasses ? (
                  <div className="flex items-center gap-3 py-4 px-4 bg-slate-50/50 rounded-2xl">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-300 border-t-transparent"></div>
                    <span className="text-slate-500 font-light">Loading classes...</span>
                  </div>
                ) : (
                  <>
                    <select
                      className={`w-full bg-slate-50/50 border-2 ${
                        errors.selectedClass ? 'border-red-300' : 'border-slate-200/50'
                      } rounded-2xl px-4 py-4 text-slate-800 
                      focus:outline-none focus:border-blue-300 focus:bg-white/80 
                      transition-all duration-200 font-light text-lg`}
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      <option value="">Choose a class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {errors.selectedClass && (
                      <p className="text-red-400 text-sm font-light mt-2">{errors.selectedClass}</p>
                    )}
                  </>
                )}
              </div>

              {/* Student Assignment */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Assign To
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-slate-50/30 hover:bg-slate-50/50 rounded-2xl cursor-pointer transition-all duration-200 border-2 border-transparent hover:border-slate-200/50">
                    <input
                      type="radio"
                      name="studentMode"
                      value="whole"
                      checked={studentMode === "whole"}
                      onChange={() => setStudentMode("whole")}
                      className="w-5 h-5 text-blue-400 bg-transparent border-2 border-slate-300 focus:ring-blue-300 focus:ring-2"
                    />
                    <span className="text-slate-700 font-light">Whole Class</span>
                  </label>
                  <label className={`flex items-center gap-3 p-4 bg-slate-50/30 hover:bg-slate-50/50 rounded-2xl cursor-pointer transition-all duration-200 border-2 border-transparent hover:border-slate-200/50 ${
                    !selectedClass ? 'opacity-50 pointer-events-none' : ''
                  }`}>
                    <input
                      type="radio"
                      name="studentMode"
                      value="selective"
                      checked={studentMode === "selective"}
                      onChange={() => selectedClass && setStudentMode("selective")}
                      className="w-5 h-5 text-blue-400 bg-transparent border-2 border-slate-300 focus:ring-blue-300 focus:ring-2"
                      disabled={!selectedClass}
                    />
                    <span className="text-slate-700 font-light">Selective Students</span>
                  </label>
                </div>
                {studentMode === "selective" && (
                  <div className="flex justify-end">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-light bg-blue-100/50 text-blue-600">
                      {selectedStudents.length} students selected
                    </span>
                  </div>
                )}
                {errors.selectedStudents && (
                  <p className="text-red-400 text-sm font-light">{errors.selectedStudents}</p>
                )}
              </div>

              {/* Total Questions */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Total Questions
                </label>
                <input
                  type="number"
                  className={`w-full bg-slate-50/50 border-2 ${
                    errors.totalQuestions ? 'border-red-300' : 'border-slate-200/50'
                  } rounded-2xl px-4 py-4 text-slate-800 placeholder-slate-400 
                  focus:outline-none focus:border-blue-300 focus:bg-white/80 
                  transition-all duration-200 font-light text-lg`}
                  placeholder="Enter number of questions"
                  value={totalQuestions}
                  onChange={e => setTotalQuestions(Number(e.target.value))}
                  min={1}
                />
                {errors.totalQuestions && (
                  <p className="text-red-400 text-sm font-light mt-2">{errors.totalQuestions}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 
                  text-white px-8 py-4 rounded-2xl font-medium shadow-lg hover:shadow-xl 
                  transition-all duration-300 text-lg flex items-center justify-center
                  disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Creating Test...
                    </>
                  ) : (
                    'Create Test'
                  )}
                </button>
                {submitError && (
                  <p className="text-red-400 text-center font-light mt-4">{submitError}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Student Selection Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg border border-white/50 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-slate-800">Select Students</h2>
                <button
                  className="p-2 hover:bg-slate-100/50 rounded-full transition-colors"
                  onClick={closeStudentModal}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {loadingStudents ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent"></div>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-light">
                  No students found in this class.
                </div>
              ) : (
                <div className="overflow-y-auto max-h-96 p-6">
                  <div className="space-y-3">
                    {students.map((student) => (
                      <label 
                        key={student.id} 
                        className="flex items-center gap-4 p-4 bg-slate-50/30 hover:bg-slate-50/50 rounded-2xl cursor-pointer transition-all duration-200 border-2 border-transparent hover:border-slate-200/30"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentSelection(student.id)}
                          className="w-5 h-5 text-blue-400 bg-transparent border-2 border-slate-300 rounded focus:ring-blue-300 focus:ring-2"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-800 font-medium truncate">{student.name}</div>
                          <div className="text-sm text-slate-500 font-light">
                            {student.rollNumber} {student.email && `• ${student.email}`}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-200/50 flex justify-between items-center">
              <span className="text-slate-600 font-light">
                {selectedStudents.length} students selected
              </span>
              <button
                className="bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 
                text-white px-6 py-3 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={closeStudentModal}
              >
                Save Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {submitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/50 p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-medium text-slate-800 mb-2">Test Created!</h2>
              <p className="text-slate-500 font-light">Your test has been created successfully and is ready for management.</p>
            </div>
            <button
              className="w-full bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 
              text-white px-6 py-4 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => router.push("/assessment-question-bank/assessments/manage-tests")}
            >
              Manage Tests
            </button>
          </div>
        </div>
      )}
    </div>
  );
}