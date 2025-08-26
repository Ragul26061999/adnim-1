"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import FormCard from "../shared/FormCard";
import Input from "../shared/Input";
import Select from "../shared/Select";
import Button from "../shared/Button";
import LoadingSpinner from "../shared/LoadingSpinner";

interface SubjectFormProps {
  subjectId?: string;
  initialData?: {
    name: string;
    description: string;
    image: string;
    assClass: string[];
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ClassOption {
  value: string;
  label: string;
}

export default function SubjectForm({ subjectId, initialData, onSuccess, onCancel }: SubjectFormProps) {
  const { user, schoolId } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    image: initialData?.image || "",
    selectedClasses: initialData?.assClass || [],
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchClasses();
  }, [schoolId]);

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
      setErrors({ classes: "Failed to load classes" });
    } finally {
      setLoadingClasses(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Subject name is required";
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
      const subjectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: formData.image.trim(),
        schoolId: doc(db, "school", schoolId!),
        assClass: formData.selectedClasses.map(classId => doc(db, "classes", classId)),
        createdBy: doc(db, "users", user!.uid),
        ...(subjectId 
          ? { updatedAt: serverTimestamp() }
          : { createdAt: serverTimestamp() }
        ),
      };

      if (subjectId) {
        await updateDoc(doc(db, "subjects", subjectId), subjectData);
      } else {
        await addDoc(collection(db, "subjects"), subjectData);
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving subject:", error);
      setErrors({ submit: "Failed to save subject. Please try again." });
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

  return (
    <FormCard title={subjectId ? "Edit Subject" : "Create New Subject"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Subject Name"
          type="text"
          value={formData.name}
          onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
          placeholder="Enter subject name (e.g., Mathematics, English)"
          required
          error={errors.name}
        />

        <Input
          label="Description"
          type="textarea"
          value={formData.description}
          onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
          placeholder="Enter subject description (optional)"
          rows={3}
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Image
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // For demo purposes, we'll use a placeholder URL
                  // In production, you would upload to Firebase Storage
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setFormData(prev => ({ ...prev, image: e.target?.result as string }));
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {formData.image && (
              <img 
                src={formData.image} 
                alt="Subject preview" 
                className="w-12 h-12 object-cover rounded-full"
              />
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign to Classes
          </label>
          {loadingClasses ? (
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

        {errors.submit && (
          <div className="text-red-600 text-sm">{errors.submit}</div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            loading={loading}
            disabled={loading || loadingClasses}
            className="flex-1"
          >
            {loading ? <LoadingSpinner size="small" /> : null}
            {subjectId ? "Update Subject" : "Create Subject"}
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