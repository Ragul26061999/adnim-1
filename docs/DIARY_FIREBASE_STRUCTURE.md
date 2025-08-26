# Diary Management Firebase Structure

## Overview

The diary management system uses two main collections: `homeworks` and `remarks` to store homework assignments and student remarks respectively. Each document includes proper references to users, schools, classes, and subjects.

## Database Collections

### 1. `homeworks` Collection

**Purpose:** Store homework assignments created by teachers

**Document Structure:**

```typescript
interface HomeworkDocument {
  // Basic Information
  id: string; // Auto-generated document ID
  type: "homework";
  title: string; // Required: 3-100 characters
  description: string; // Required: 10-500 characters

  // Relationships
  classId: DocumentReference; // Reference to classes/{classId}
  subjectId: DocumentReference; // Reference to subjects/{subjectId}
  schoolId: DocumentReference; // Reference to school/{schoolId}
  createdBy: DocumentReference; // Reference to users/{userId}

  // Metadata
  priority: "high" | "medium" | "low"; // Default: "medium"
  status: "active" | "archived"; // Default: "active"
  metadata: {
    isAssignment: boolean; // Always true for homework
  };

  // File Attachments
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;

  // Timestamps
  createdAt: Timestamp; // When the homework was created
  updatedAt?: Timestamp; // When the homework was last updated
}
```

**Example Document:**

```json
{
  "id": "hw_123456789",
  "type": "homework",
  "title": "Mathematics Problem Set Chapter 5",
  "description": "Complete exercises 1-20 from Chapter 5. Focus on quadratic equations.",
  "classId": "classes/class_12_science",
  "subjectId": "subjects/mathematics",
  "schoolId": "school/hicas_cbe",
  "createdBy": "users/teacher_123",
  "priority": "medium",
  "status": "active",
  "metadata": {
    "isAssignment": true
  },
  "attachments": [
    {
      "name": "chapter5_problems.pdf",
      "url": "https://firebasestorage.googleapis.com/...",
      "type": "application/pdf",
      "size": 2048576
    }
  ],
  "createdAt": "2025-01-26T10:30:00Z",
  "updatedAt": "2025-01-26T10:30:00Z"
}
```

### 2. `remarks` Collection

**Purpose:** Store student-specific remarks and observations

**Document Structure:**

```typescript
interface RemarkDocument {
  // Basic Information
  id: string; // Auto-generated document ID
  type: "remark";

  // Student Information
  studentId: DocumentReference; // Reference to users/{studentId}

  // Remarks Content
  personalRemarks: string; // Required: 10-500 characters
  workRemarks?: string; // Optional: max 500 characters
  parentRemarks?: string; // Optional: max 500 characters

  // Relationships
  classId: DocumentReference; // Reference to classes/{classId}
  subjectId?: DocumentReference; // Optional: Reference to subjects/{subjectId}
  schoolId: DocumentReference; // Reference to school/{schoolId}
  createdBy: DocumentReference; // Reference to users/{teacherId}

  // Classification
  priority: "high" | "medium" | "low"; // Default: "medium"
  category: "academic" | "behavior" | "attendance" | "performance"; // Default: "academic"

  // Status
  status: "active" | "archived"; // Default: "active"

  // File Attachments
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;

  // Timestamps
  createdAt: Timestamp; // When the remark was created
  updatedAt?: Timestamp; // When the remark was last updated
}
```

**Example Document:**

```json
{
  "id": "rm_987654321",
  "type": "remark",
  "studentId": "users/student_456",
  "personalRemarks": "Student shows excellent problem-solving skills but needs improvement in time management.",
  "workRemarks": "Homework completion rate is 85%. Quality of work is consistently good.",
  "parentRemarks": "Please encourage more practice with time-bound exercises.",
  "classId": "classes/class_12_science",
  "subjectId": "subjects/mathematics",
  "schoolId": "school/hicas_cbe",
  "createdBy": "users/teacher_123",
  "priority": "medium",
  "category": "academic",
  "status": "active",
  "attachments": [
    {
      "name": "progress_report.pdf",
      "url": "https://firebasestorage.googleapis.com/...",
      "type": "application/pdf",
      "size": 1048576
    }
  ],
  "createdAt": "2025-01-26T14:45:00Z",
  "updatedAt": "2025-01-26T14:45:00Z"
}
```

## Related Collections

### 3. `classes` Collection

**Purpose:** Store class information

```typescript
interface ClassDocument {
  id: string;
  name: string; // e.g., "Class 12 Science"
  schoolId: DocumentReference;
  // ... other class fields
}
```

### 4. `subjects` Collection

**Purpose:** Store subject information

```typescript
interface SubjectDocument {
  id: string;
  name: string; // e.g., "Mathematics"
  schoolId: DocumentReference;
  assClass: DocumentReference[]; // Array of class references
  // ... other subject fields
}
```

