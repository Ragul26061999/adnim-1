"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../shared/Input";
import Select from "../shared/Select";
import LoadingSpinner from "../shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faUser, 
  faEnvelope, 
  faPhone, 
  faCalendarAlt, 
  faMapMarkerAlt, 
  faUsers, 
  faGraduationCap,
  faCheck,
  faTimes,
  faExclamationTriangle,
  faInfoCircle,
  faEye,
  faEyeSlash
} from "@fortawesome/free-solid-svg-icons";
import { 
  checkEmailExists, 
  createStudentWithRelationships, 
  updateStudent, 
  formatDateOfBirth, 
  generateParentPassword 
} from "../../../lib/userManagement";
import { createTestStudent } from "../../../lib/testStudentCreation";

interface StudentFormProps {
  studentId?: string;
  initialData?: {
    name: string;
    email: string;
    phone: string;
    rollNumber: string;
    classId: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    dateOfBirth: any;
    address: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ClassOption {
  value: string;
  label: string;
}

export default function StudentForm({ studentId, initialData, onSuccess, onCancel }: StudentFormProps) {
  const { user, schoolId } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    rollNumber: initialData?.rollNumber || "",
    classId: initialData?.classId || "",
    dateOfBirth: initialData?.dateOfBirth ? 
      (initialData.dateOfBirth.toDate ? initialData.dateOfBirth.toDate().toISOString().split('T')[0] : "") : "",
    address: initialData?.address || "",
    parentName: initialData?.parentName || "",
    parentPhone: initialData?.parentPhone || "",
    parentEmail: initialData?.parentEmail || "",
    parentOccupation: "",
    parentAddress: "",
    createParentLogin: true
  });

  // UI state
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [parentEmailChecking, setParentEmailChecking] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [existingParent, setExistingParent] = useState<any>(null);

  useEffect(() => {
    if (schoolId) {
      fetchClasses();
    }
  }, [schoolId]);

  // Check email availability in real-time
  useEffect(() => {
    if (formData.email && formData.email.includes('@') && !studentId) {
      checkEmailAvailability(formData.email);
    }
  }, [formData.email, studentId]);

  // Check parent email and lookup existing parent
  useEffect(() => {
    if (formData.parentEmail && formData.parentEmail.includes('@') && !studentId) {
      checkParentEmailAndLookup(formData.parentEmail);
    }
  }, [formData.parentEmail, studentId]);

