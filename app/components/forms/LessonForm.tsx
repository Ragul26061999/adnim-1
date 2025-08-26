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

interface LessonFormProps {
  lessonId?: string;
  initialData?: {
    name: string;
    description: string;
    content: string;
    subjectId: string;
    chapterId: string;
    orderIndex: number;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface SubjectOption {
  value: string;
  label: string;
}

interface ChapterOption {
  value: string;
  label: string;
}

export default function LessonForm({ lessonId, initialData, onSuccess, onCancel }: LessonFormProps) {
  const { user, schoolId } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    content: initialData?.content || "",
    subjectId: initialData?.subjectId || "",
    chapterId: initialData?.chapterId || "",
    orderIndex: initialData?.orderIndex || 1,
  });
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSubjects();
  }, [schoolId]);

  useEffect(() => {
    if (formData.subjectId) {
      fetchChapters(formData.subjectId);
    } else {
      setChapters([]);
      setFormData(prev => ({ ...prev, chapterId: "" }));
    }
  }, [formData.subjectId]);

  const fetchSubjects = async () => {
    if (!schoolId) return;
    
    setLoadingSubjects(true);
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
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchChapters = async (subjectId: string) => {
    setLoadingChapters(true);
    try {
      const chaptersQuery = query(
        collection(db, "chapters"),
        where("subjectId", "==", doc(db, "subjects", subjectId)),
        where("schoolId", "==", doc(db, "school", schoolId!))
      );
      const chaptersSnapshot = await getDocs(chaptersQuery);
      
      const chapterOptions: ChapterOption[] = chaptersSnapshot.docs.map(doc => ({
        value: doc.id,
        label: doc.data().name
      }));
      
      setChapters(chapterOptions);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      setErrors({ chapters: "Failed to load chapters" });
    } finally {
      setLoadingChapters(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Lesson name is required";
    }

    if (!formData.subjectId) {
      newErrors.subjectId = "Subject is required";
    }

    if (!formData.chapterId) {
      newErrors.chapterId = "Chapter is required";
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
      const lessonData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        content: formData.content.trim(),
        subjectId: doc(db, "subjects", formData.subjectId),
        chapterId: doc(db, "chapters", formData.chapterId),
        schoolId: doc(db, "school", schoolId!),
        orderIndex: formData.orderIndex,
        createdBy: doc(db, "users", user!.uid),
        ...(lessonId 
          ? { updatedAt: serverTimestamp() }
          : { createdAt: serverTimestamp() }
        ),
      };

      if (lessonId) {
        await updateDoc(doc(db, "lessons", lessonId), lessonData);
      } else {
        await addDoc(collection(db, "lessons"), lessonData);
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving lesson:", error);
      setErrors({ submit: "Failed to save lesson. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard title={lessonId ? "Edit Lesson" : "Create New Lesson"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Subject"
          options={subjects}
          value={formData.subjectId}
          onChange={(value) => setFormData(prev => ({ ...prev, subjectId: value }))}
          placeholder="Select a subject"
          required
          disabled={loadingSubjects}
        />

        <Select
          label="Chapter"
          options={chapters}
          value={formData.chapterId}
          onChange={(value) => setFormData(prev => ({ ...prev, chapterId: value }))}
          placeholder="Select a chapter"
          required
          disabled={loadingChapters || !formData.subjectId}
        />

        <Input
          label="Lesson Name"
          type="text"
          value={formData.name}
          onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
          placeholder="Enter lesson name"
          required
          error={errors.name}
        />

        <Input
          label="Description"
          type="textarea"
          value={formData.description}
          onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
          placeholder="Enter lesson description (optional)"
          rows={3}
        />

        <Input
          label="Content"
          type="textarea"
          value={formData.content}
          onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
          placeholder="Enter lesson content"
          rows={5}
        />

        <Input
          label="Order Index"
          type="number"
          value={formData.orderIndex.toString()}
          onChange={(value) => setFormData(prev => ({ ...prev, orderIndex: parseInt(value) || 1 }))}
          placeholder="Enter order index (1, 2, 3, ...)"
          required
        />

        {errors.submit && (
          <div className="text-red-600 text-sm">{errors.submit}</div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            loading={loading}
            disabled={loading || loadingSubjects || loadingChapters}
            className="flex-1"
          >
            {loading ? <LoadingSpinner size="small" /> : null}
            {lessonId ? "Update Lesson" : "Create Lesson"}
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