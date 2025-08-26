"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import FormCard from "../shared/FormCard";
import Input from "../shared/Input";
import Button from "../shared/Button";
import LoadingSpinner from "../shared/LoadingSpinner";

interface TeacherFormProps {
  teacherId?: string;
  initialData?: {
    name: string;
    email: string;
    teacherId: string;
    classes: string[];
    subjects: string[];
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ClassOption {
  value: string;
  label: string;
}

interface SubjectOption {
  value: string;
  label: string;
}

export default function TeacherForm({ teacherId, initialData, onSuccess, onCancel }: TeacherFormProps) {
  const { user, schoolId } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    teacherId: initialData?.teacherId || "",
    selectedClasses: initialData?.classes || [],
    selectedSubjects: initialData?.subjects || [],
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([fetchClasses(), fetchSubjects()]).finally(() => {
      setLoadingData(false);
    });
  }, [schoolId]);

  const fetchClasses = async () => {
    if (!schoolId) return;
    
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
      setErrors({ classes: "Failed to load classes" });
    }
  };

  const fetchSubjects = async () => {
    if (!schoolId) return;
    
    try {
      const subjectsQuery = query(
        collection(db, "subjects"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      
      const subjectOptions: SubjectOption[] = subjectsSnapshot.docs.map(doc => ({
        value: doc.id,
        label: doc.data().name
      }));
      
      setSubjects(subjectOptions);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setErrors({ subjects: "Failed to load subjects" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Teacher name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!teacherId && !formData.password.trim()) {
      newErrors.password = "Password is required for new teachers";
    } else if (!teacherId && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.teacherId.trim()) {
      newErrors.teacherId = "Teacher ID is required";
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
      let userId = "";
      
      if (teacherId) {
        // Editing existing teacher - no need to create new auth user
        const teacherData = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          teacherId: formData.teacherId.trim(),
          classes: formData.selectedClasses.map(classId => doc(db, "classes", classId)),
          subjects: formData.selectedSubjects.map(subjectId => doc(db, "subjects", subjectId)),
          updatedAt: serverTimestamp(),
        };

        await updateDoc(doc(db, "teachers", teacherId), teacherData);
      } else {
        // Creating new teacher - create auth user first
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );
        userId = userCredential.user.uid;

        // Create user document
        await addDoc(collection(db, "users"), {
          uid: userId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: "teacher",
          schoolId: doc(db, "school", schoolId!),
          createdAt: serverTimestamp(),
        });

        // Create teacher document
        await addDoc(collection(db, "teachers"), {
          name: formData.name.trim(),
          email: formData.email.trim(),
          teacherId: formData.teacherId.trim(),
          userId: doc(db, "users", userId),
          schoolId: doc(db, "school", schoolId!),
          classes: formData.selectedClasses.map(classId => doc(db, "classes", classId)),
          subjects: formData.selectedSubjects.map(subjectId => doc(db, "subjects", subjectId)),
          createdBy: doc(db, "users", user!.uid),
          createdAt: serverTimestamp(),
        });
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving teacher:", error);
      let errorMessage = "Failed to save teacher. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already registered.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleClassToggle = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter(id => id !== classId)
        : [...prev.selectedClasses, classId]
    }));
  };

  const handleSubjectToggle = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter(id => id !== subjectId)
        : [...prev.selectedSubjects, subjectId]
    }));
  };

  return (
    <FormCard title={teacherId ? "Edit Teacher" : "Create New Teacher"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Teacher Name"
          type="text"
          value={formData.name}
          onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
          placeholder="Enter teacher full name"
          required
          error={errors.name}
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
          placeholder="Enter teacher email address"
          required
          error={errors.email}
        />

        {!teacherId && (
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
            placeholder="Enter password (minimum 6 characters)"
            required
            error={errors.password}
          />
        )}

        <Input
          label="Teacher ID"
          type="text"
          value={formData.teacherId}
          onChange={(value) => setFormData(prev => ({ ...prev, teacherId: value }))}
          placeholder="Enter teacher ID (e.g., T001, TCH001)"
          required
          error={errors.teacherId}
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign Classes
          </label>
          {loadingData ? (
            <LoadingSpinner size="small" />
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {classes.length === 0 ? (
                <p className="text-gray-500 text-sm">No classes available. Create classes first.</p>
              ) : (
                classes.map((classOption) => (
                  <label key={classOption.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.selectedClasses.includes(classOption.value)}
                      onChange={() => handleClassToggle(classOption.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{classOption.label}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign Subjects
          </label>
          {loadingData ? (
            <LoadingSpinner size="small" />
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {subjects.length === 0 ? (
                <p className="text-gray-500 text-sm">No subjects available. Create subjects first.</p>
              ) : (
                subjects.map((subjectOption) => (
                  <label key={subjectOption.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.selectedSubjects.includes(subjectOption.value)}
                      onChange={() => handleSubjectToggle(subjectOption.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{subjectOption.label}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {errors.submit && (
          <div className="text-red-600 text-sm">{errors.submit}</div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            loading={loading}
            disabled={loading || loadingData}
            className="flex-1"
          >
            {loading ? <LoadingSpinner size="small" /> : null}
            {teacherId ? "Update Teacher" : "Create Teacher"}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </FormCard>
  );
} 