  const fetchClasses = async () => {
    if (!schoolId) return;
    
    setLoadingClasses(true);
    try {
      const classesQuery = query(
        collection(db, "classes"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const classesSnapshot = await getDocs(classesQuery);
      
      const classOptions: ClassOption[] = classesSnapshot.docs.map(doc => ({
        value: doc.id,
        label: doc.data().name
      }));
      
      setClasses(classOptions);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setErrors(prev => ({ ...prev, classes: "Failed to load classes" }));
    } finally {
      setLoadingClasses(false);
    }
  };

  const checkEmailAvailability = async (email: string) => {
    setEmailChecking(true);
    try {
      const exists = await checkEmailExists(email);
      if (exists) {
        setErrors(prev => ({ ...prev, email: "This email is already registered" }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    } catch (error) {
      console.error("Error checking email:", error);
    } finally {
      setEmailChecking(false);
    }
  };

  const checkParentEmailAndLookup = async (email: string) => {
    setParentEmailChecking(true);
    try {
      // Check if email exists in users collection
      const emailExists = await checkEmailExists(email);
      
      // Look for existing parent in parents collection
      const parentQuery = query(
        collection(db, "parents"),
        where("email", "==", email.toLowerCase().trim())
      );
      const parentSnapshot = await getDocs(parentQuery);
      
      if (!parentSnapshot.empty) {
        const parentDoc = parentSnapshot.docs[0];
        const parentData = parentDoc.data();
        
        setExistingParent({
          id: parentDoc.id,
          ...parentData
        });
        
        // Auto-fill parent information
        setFormData(prev => ({
          ...prev,
          parentName: parentData.name || prev.parentName,
          parentPhone: parentData.phone || prev.parentPhone,
          parentOccupation: parentData.occupation || prev.parentOccupation,
          parentAddress: parentData.address || prev.parentAddress,
          createParentLogin: !!parentData.hasLoginAccess
        }));
        
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.parentEmail;
          return newErrors;
        });
      } else {
        setExistingParent(null);
        
        if (emailExists && formData.createParentLogin) {
          setErrors(prev => ({ 
            ...prev, 
            parentEmail: "This email is already registered. Uncheck 'Create Parent Login' to continue or use a different email." 
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.parentEmail;
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error("Error checking parent email:", error);
    } finally {
      setParentEmailChecking(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Student validation
    if (!formData.name.trim()) {
      newErrors.name = "Student name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Student email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.rollNumber.trim()) {
      newErrors.rollNumber = "Roll number is required";
    }

    if (!formData.classId) {
      newErrors.classId = "Class is required";
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    }

    // Parent validation
    if (!formData.parentName.trim()) {
      newErrors.parentName = "Parent name is required";
    }

    if (!formData.parentEmail.trim()) {
      newErrors.parentEmail = "Parent email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.parentEmail)) {
      newErrors.parentEmail = "Please enter a valid parent email address";
    }

    if (!formData.parentPhone.trim()) {
      newErrors.parentPhone = "Parent phone is required";
    }

    if (!schoolId) {
      newErrors.school = "School ID is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (studentId) {
        // Update existing student
        const updates = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || "",
          rollNumber: formData.rollNumber.trim(),
          classId: doc(db, "classes", formData.classId),
          dateOfBirth: new Date(formData.dateOfBirth),
          address: formData.address.trim() || "",
        };

        await updateStudent(studentId, updates);
        onSuccess?.();
      } else {
        // Create new student with relationships
        const studentPassword = formatDateOfBirth(formData.dateOfBirth);
        const parentPassword = generateParentPassword();

        const studentData = {
          email: formData.email.trim(),
          name: formData.name.trim(),
          rollNumber: formData.rollNumber.trim(),
          classId: doc(db, "classes", formData.classId),
          dateOfBirth: new Date(formData.dateOfBirth),
          phone: formData.phone.trim() || "",
          address: formData.address.trim() || "",
          admissionDate: new Date(),
          schoolId: doc(db, "school", schoolId!),
          isActive: true,
          createdBy: doc(db, "users", user!.uid)
        };

        const parentData = {
          email: formData.parentEmail.trim(),
          name: formData.parentName.trim(),
          phone: formData.parentPhone.trim(),
          occupation: formData.parentOccupation.trim() || "",
          address: formData.parentAddress.trim() || formData.address.trim() || "",
          schoolId: doc(db, "school", schoolId!),
          hasLoginAccess: formData.createParentLogin,
          isActive: true,
          createdBy: doc(db, "users", user!.uid)
        };

        console.log("🚀 Creating student with data:", studentData);
        console.log("🧑‍🎓 Parent data:", parentData);
        console.log("🔑 Student password:", studentPassword);
        console.log("👨‍👩‍👧‍👦 Create parent login:", formData.createParentLogin);

        const result = await createStudentWithRelationships(
          studentData,
          parentData,
          studentPassword,
          parentPassword,
          formData.createParentLogin
        );

        console.log("✅ Student creation result:", result);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error("Error saving student:", error);
      setErrors({ submit: error.message || "Failed to save student. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faGraduationCap} className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {studentId ? "Edit Student" : "Add New Student"}
              </h2>
              <p className="text-blue-100 text-sm">
                {studentId ? "Update student information" : "Create student account with parent details"}
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
            >
              <FontAwesomeIcon icon={faTimes} className="text-lg" />
            </button>
          )}
        </div>
      </div>

      {/* Form Content */}
      <div className="h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Student Information Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUser} className="text-blue-600 text-sm" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Student Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  type="text"
                  value={formData.name}
                  onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                  placeholder="Enter student's full name"
                  required
                  error={errors.name}
                />

                <div className="relative">
                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                    placeholder="student@example.com"
                    required
                    error={errors.email}
                    disabled={!!studentId}
                  />
                  {emailChecking && (
                    <div className="absolute right-3 top-9">
                      <LoadingSpinner size="small" />
                    </div>
                  )}
                </div>

                <Input
                  label="Roll Number"
                  type="text"
                  value={formData.rollNumber}
                  onChange={(value) => setFormData(prev => ({ ...prev, rollNumber: value }))}
                  placeholder="e.g., 001, STU001"
                  required
                  error={errors.rollNumber}
                />

                <Select
                  label="Class"
                  options={classes}
                  value={formData.classId}
                  onChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}
                  placeholder="Select a class"
                  required
                  disabled={loadingClasses}
                  error={errors.classId}
                />

                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(value) => setFormData(prev => ({ ...prev, dateOfBirth: value }))}
                  required
                  error={errors.dateOfBirth}
                />

                <Input
                  label="Phone Number (Optional)"
                  type="tel"
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  placeholder="+91 9876543210"
                  error={errors.phone}
                />
              </div>

              <div className="mt-6">
                <Input
                  label="Address (Optional)"
                  type="textarea"
                  value={formData.address}
                  onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                  placeholder="Enter complete address"
                  rows={3}
                  error={errors.address}
                />
              </div>
            </div>

            {/* Parent Information Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUsers} className="text-green-600 text-sm" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Parent Information</h3>
              </div>

              {existingParent && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-green-600 mt-1" />
                    <div>
                      <p className="text-green-800 font-medium">Existing Parent Found</p>
                      <p className="text-green-700 text-sm">
                        Parent record exists for {existingParent.name}. Their information has been auto-filled.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Parent Name"
                  type="text"
                  value={formData.parentName}
                  onChange={(value) => setFormData(prev => ({ ...prev, parentName: value }))}
                  placeholder="Enter parent's full name"
                  required
                  error={errors.parentName}
                />

                <div className="relative">
                  <Input
                    label="Parent Email"
                    type="email"
                    value={formData.parentEmail}
                    onChange={(value) => setFormData(prev => ({ ...prev, parentEmail: value }))}
                    placeholder="parent@example.com"
                    required
                    error={errors.parentEmail}
                    disabled={!!studentId}
                  />
                  {parentEmailChecking && (
                    <div className="absolute right-3 top-9">
                      <LoadingSpinner size="small" />
                    </div>
                  )}
                </div>

                <Input
                  label="Parent Phone"
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(value) => setFormData(prev => ({ ...prev, parentPhone: value }))}
                  placeholder="+91 9876543210"
                  required
                  error={errors.parentPhone}
                />

                <Input
                  label="Occupation (Optional)"
                  type="text"
                  value={formData.parentOccupation}
                  onChange={(value) => setFormData(prev => ({ ...prev, parentOccupation: value }))}
                  placeholder="e.g., Engineer, Doctor, Teacher"
                />
              </div>

              <div className="mt-6">
                <Input
                  label="Parent Address (Optional)"
                  type="textarea"
                  value={formData.parentAddress}
                  onChange={(value) => setFormData(prev => ({ ...prev, parentAddress: value }))}
                  placeholder="If different from student address"
                  rows={2}
                />
              </div>

              {!studentId && !existingParent && (
                <div className="mt-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.createParentLogin}
                      onChange={(e) => setFormData(prev => ({ ...prev, createParentLogin: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Create parent login account
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Allow parent to login and view their child's progress, assignments, and reports
                  </p>
                </div>
              )}
            </div>

            {/* Login Information */}
            {!studentId && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-blue-900">Login Information</h4>
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={showPasswords ? faEyeSlash : faEye} />
                    {showPasswords ? "Hide" : "Show"} Passwords
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <h5 className="font-medium text-gray-900 mb-2">Student Login</h5>
                    <p className="text-sm text-gray-600 mb-2">Email: {formData.email || "student@example.com"}</p>
                    <p className="text-sm text-gray-600">
                      Password: {showPasswords 
                        ? (formData.dateOfBirth ? formatDateOfBirth(formData.dateOfBirth) : "DDMMYYYY")
                        : "••••••••"
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Password format: Date of Birth (DDMMYYYY)</p>
                  </div>

                  {formData.createParentLogin && (
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <h5 className="font-medium text-gray-900 mb-2">Parent Login</h5>
                      <p className="text-sm text-gray-600 mb-2">Email: {formData.parentEmail || "parent@example.com"}</p>
                      <p className="text-sm text-gray-600">
                        Password: {showPasswords ? generateParentPassword() : "••••••••"}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Default password (can be changed later)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Error */}
            {errors.submit && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-200">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{errors.submit}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-6 rounded-b-xl">
        <div className="flex gap-4">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || loadingClasses || emailChecking || parentEmailChecking}
            className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
              loading ? "animate-pulse" : ""
            }`}
          >
            {loading ? (
              <LoadingSpinner size="small" />
            ) : (
              <FontAwesomeIcon icon={faCheck} />
            )}
            {loading ? "Processing..." : (studentId ? "Update Student" : "Create Student")}
          </button>
          
          {/* Temporary Test Button for Debugging */}
          {!studentId && (
            <button
              type="button"
              onClick={async () => {
                console.log("🧪 Testing student creation...");
                const result = await createTestStudent();
                console.log("Test result:", result);
                if (result.success) {
                  alert("Test student created successfully! Check console for details.");
                  onSuccess?.();
                } else {
                  alert(`Test failed: ${result.message}`);
                }
              }}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200"
            >
              🧪 Test Create
            </button>
          )}
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faTimes} />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 