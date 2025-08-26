import { DocumentReference, Timestamp } from "firebase/firestore";

// Base interface for common fields
interface BaseDiaryEntry {
  id: string;
  type: "homework" | "remark";
  schoolId: DocumentReference;
  createdBy: DocumentReference;
  status: "active" | "archived";
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Homework document interface
export interface HomeworkDocument extends BaseDiaryEntry {
  type: "homework";
  title: string;
  description: string;
  classId: DocumentReference;
  subjectId: DocumentReference;
  priority: "high" | "medium" | "low";
  metadata: {
    isAssignment: boolean;
  };
}

// Remark document interface
export interface RemarkDocument extends BaseDiaryEntry {
  type: "remark";
  studentId: DocumentReference;
  personalRemarks: string;
  workRemarks?: string;
  parentRemarks?: string;
  classId: DocumentReference;
  subjectId?: DocumentReference;
  priority: "high" | "medium" | "low";
  category: "academic" | "behavior" | "attendance" | "performance";
}

// Union type for diary entries
export type DiaryDocument = HomeworkDocument | RemarkDocument;

// Form data interfaces
export interface HomeworkFormData {
  title: string;
  description: string;
  classId: string;
  subjectId: string;
  priority: "high" | "medium" | "low";
}

export interface RemarkFormData {
  studentId: string;
  personalRemarks: string;
  workRemarks?: string;
  parentRemarks?: string;
  classId: string;
  subjectId?: string;
  priority: "high" | "medium" | "low";
  category: "academic" | "behavior" | "attendance" | "performance";
}

// Common form data
export interface CommonFormData {
  classId: string;
  subjectId: string;
}

// File attachment interface
export interface FileAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// Priority levels with metadata
export interface PriorityLevel {
  value: "high" | "medium" | "low";
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

// Remark categories with metadata
export interface RemarkCategory {
  value: "academic" | "behavior" | "attendance" | "performance";
  label: string;
  icon: any; // FontAwesome icon
  color: string;
}

// Validation error interface
export interface DiaryValidationError {
  field: string;
  message: string;
}

// Query filters
export interface DiaryFilters {
  type?: "homework" | "remark" | "all";
  priority?: "high" | "medium" | "low" | "all";
  classId?: string;
  subjectId?: string;
  studentId?: string;
  searchTerm?: string;
}

// Statistics interface
export interface DiaryStats {
  total: number;
  homework: number;
  remarks: number;
  highPriority: number;
  byClass?: Record<string, number>;
  bySubject?: Record<string, number>;
}

// API response interfaces
export interface DiaryApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: DiaryValidationError[];
}

// Create diary entry request
export interface CreateDiaryEntryRequest {
  type: "homework" | "remark";
  data: HomeworkFormData | RemarkFormData;
  attachments?: File[];
}

// Update diary entry request
export interface UpdateDiaryEntryRequest {
  id: string;
  type: "homework" | "remark";
  data: Partial<HomeworkFormData> | Partial<RemarkFormData>;
  attachments?: File[];
}

// Delete diary entry request
export interface DeleteDiaryEntryRequest {
  id: string;
  type: "homework" | "remark";
}

// Constants
export const PRIORITY_LEVELS: Record<string, PriorityLevel> = {
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

export const REMARK_CATEGORIES: Record<string, RemarkCategory> = {
  academic: {
    value: "academic",
    label: "Academic Performance",
    icon: null, // Will be set by FontAwesome icon
    color: "#3b82f6"
  },
  behavior: {
    value: "behavior",
    label: "Behavior & Conduct",
    icon: null,
    color: "#8b5cf6"
  },
  attendance: {
    value: "attendance",
    label: "Attendance",
    icon: null,
    color: "#06b6d4"
  },
  performance: {
    value: "performance",
    label: "Overall Performance",
    icon: null,
    color: "#10b981"
  }
};

// Validation rules
export const VALIDATION_RULES = {
  title: {
    minLength: 3,
    maxLength: 100,
    required: true
  },
  description: {
    minLength: 10,
    maxLength: 500,
    required: true
  },
  personalRemarks: {
    minLength: 10,
    maxLength: 500,
    required: true
  },
  workRemarks: {
    maxLength: 500,
    required: false
  },
  parentRemarks: {
    maxLength: 500,
    required: false
  },
  fileSize: {
    homework: 10 * 1024 * 1024, // 10MB
    remark: 5 * 1024 * 1024 // 5MB
  }
};

// File upload configuration
export const FILE_UPLOAD_CONFIG = {
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ],
  maxSize: {
    homework: 10 * 1024 * 1024, // 10MB
    remark: 5 * 1024 * 1024 // 5MB
  },
  storagePath: {
    homework: 'diary/homework',
    remark: 'diary/remark'
  }
};

// Export base interface
export type { BaseDiaryEntry }; 