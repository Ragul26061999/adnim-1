"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../shared/Input";
import Select from "../shared/Select";
import LoadingSpinner from "../shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faComments,
  faCheck,
  faTimes,
  faCalendarAlt,
  faUsers,
  faBook,
  faGraduationCap,
  faFileAlt,
  faCloudUpload,
  faSpinner,
  faExclamationTriangle,
  faTrash,
  faFile,
  faUserCheck,
  faCalendarCheck,
  faChartLine,
  faTags,
  faEye,
  faEyeSlash,
  faClipboard,
  faUserGraduate,
  faHome,
  faPlus,
  faMinus
} from "@fortawesome/free-solid-svg-icons";

interface DiaryFormProps {
  entryId?: string;
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Option {
  value: string;
  label: string;
}

const PRIORITY_LEVELS = {
  high: {
    value: "high",
    label: "High Priority",
    color: "#ef4444",
    bgColor: "#fef2f2",
    description: "Requires immediate attention"
  },
  medium: {
    value: "medium",
    label: "Medium Priority", 
    color: "#f59e0b",
    bgColor: "#fffbeb",
    description: "Moderate attention required"
  },
  low: {
    value: "low",
    label: "Low Priority",
    color: "#10b981",
    bgColor: "#f0fdf4",
    description: "Can be addressed later"
  }
};

const REMARK_CATEGORIES = {
  academic: {
    value: "academic",
    label: "Academic Performance",
    icon: faGraduationCap,
    color: "#3b82f6"
  },
  behavior: {
    value: "behavior",
    label: "Behavior & Conduct", 
    icon: faUserCheck,
    color: "#8b5cf6"
  },
  attendance: {
    value: "attendance",
    label: "Attendance",
    icon: faCalendarCheck,
    color: "#06b6d4"
  },
  performance: {
    value: "performance",
    label: "Overall Performance",
    icon: faChartLine,
    color: "#10b981"
  }
};

export default function DiaryForm({ entryId, initialData, onSuccess, onCancel }: DiaryFormProps) {
  const { user, schoolId, loading: authLoading } = useAuth();
  const [entryType, setEntryType] = useState<"homework" | "remark">("homework");
  
  // Debug logging
  console.log("DiaryForm auth state:", { user: user?.uid, schoolId, authLoading });
  
  // Common form data
  const [commonData, setCommonData] = useState({
    classId: initialData?.classId || "",
    subjectId: initialData?.subjectId || "",
  });

  // Homework specific data
  const [homeworkData, setHomeworkData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "medium",
  });