### 5. `users` Collection

**Purpose:** Store user information (teachers and students)

```typescript
interface UserDocument {
  id: string;
  email: string;
  display_name: string;
  role: "teacher" | "student" | "admin";
  schoolId: DocumentReference;
  // ... other user fields
}
```

### 6. `school` Collection

**Purpose:** Store school information

```typescript
interface SchoolDocument {
  id: string;
  name: string;
  // ... other school fields
}
```

## Firebase Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their school's data
    match /homeworks/{document} {
      allow read, write: if request.auth != null &&
        request.auth.token.schoolId == resource.data.schoolId;
    }

    match /remarks/{document} {
      allow read, write: if request.auth != null &&
        request.auth.token.schoolId == resource.data.schoolId;
    }

    // Allow access to related collections
    match /classes/{document} {
      allow read: if request.auth != null;
    }

    match /subjects/{document} {
      allow read: if request.auth != null;
    }

    match /users/{document} {
      allow read: if request.auth != null;
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /diary/{type}/{schoolId}/{fileName} {
      allow read, write: if request.auth != null &&
        request.auth.token.schoolId == schoolId;
    }
  }
}
```

## File Storage Structure

### Storage Paths

```
diary/
├── homework/
│   └── {schoolId}/
│       └── {timestamp}_{filename}
└── remark/
    └── {schoolId}/
        └── {timestamp}_{filename}
```

### File Validation

- **Maximum Size:** 10MB for homework, 5MB for remarks
- **Allowed Types:** PDF, Word documents, Text files, Images (JPEG, PNG, GIF)
- **Naming Convention:** `{timestamp}_{original_filename}`

## Query Examples

### Fetch Homework for a School

```typescript
const homeworkQuery = query(
  collection(db, "homeworks"),
  where("schoolId", "==", doc(db, "school", schoolId)),
  where("status", "==", "active"),
  orderBy("createdAt", "desc")
);
```

### Fetch Remarks for a Class

```typescript
const remarkQuery = query(
  collection(db, "remarks"),
  where("schoolId", "==", doc(db, "school", schoolId)),
  where("classId", "==", doc(db, "classes", classId)),
  where("status", "==", "active"),
  orderBy("createdAt", "desc")
);
```

### Fetch Remarks for a Specific Student

```typescript
const studentRemarkQuery = query(
  collection(db, "remarks"),
  where("schoolId", "==", doc(db, "school", schoolId)),
  where("studentId", "==", doc(db, "users", studentId)),
  where("status", "==", "active"),
  orderBy("createdAt", "desc")
);
```

## Data Validation

### Required Fields

- **Homework:** `title`, `description`, `classId`, `subjectId`, `schoolId`, `createdBy`
- **Remarks:** `personalRemarks`, `studentId`, `classId`, `schoolId`, `createdBy`

### Field Validation

- **Title:** 3-100 characters
- **Description:** 10-500 characters
- **Personal Remarks:** 10-500 characters
- **Work/Parent Remarks:** Optional, max 500 characters
- **Priority:** Must be "high", "medium", or "low"
- **Category:** Must be "academic", "behavior", "attendance", or "performance"

## User Authentication Context

### Logged-in User Information

```typescript
interface AuthContext {
  user: {
    uid: string;
    email: string;
    displayName: string;
    role: string;
  };
  schoolId: string;
  loading: boolean;
}
```

### Required User Data for Diary Operations

- **User ID:** `user.uid` - Used in `createdBy` field
- **School ID:** `schoolId` - Used in `schoolId` field
- **User Role:** `user.role` - Must be "teacher" or "admin" to create entries

## Error Handling

### Common Error Scenarios

1. **Missing School ID:** User not properly authenticated or school not selected
2. **Invalid Class/Subject:** Selected class or subject doesn't exist
3. **File Upload Errors:** File too large or invalid type
4. **Permission Errors:** User doesn't have access to the school's data

### Error Response Structure

```typescript
interface DiaryError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}
```

## Best Practices

### Data Consistency

1. Always validate school ID before creating/updating documents
2. Use DocumentReference for relationships instead of string IDs
3. Include proper timestamps for audit trails
4. Set appropriate status values for document lifecycle

### Performance Optimization

1. Use compound indexes for common queries
2. Limit query results with pagination
3. Cache frequently accessed data (classes, subjects)
4. Use efficient file storage with proper naming

### Security Considerations

1. Validate user permissions before operations
2. Sanitize user input to prevent injection attacks
3. Use proper Firebase security rules
4. Implement rate limiting for file uploads

## Migration Notes

### From Previous Structure

- Previous diary entries should be migrated to appropriate collections
- Update existing queries to use new field names
- Ensure all required fields are populated
- Validate data integrity after migration

### Backward Compatibility

- Maintain support for existing document structures during transition
- Provide migration scripts for data transformation
- Test thoroughly before deploying changes
