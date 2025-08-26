"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../shared/Input";
import LoadingSpinner from "../shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faUser, 
  faEnvelope, 
  faPhone, 
  faBriefcase,
  faMapMarkerAlt, 
  faUsers, 
  faUserTie,
  faCheck,
  faTimes,
  faExclamationTriangle,
  faInfoCircle,
  faEye,
  faEyeSlash,
  faChild
} from "@fortawesome/free-solid-svg-icons";
import { 
  checkEmailExists, 
  createFirebaseUser, 
  createUserDocument,
  generateParentPassword 
} from "../../../lib/userManagement";

interface ParentFormProps {
  parentId?: string;
  initialData?: {
    name: string;
    email: string;
    phone: string;
    occupation?: string;
    address?: string;
    hasLoginAccess?: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ParentForm({ parentId, initialData, onSuccess, onCancel }: ParentFormProps) {
  const { user, schoolId } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    occupation: initialData?.occupation || "",
    address: initialData?.address || "",
    hasLoginAccess: initialData?.hasLoginAccess ?? true
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingChildren, setExistingChildren] = useState<any[]>([]);

  // Check email availability in real-time
  useEffect(() => {
    if (formData.email && formData.email.includes('@') && !parentId) {
      checkEmailAvailability(formData.email);
    }
  }, [formData.email, parentId]);

  // Fetch existing children if editing parent
  useEffect(() => {
    if (parentId) {
      fetchExistingChildren();
    }
  }, [parentId]);

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

  const fetchExistingChildren = async () => {
    if (!parentId) return;
    
    try {
      const studentsQuery = query(
        collection(db, "students"),
        where("parentId", "==", doc(db, "parents", parentId)),
        where("isActive", "==", true)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      
      const children = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setExistingChildren(children);
    } catch (error) {
      console.error("Error fetching children:", error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Parent name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
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
      if (parentId) {
        // Update existing parent
        const parentDoc = doc(db, "parents", parentId);
        await updateDoc(parentDoc, {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          occupation: formData.occupation.trim() || "",
          address: formData.address.trim() || "",
          hasLoginAccess: formData.hasLoginAccess,
          updatedAt: serverTimestamp()
        });

        onSuccess?.();
      } else {
        // Create new parent
        let parentUserId: string | undefined;

        if (formData.hasLoginAccess) {
          // Create Firebase Auth user for parent
          const parentPassword = generateParentPassword();
          const parentUser = await createFirebaseUser(
            formData.email.trim(),
            parentPassword,
            formData.name.trim()
          );

          // Create user document
          await createUserDocument({
            uid: parentUser.uid,
            email: formData.email.trim(),
            displayName: formData.name.trim(),
            role: "parent",
            schoolId: doc(db, "school", schoolId!),
            isActive: true
          });

          parentUserId = parentUser.uid;
        }

        // Create parent document
        const parentData = {
          userId: parentUserId,
          email: formData.email.trim().toLowerCase(),
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          occupation: formData.occupation.trim() || "",
          address: formData.address.trim() || "",
          schoolId: doc(db, "school", schoolId!),
          children: [], // Empty initially
          hasLoginAccess: formData.hasLoginAccess,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: doc(db, "users", user!.uid)
        };

        await addDoc(collection(db, "parents"), parentData);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error("Error saving parent:", error);
      setErrors({ submit: error.message || "Failed to save parent. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faUserTie} className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {parentId ? "Edit Parent" : "Add New Parent"}
              </h2>
              <p className="text-green-100 text-sm">
                {parentId ? "Update parent information" : "Create parent account and profile"}
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
            
            {/* Parent Information Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUser} className="text-green-600 text-sm" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Parent Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  type="text"
                  value={formData.name}
                  onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                  placeholder="Enter parent's full name"
                  required
                  error={errors.name}
                />

                <div className="relative">
                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                    placeholder="parent@example.com"
                    required
                    error={errors.email}
                    disabled={!!parentId}
                  />
                  {emailChecking && (
                    <div className="absolute right-3 top-9">
                      <LoadingSpinner size="small" />
                    </div>
                  )}
                </div>

                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  placeholder="+91 9876543210"
                  required
                  error={errors.phone}
                />

                <Input
                  label="Occupation (Optional)"
                  type="text"
                  value={formData.occupation}
                  onChange={(value) => setFormData(prev => ({ ...prev, occupation: value }))}
                  placeholder="e.g., Engineer, Doctor, Teacher"
                  error={errors.occupation}
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

              {!parentId && (
                <div className="mt-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.hasLoginAccess}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasLoginAccess: e.target.checked }))}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Create login account
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Allow parent to login and view their children's progress, assignments, and reports
                  </p>
                </div>
              )}
            </div>

            {/* Existing Children Section */}
            {parentId && existingChildren.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faChild} className="text-blue-600 text-sm" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Children</h3>
                </div>

                <div className="space-y-4">
                  {existingChildren.map((child) => (
                    <div key={child.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FontAwesomeIcon icon={faUser} className="text-blue-600 text-sm" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{child.name}</h4>
                          <p className="text-sm text-gray-600">Roll: {child.rollNumber} • Email: {child.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Login Information */}
            {!parentId && formData.hasLoginAccess && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-green-900">Login Information</h4>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-green-600 hover:text-green-800 text-sm flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    {showPassword ? "Hide" : "Show"} Password
                  </button>
                </div>

                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <h5 className="font-medium text-gray-900 mb-2">Parent Login</h5>
                  <p className="text-sm text-gray-600 mb-2">Email: {formData.email || "parent@example.com"}</p>
                  <p className="text-sm text-gray-600">
                    Password: {showPassword ? generateParentPassword() : "••••••••"}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Default password (can be changed after first login)</p>
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
            disabled={loading || emailChecking}
            className={`flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
              loading ? "animate-pulse" : ""
            }`}
          >
            {loading ? (
              <LoadingSpinner size="small" />
            ) : (
              <FontAwesomeIcon icon={faCheck} />
            )}
            {loading ? "Processing..." : (parentId ? "Update Parent" : "Create Parent")}
          </button>
          
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