"use client";
import { useState } from "react";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import FormCard from "../shared/FormCard";
import Input from "../shared/Input";
import Button from "../shared/Button";
import LoadingSpinner from "../shared/LoadingSpinner";

interface ClassFormProps {
  classId?: string;
  initialData?: {
    name: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ClassForm({ classId, initialData, onSuccess, onCancel }: ClassFormProps) {
  const { user, schoolId } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Class name is required";
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
      const classData = {
        name: formData.name.trim(),
        schoolId: doc(db, "school", schoolId!),
        createdBy: doc(db, "users", user!.uid),
        ...(classId 
          ? { updatedAt: serverTimestamp() }
          : { createdAt: serverTimestamp() }
        ),
      };

      if (classId) {
        await updateDoc(doc(db, "classes", classId), classData);
      } else {
        await addDoc(collection(db, "classes"), classData);
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving class:", error);
      setErrors({ submit: "Failed to save class. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard title={classId ? "Edit Class" : "Create New Class"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Class Name"
          type="text"
          value={formData.name}
          onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
          placeholder="Enter class name (e.g., Class 10A, Grade 5)"
          required
          error={errors.name}
        />

        {errors.submit && (
          <div className="text-red-600 text-sm">{errors.submit}</div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            className="flex-1"
          >
            {loading ? <LoadingSpinner size="small" /> : null}
            {classId ? "Update Class" : "Create Class"}
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