import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  DocumentReference,
  Timestamp 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { db } from "./firebaseClient";
import {
  HomeworkDocument,
  RemarkDocument,
  DiaryDocument,
  HomeworkFormData,
  RemarkFormData,
  FileAttachment,
  DiaryFilters,
  DiaryStats,
  DiaryValidationError,
  VALIDATION_RULES,
  FILE_UPLOAD_CONFIG
} from "./types/diary";

// Validation functions
export const validateHomeworkData = (data: HomeworkFormData): DiaryValidationError[] => {
  const errors: DiaryValidationError[] = [];

  if (!data.title.trim()) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (data.title.length < VALIDATION_RULES.title.minLength || data.title.length > VALIDATION_RULES.title.maxLength) {
    errors.push({ 
      field: "title", 
      message: `Title must be between ${VALIDATION_RULES.title.minLength} and ${VALIDATION_RULES.title.maxLength} characters` 
    });
  }

  if (!data.description.trim()) {
    errors.push({ field: "description", message: "Description is required" });
  } else if (data.description.length < VALIDATION_RULES.description.minLength || data.description.length > VALIDATION_RULES.description.maxLength) {
    errors.push({ 
      field: "description", 
      message: `Description must be between ${VALIDATION_RULES.description.minLength} and ${VALIDATION_RULES.description.maxLength} characters` 
    });
  }

  if (!data.classId) {
    errors.push({ field: "classId", message: "Class is required" });
  }

  if (!data.subjectId) {
    errors.push({ field: "subjectId", message: "Subject is required" });
  }

  return errors;
};

export const validateRemarkData = (data: RemarkFormData): DiaryValidationError[] => {
  const errors: DiaryValidationError[] = [];

  if (!data.studentId) {
    errors.push({ field: "studentId", message: "Student is required" });
  }

  if (!data.personalRemarks.trim()) {
    errors.push({ field: "personalRemarks", message: "Personal remarks is required" });
  } else if (data.personalRemarks.length < VALIDATION_RULES.personalRemarks.minLength || data.personalRemarks.length > VALIDATION_RULES.personalRemarks.maxLength) {
    errors.push({ 
      field: "personalRemarks", 
      message: `Personal remarks must be between ${VALIDATION_RULES.personalRemarks.minLength} and ${VALIDATION_RULES.personalRemarks.maxLength} characters` 
    });
  }

  if (data.workRemarks && data.workRemarks.length > VALIDATION_RULES.workRemarks.maxLength) {
    errors.push({ 
      field: "workRemarks", 
      message: `Work remarks must be less than ${VALIDATION_RULES.workRemarks.maxLength} characters` 
    });
  }

  if (data.parentRemarks && data.parentRemarks.length > VALIDATION_RULES.parentRemarks.maxLength) {
    errors.push({ 
      field: "parentRemarks", 
      message: `Parent remarks must be less than ${VALIDATION_RULES.parentRemarks.maxLength} characters` 
    });
  }

  if (!data.classId) {
    errors.push({ field: "classId", message: "Class is required" });
  }

  return errors;
};