  // Remark specific data
  const [remarkData, setRemarkData] = useState({
    studentId: initialData?.studentId || "",
    personalRemarks: initialData?.personalRemarks || "",
    workRemarks: initialData?.workRemarks || "",
    parentRemarks: initialData?.parentRemarks || "",
    priority: initialData?.priority || "medium",
    category: initialData?.category || "academic",
  });

  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [students, setStudents] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialData?.type) {
      setEntryType(initialData.type);
    }
  }, [initialData]);

  useEffect(() => {
    if (!authLoading && schoolId) {
      fetchClasses();
    } else if (!authLoading && !schoolId) {
      console.error("No schoolId available after auth loading complete");
      setErrors({ classes: "School ID not found. Please ensure you're logged in properly." });
    }
  }, [schoolId, authLoading]);

  useEffect(() => {
    if (commonData.classId) {
      fetchSubjectsForClass(commonData.classId);
      if (entryType === "remark") {
        fetchStudentsForClass(commonData.classId);
      }
    } else {
      setSubjects([]);
      setStudents([]);
    }
  }, [commonData.classId, entryType]);

  const fetchClasses = async () => {
    if (!schoolId) {
      console.error("No schoolId available for fetching classes");
      setErrors({ classes: "School ID not found. Please ensure you're logged in properly." });
      return;
    }
    
    console.log("Fetching classes for school:", schoolId);
    setLoadingData(true);
    try {
      const classesQuery = query(
        collection(db, "classes"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const classesSnapshot = await getDocs(classesQuery);
      
      console.log("Classes found:", classesSnapshot.size);
      
      const classOptions: Option[] = classesSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Class data:", data);
        return {
          value: doc.id,
          label: data.name || "Unknown Class"
        };
      });
      
      setClasses(classOptions);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setErrors({ classes: "Failed to load classes" });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSubjectsForClass = async (classId: string) => {
    if (!schoolId || !classId) {
      console.error("Missing schoolId or classId for fetching subjects:", { schoolId, classId });
      return;
    }
    
    console.log("Fetching subjects for class:", classId, "school:", schoolId);
    try {
      const subjectsQuery = query(
        collection(db, "subjects"),
        where("schoolId", "==", doc(db, "school", schoolId)),
        where("assClass", "array-contains", doc(db, "classes", classId))
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      
      console.log("Subjects found:", subjectsSnapshot.size);
      
      const subjectOptions: Option[] = subjectsSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Subject data:", data);
        return {
          value: doc.id,
          label: data.name || "Unknown Subject"
        };
      });
      
      setSubjects(subjectOptions);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setErrors({ subjects: "Failed to load subjects for this class" });
    }
  };

  const fetchStudentsForClass = async (classId: string) => {
    if (!schoolId || !classId) {
      console.error("Missing schoolId or classId for fetching students:", { schoolId, classId });
      return;
    }
    
    console.log("Fetching students for class:", classId, "school:", schoolId);
    try {
      // First, try to fetch from students collection
      const studentsQuery = query(
        collection(db, "students"),
        where("schoolId", "==", doc(db, "school", schoolId)),
        where("classId", "==", doc(db, "classes", classId))
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      
      console.log("Students found in students collection:", studentsSnapshot.size);
      
      let studentOptions: Option[] = [];
      
      // Process students from students collection
      studentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log("Student data from students collection:", data);
        // Use the userId from students collection as the value
        const userId = data.userId || doc.id;
        studentOptions.push({
          value: userId, // This should be the user ID
          label: data.name || data.email || "Unknown Student"
        });
      });
      
      // If no students found in students collection, try users collection
      if (studentOptions.length === 0) {
        console.log("No students found in students collection, trying users collection...");
        const usersQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("schoolId", "==", doc(db, "school", schoolId)),
          where("class_id", "==", doc(db, "classes", classId))
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        console.log("Students found in users collection:", usersSnapshot.size);
        
        usersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log("Student data from users collection:", data);
          studentOptions.push({
            value: doc.id, // Use the user document ID
            label: data.display_name || data.email || "Unknown Student"
          });
        });
      }
      
      setStudents(studentOptions);
    } catch (error) {
      console.error("Error fetching students:", error);
      setErrors({ students: "Failed to load students for this class" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const maxSize = entryType === "homework" ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for homework, 5MB for remarks
      
      if (file.size > maxSize) {
        setErrors({ file: `File size must be less than ${maxSize / (1024 * 1024)}MB` });
        return;
      }
      
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setErrors({ file: "Please select a valid file (PDF, Word, Text, or Image)" });
        return;
      }
      
      setSelectedFile(file);
      setErrors({ ...errors, file: "" });
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string }> => {
    const storage = getStorage();
    const fileRef = ref(storage, `diary/${entryType}/${schoolId}/${Date.now()}_${file.name}`);
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      setUploadProgress(100);
      return { url: downloadURL, name: file.name };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!commonData.classId) {
      newErrors.classId = "Class is required";
    }

    // Subject is only required for homework, optional for remarks
    if (entryType === "homework" && !commonData.subjectId) {
      newErrors.subjectId = "Subject is required";
    }

    if (entryType === "homework") {
      if (!homeworkData.title?.trim()) {
        newErrors.title = "Title is required";
      } else if (homeworkData.title.length < 3 || homeworkData.title.length > 100) {
        newErrors.title = "Title must be between 3 and 100 characters";
      }

      if (!homeworkData.description?.trim()) {
        newErrors.description = "Description is required";
      } else if (homeworkData.description.length < 10 || homeworkData.description.length > 500) {
        newErrors.description = "Description must be between 10 and 500 characters";
      }
    }

    if (entryType === "remark") {
      if (!remarkData.studentId) {
        newErrors.studentId = "Student is required";
      }

      if (!remarkData.personalRemarks?.trim()) {
        newErrors.personalRemarks = "Personal remarks is required";
      } else if (remarkData.personalRemarks.length < 10 || remarkData.personalRemarks.length > 500) {
        newErrors.personalRemarks = "Personal remarks must be between 10 and 500 characters";
      }

      if (remarkData.workRemarks && remarkData.workRemarks.length > 500) {
        newErrors.workRemarks = "Work remarks must be less than 500 characters";
      }

      if (remarkData.parentRemarks && remarkData.parentRemarks.length > 500) {
        newErrors.parentRemarks = "Parent remarks must be less than 500 characters";
      }
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
      // Debug logging for student ID
      if (entryType === "remark") {
        console.log("Creating remark with student ID:", remarkData.studentId);
        console.log("Selected student data:", remarkData);
      }
      let attachmentUrl = "";
      let attachmentName = "";

      if (selectedFile) {
        const uploadResult = await uploadFile(selectedFile);
        attachmentUrl = uploadResult.url;
        attachmentName = uploadResult.name;
      }

      const baseData: any = {
        type: entryType,
        classId: doc(db, "classes", commonData.classId),
        schoolId: doc(db, "school", schoolId!),
        createdBy: doc(db, "users", user!.uid),
        attachments: attachmentUrl ? [{
          name: attachmentName,
          url: attachmentUrl,
          type: selectedFile?.type || "",
          size: selectedFile?.size || 0
        }] : [],
        ...(entryId 
          ? { updatedAt: serverTimestamp() }
          : { createdAt: serverTimestamp() }
        ),
      };

      // Add subjectId only if it exists (required for homework, optional for remarks)
      if (commonData.subjectId) {
        baseData.subjectId = doc(db, "subjects", commonData.subjectId);
      }

      let entryData;
      let collectionName;

      if (entryType === "homework") {
        entryData = {
          ...baseData,
          title: homeworkData.title.trim(),
          description: homeworkData.description.trim(),
          priority: homeworkData.priority,
          status: "active",
          metadata: {
            isAssignment: true
          }
        };
        collectionName = "homeworks";
      } else {
        entryData = {
          ...baseData,
          studentId: doc(db, "users", remarkData.studentId),
          personalRemarks: remarkData.personalRemarks.trim(),
          workRemarks: remarkData.workRemarks?.trim() || "",
          parentRemarks: remarkData.parentRemarks?.trim() || "",
          priority: remarkData.priority,
          category: remarkData.category,
          status: "active"
        };
        collectionName = "remarks";
      }

      if (entryId) {
        await updateDoc(doc(db, collectionName, entryId), entryData);
      } else {
        await addDoc(collection(db, collectionName), entryData);
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving diary entry:", error);
      setErrors({ submit: "Failed to save diary entry. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const renderHomeworkForm = () => (
    <div className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 form-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faBookOpen} className="text-blue-600 text-sm" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Homework Details</h3>
        </div>
        
        <div className="space-y-6">
          <Input
            label="Title"
            type="text"
            value={homeworkData.title}
            onChange={(value) => setHomeworkData(prev => ({ ...prev, title: value }))}
            placeholder="e.g., Mathematics Problem Set Chapter 5"
            required
            error={errors.title}
          />

          <Input
            label="Description"
            type="textarea"
            value={homeworkData.description}
            onChange={(value) => setHomeworkData(prev => ({ ...prev, description: value }))}
            placeholder="Brief description of the homework assignment..."
            rows={3}
            required
            error={errors.description}
          />
        </div>
      </div>

      {/* Class & Subject */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 form-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faUsers} className="text-green-600 text-sm" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Class & Subject</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Class"
            options={classes}
            value={commonData.classId}
            onChange={(value) => setCommonData(prev => ({ ...prev, classId: value }))}
            placeholder="Select a class"
            required
            disabled={loadingData}
            error={errors.classId}
          />

          <Select
            label="Subject"
            options={subjects}
            value={commonData.subjectId}
            onChange={(value) => setCommonData(prev => ({ ...prev, subjectId: value }))}
            placeholder="Select a subject"
            required
            disabled={!commonData.classId}
            error={errors.subjectId}
          />
        </div>
      </div>

      {/* Priority */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 form-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-orange-600 text-sm" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Priority</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Priority"
            options={Object.values(PRIORITY_LEVELS).map(level => ({
              value: level.value,
              label: level.label
            }))}
            value={homeworkData.priority}
            onChange={(value) => setHomeworkData(prev => ({ ...prev, priority: value }))}
            required
          />
        </div>
      </div>
    </div>
  );

  const renderRemarkForm = () => (
    <div className="space-y-8">
      {/* Student Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 form-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faUserGraduate} className="text-purple-600 text-sm" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Student & Class</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Select
            label="Class"
            options={classes}
            value={commonData.classId}
            onChange={(value) => setCommonData(prev => ({ ...prev, classId: value }))}
            placeholder="Select a class"
            required
            disabled={loadingData}
            error={errors.classId}
          />

          <Select
            label="Student"
            options={students}
            value={remarkData.studentId}
            onChange={(value) => {
              console.log("Student selected:", value);
              console.log("Available students:", students);
              setRemarkData(prev => ({ ...prev, studentId: value }));
            }}
            placeholder="Select a student"
            required
            disabled={!commonData.classId}
            error={errors.studentId}
          />

          <Select
            label="Subject (Optional)"
            options={[{ value: "", label: "All Subjects" }, ...subjects]}
            value={commonData.subjectId}
            onChange={(value) => setCommonData(prev => ({ ...prev, subjectId: value }))}
            placeholder="Select subject (optional)"
            disabled={!commonData.classId}
            error={errors.subjectId}
          />
        </div>
      </div>

      {/* Remarks */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 form-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faComments} className="text-indigo-600 text-sm" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Remarks</h3>
        </div>
        
        <div className="space-y-6">
          <Input
            label="Personal Remarks"
            type="textarea"
            value={remarkData.personalRemarks}
            onChange={(value) => setRemarkData(prev => ({ ...prev, personalRemarks: value }))}
            placeholder="Personal observations about the student's performance, behavior, or progress..."
            rows={3}
            required
            error={errors.personalRemarks}
          />

          <Input
            label="Work Remarks"
            type="textarea"
            value={remarkData.workRemarks}
            onChange={(value) => setRemarkData(prev => ({ ...prev, workRemarks: value }))}
            placeholder="Comments about the student's work quality, completion, or improvement areas..."
            rows={3}
            error={errors.workRemarks}
          />

          <Input
            label="Parent Remarks"
            type="textarea"
            value={remarkData.parentRemarks}
            onChange={(value) => setRemarkData(prev => ({ ...prev, parentRemarks: value }))}
            placeholder="Specific message or recommendations for parents..."
            rows={3}
            error={errors.parentRemarks}
          />
        </div>
      </div>

      {/* Priority & Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 form-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faTags} className="text-amber-600 text-sm" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Priority & Category</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
            <div className="space-y-2">
              {Object.values(PRIORITY_LEVELS).map((level) => (
                <div key={level.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`priority-${level.value}`}
                    name="priority"
                    value={level.value}
                    checked={remarkData.priority === level.value}
                    onChange={(e) => setRemarkData(prev => ({ ...prev, priority: e.target.value }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label
                    htmlFor={`priority-${level.value}`}
                    className="ml-3 flex items-center gap-2 text-sm"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: level.color }}
                    ></span>
                    <span className="font-medium">{level.label}</span>
                    <span className="text-gray-500">- {level.description}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="space-y-2">
              {Object.values(REMARK_CATEGORIES).map((category) => (
                <div key={category.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`category-${category.value}`}
                    name="category"
                    value={category.value}
                    checked={remarkData.category === category.value}
                    onChange={(e) => setRemarkData(prev => ({ ...prev, category: e.target.value }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label
                    htmlFor={`category-${category.value}`}
                    className="ml-3 flex items-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon 
                      icon={category.icon} 
                      className="text-sm"
                      style={{ color: category.color }}
                    />
                    <span className="font-medium">{category.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


    </div>
  );

  // Show loading spinner while authentication is in progress
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show error if user is not authenticated
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-4xl mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to access the diary form.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faClipboard} className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {entryId ? "Edit Diary Entry" : "Create New Diary Entry"}
              </h2>
              <p className="text-purple-100 text-sm">
                {entryId ? "Update diary entry details" : "Choose between homework or remarks"}
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

        {/* Type Selection */}
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={() => setEntryType("homework")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              entryType === "homework"
                ? "bg-white text-purple-600 shadow-lg"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <FontAwesomeIcon icon={faBookOpen} />
            Home Work
          </button>
          <button
            type="button"
            onClick={() => setEntryType("remark")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              entryType === "remark"
                ? "bg-white text-purple-600 shadow-lg"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <FontAwesomeIcon icon={faComments} />
            Remarks
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {entryType === "homework" ? renderHomeworkForm() : renderRemarkForm()}

            {/* File Upload Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 form-section">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faFileAlt} className="text-indigo-600 text-sm" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Attachment</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 file-upload-area ${
                    selectedFile 
                      ? "border-green-300 bg-green-50" 
                      : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50"
                  }`}>
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <FontAwesomeIcon icon={faFile} className="text-green-600 text-xl" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <FontAwesomeIcon icon={faCloudUpload} className="text-purple-600 text-2xl" />
                        </div>
                        <p className="text-gray-700 font-medium mb-2">Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-500">
                          PDF, Word, Text, or Image files 
                          (max {entryType === "homework" ? "10MB" : "5MB"})
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {uploading && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faSpinner} className="text-purple-600 animate-spin" />
                        <span className="text-sm font-medium text-purple-900">Uploading...</span>
                      </div>
                      <span className="text-sm text-purple-700 font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300 progress-bar"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {errors.file && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>{errors.file}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Data Loading Errors */}
            {(errors.classes || errors.subjects || errors.students) && (
              <div className="space-y-2">
                {errors.classes && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>{errors.classes}</span>
                  </div>
                )}
                {errors.subjects && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>{errors.subjects}</span>
                  </div>
                )}
                {errors.students && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>{errors.students}</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit Error */}
            {errors.submit && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-200">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 mt-8">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || loadingData || uploading}
                className={`flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed btn-loading ${
                  loading || uploading ? "animate-pulse" : ""
                }`}
              >
                {loading || uploading ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faCheck} />
                )}
                {loading || uploading ? "Processing..." : (entryId ? "Update Entry" : `Create ${entryType === "homework" ? "Homework" : "Remark"}`)}
              </button>
              
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading || uploading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faTimes} />
                  Cancel
                </button>
              )}
                        </div>
          </form>
        </div>
      </div>
    </div>
  );
} 