// File upload functions
export const uploadDiaryFile = async (
  file: File, 
  type: "homework" | "remark", 
  schoolId: string
): Promise<FileAttachment> => {
  const storage = getStorage();
  
  // Validate file size
  const maxSize = FILE_UPLOAD_CONFIG.maxSize[type];
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
  }

  // Validate file type
  if (!FILE_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
    throw new Error("Please select a valid file (PDF, Word, Text, or Image)");
  }

  // Create storage reference
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const storagePath = `${FILE_UPLOAD_CONFIG.storagePath[type]}/${schoolId}/${fileName}`;
  const fileRef = ref(storage, storagePath);

  try {
    // Upload file
    await uploadBytes(fileRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(fileRef);
    
    return {
      name: file.name,
      url: downloadURL,
      type: file.type,
      size: file.size
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
};

export const deleteDiaryFile = async (fileUrl: string): Promise<void> => {
  try {
    const storage = getStorage();
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
};

// CRUD operations
export const createHomework = async (
  data: HomeworkFormData,
  schoolId: string,
  userId: string,
  attachments: File[] = []
): Promise<string> => {
  // Validate data
  const errors = validateHomeworkData(data);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.map(e => e.message).join(", ")}`);
  }

  try {
    // Upload attachments
    const uploadedAttachments: FileAttachment[] = [];
    for (const file of attachments) {
      const attachment = await uploadDiaryFile(file, "homework", schoolId);
      uploadedAttachments.push(attachment);
    }

    // Create homework document
    const homeworkData: Omit<HomeworkDocument, "id"> = {
      type: "homework",
      title: data.title.trim(),
      description: data.description.trim(),
      classId: doc(db, "classes", data.classId),
      subjectId: doc(db, "subjects", data.subjectId),
      schoolId: doc(db, "school", schoolId),
      createdBy: doc(db, "users", userId),
      priority: data.priority,
      status: "active",
      metadata: {
        isAssignment: true
      },
      attachments: uploadedAttachments,
      createdAt: serverTimestamp() as Timestamp
    };

    const docRef = await addDoc(collection(db, "homeworks"), homeworkData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating homework:", error);
    throw new Error("Failed to create homework");
  }
};

export const createRemark = async (
  data: RemarkFormData,
  schoolId: string,
  userId: string,
  attachments: File[] = []
): Promise<string> => {
  // Validate data
  const errors = validateRemarkData(data);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.map(e => e.message).join(", ")}`);
  }

  try {
    // Upload attachments
    const uploadedAttachments: FileAttachment[] = [];
    for (const file of attachments) {
      const attachment = await uploadDiaryFile(file, "remark", schoolId);
      uploadedAttachments.push(attachment);
    }

    // Create remark document
    const remarkData: Omit<RemarkDocument, "id"> = {
      type: "remark",
      studentId: doc(db, "users", data.studentId),
      personalRemarks: data.personalRemarks.trim(),
      workRemarks: data.workRemarks?.trim(),
      parentRemarks: data.parentRemarks?.trim(),
      classId: doc(db, "classes", data.classId),
      subjectId: data.subjectId ? doc(db, "subjects", data.subjectId) : undefined,
      schoolId: doc(db, "school", schoolId),
      createdBy: doc(db, "users", userId),
      priority: data.priority,
      category: data.category,
      status: "active",
      attachments: uploadedAttachments,
      createdAt: serverTimestamp() as Timestamp
    };

    const docRef = await addDoc(collection(db, "remarks"), remarkData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating remark:", error);
    throw new Error("Failed to create remark");
  }
};

export const updateHomework = async (
  id: string,
  data: Partial<HomeworkFormData>,
  attachments: File[] = []
): Promise<void> => {
  try {
    // Upload new attachments
    const uploadedAttachments: FileAttachment[] = [];
    for (const file of attachments) {
      const attachment = await uploadDiaryFile(file, "homework", "schoolId"); // TODO: Get schoolId
      uploadedAttachments.push(attachment);
    }

    // Update document
    const updateData: Partial<HomeworkDocument> = {
      updatedAt: serverTimestamp() as Timestamp
    };

    if (data.title) updateData.title = data.title.trim();
    if (data.description) updateData.description = data.description.trim();
    if (data.classId) updateData.classId = doc(db, "classes", data.classId);
    if (data.subjectId) updateData.subjectId = doc(db, "subjects", data.subjectId);
    if (data.priority) updateData.priority = data.priority;
    if (uploadedAttachments.length > 0) updateData.attachments = uploadedAttachments;

    await updateDoc(doc(db, "homeworks", id), updateData);
  } catch (error) {
    console.error("Error updating homework:", error);
    throw new Error("Failed to update homework");
  }
};

export const updateRemark = async (
  id: string,
  data: Partial<RemarkFormData>,
  attachments: File[] = []
): Promise<void> => {
  try {
    // Upload new attachments
    const uploadedAttachments: FileAttachment[] = [];
    for (const file of attachments) {
      const attachment = await uploadDiaryFile(file, "remark", "schoolId"); // TODO: Get schoolId
      uploadedAttachments.push(attachment);
    }

    // Update document
    const updateData: Partial<RemarkDocument> = {
      updatedAt: serverTimestamp() as Timestamp
    };

    if (data.studentId) updateData.studentId = doc(db, "users", data.studentId);
    if (data.personalRemarks) updateData.personalRemarks = data.personalRemarks.trim();
    if (data.workRemarks !== undefined) updateData.workRemarks = data.workRemarks?.trim();
    if (data.parentRemarks !== undefined) updateData.parentRemarks = data.parentRemarks?.trim();
    if (data.classId) updateData.classId = doc(db, "classes", data.classId);
    if (data.subjectId !== undefined) {
      updateData.subjectId = data.subjectId ? doc(db, "subjects", data.subjectId) : undefined;
    }
    if (data.priority) updateData.priority = data.priority;
    if (data.category) updateData.category = data.category;
    if (uploadedAttachments.length > 0) updateData.attachments = uploadedAttachments;

    await updateDoc(doc(db, "remarks", id), updateData);
  } catch (error) {
    console.error("Error updating remark:", error);
    throw new Error("Failed to update remark");
  }
};

export const deleteDiaryEntry = async (
  id: string,
  type: "homework" | "remark"
): Promise<void> => {
  try {
    const collectionName = type === "homework" ? "homeworks" : "remarks";
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error("Error deleting diary entry:", error);
    throw new Error("Failed to delete diary entry");
  }
};

// Query functions
export const getDiaryEntries = async (
  schoolId: string,
  filters: DiaryFilters = {}
): Promise<DiaryDocument[]> => {
  try {
    const entries: DiaryDocument[] = [];

    // Fetch homework entries
    if (filters.type === "all" || filters.type === "homework" || !filters.type) {
      const homeworkQuery = query(
        collection(db, "homeworks"),
        where("schoolId", "==", doc(db, "school", schoolId)),
        where("status", "==", "active"),
        orderBy("createdAt", "desc")
      );
      const homeworkSnapshot = await getDocs(homeworkQuery);
      entries.push(...homeworkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HomeworkDocument[]);
    }

    // Fetch remark entries
    if (filters.type === "all" || filters.type === "remark" || !filters.type) {
      const remarkQuery = query(
        collection(db, "remarks"),
        where("schoolId", "==", doc(db, "school", schoolId)),
        where("status", "==", "active"),
        orderBy("createdAt", "desc")
      );
      const remarkSnapshot = await getDocs(remarkQuery);
      entries.push(...remarkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RemarkDocument[]);
    }

    // Apply additional filters
    let filteredEntries = entries;

    if (filters.priority && filters.priority !== "all") {
      filteredEntries = filteredEntries.filter(entry => entry.priority === filters.priority);
    }

    if (filters.classId) {
      filteredEntries = filteredEntries.filter(entry => {
        const entryClassId = typeof entry.classId === "string" ? entry.classId : entry.classId.id;
        return entryClassId === filters.classId;
      });
    }

    if (filters.subjectId) {
      filteredEntries = filteredEntries.filter(entry => {
        if (entry.type === "homework") {
          const entrySubjectId = typeof entry.subjectId === "string" ? entry.subjectId : entry.subjectId.id;
          return entrySubjectId === filters.subjectId;
        }
        return entry.subjectId && (typeof entry.subjectId === "string" ? entry.subjectId : entry.subjectId.id) === filters.subjectId;
      });
    }

    if (filters.studentId) {
      filteredEntries = filteredEntries.filter(entry => {
        if (entry.type === "remark") {
          const entryStudentId = typeof entry.studentId === "string" ? entry.studentId : entry.studentId.id;
          return entryStudentId === filters.studentId;
        }
        return false;
      });
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredEntries = filteredEntries.filter(entry => {
        if (entry.type === "homework") {
          return entry.title.toLowerCase().includes(searchTerm) ||
                 entry.description.toLowerCase().includes(searchTerm);
        } else {
          return entry.personalRemarks.toLowerCase().includes(searchTerm) ||
                 (entry.workRemarks && entry.workRemarks.toLowerCase().includes(searchTerm)) ||
                 (entry.parentRemarks && entry.parentRemarks.toLowerCase().includes(searchTerm));
        }
      });
    }

    return filteredEntries;
  } catch (error) {
    console.error("Error fetching diary entries:", error);
    throw new Error("Failed to fetch diary entries");
  }
};

export const getDiaryStats = async (schoolId: string): Promise<DiaryStats> => {
  try {
    const entries = await getDiaryEntries(schoolId);
    
    const stats: DiaryStats = {
      total: entries.length,
      homework: entries.filter(entry => entry.type === "homework").length,
      remarks: entries.filter(entry => entry.type === "remark").length,
      highPriority: entries.filter(entry => entry.priority === "high").length
    };

    return stats;
  } catch (error) {
    console.error("Error fetching diary stats:", error);
    throw new Error("Failed to fetch diary stats");
  }
};

// Utility functions
export const formatDiaryDate = (timestamp: Timestamp): string => {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp as any);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getPriorityColor = (priority: "high" | "medium" | "low") => {
  const colors = {
    high: { color: "#ef4444", bgColor: "#fef2f2" },
    medium: { color: "#f59e0b", bgColor: "#fffbeb" },
    low: { color: "#10b981", bgColor: "#f0fdf4" }
  };
  return colors[priority] || colors.medium;
}; 