# Diary System Backend Structure

## Overview

The diary system supports two main types of entries:

1. **Home Works** - Academic assignments and tasks
2. **Remarks** - Personal observations and feedback for individual students

## Collections Structure

### 1. Home Works Collection (`homeworks`)

```javascript
{
  id: "homework_123",
  type: "homework",
  title: "Mathematics Practice Set",
  description: "Complete exercises from Chapter 5 - Algebra",
  classId: "ref:classes/class_123",
  subjectId: "ref:subjects/subject_456",
  workToDo: "Solve problems 1-20 from textbook page 85-90",
  dueDate: "2024-01-15T23:59:59Z",
  createdAt: "2024-01-10T09:00:00Z",
  updatedAt: "2024-01-10T09:00:00Z",
  createdBy: "ref:users/teacher_789",
  schoolId: "ref:schools/school_001",
  status: "active", // active, completed, archived
  attachments: [
    {
      name: "practice_sheet.pdf",
      url: "https://storage.firebase.com/...",
      type: "application/pdf",
      size: 1024000
    }
  ],
  metadata: {
    estimatedTime: "60 minutes",
    difficulty: "medium", // easy, medium, hard
    isAssignment: true,
    priority: "high" // high, medium, low
  }
}
```

### 2. Remarks Collection (`remarks`)

```javascript
{
  id: "remark_456",
  type: "remark",
  studentId: "ref:users/student_123",
  classId: "ref:classes/class_123",
  subjectId: "ref:subjects/subject_456", // optional
  personalRemarks: "Student shows excellent progress in problem-solving skills",
  workRemarks: "Needs to improve handwriting and show more detailed working",
  parentRemarks: "Please encourage daily practice at home",
  priority: "high", // high, medium, low
  category: "academic", // academic, behavior, attendance, performance
  tags: ["improvement", "mathematics", "problem-solving"],
  isPrivate: false, // true if only for internal use
  visibleToParents: true,
  visibleToStudent: true,
  createdAt: "2024-01-10T14:30:00Z",
  updatedAt: "2024-01-10T14:30:00Z",
  createdBy: "ref:users/teacher_789",
  schoolId: "ref:schools/school_001",
  followUpRequired: true,
  followUpDate: "2024-01-17T09:00:00Z",
  status: "active", // active, resolved, archived
  attachments: [
    {
      name: "student_work_sample.jpg",
      url: "https://storage.firebase.com/...",
      type: "image/jpeg",
      size: 512000
    }
  ]
}
```

## Priority System

### Priority Levels

```javascript
const PRIORITY_LEVELS = {
  HIGH: {
    value: "high",
    label: "High Priority",
    color: "#ef4444", // red
    bgColor: "#fef2f2",
    description: "Requires immediate attention",
  },
  MEDIUM: {
    value: "medium",
    label: "Medium Priority",
    color: "#f59e0b", // amber
    bgColor: "#fffbeb",
    description: "Moderate attention required",
  },
  LOW: {
    value: "low",
    label: "Low Priority",
    color: "#10b981", // green
    bgColor: "#f0fdf4",
    description: "Can be addressed later",
  },
};
```

## Remark Categories

```javascript
const REMARK_CATEGORIES = {
  ACADEMIC: {
    value: "academic",
    label: "Academic Performance",
    icon: "faGraduationCap",
    color: "#3b82f6",
  },
  BEHAVIOR: {
    value: "behavior",
    label: "Behavior & Conduct",
    icon: "faUserCheck",
    color: "#8b5cf6",
  },
  ATTENDANCE: {
    value: "attendance",
    label: "Attendance",
    icon: "faCalendarCheck",
    color: "#06b6d4",
  },
  PERFORMANCE: {
    value: "performance",
    label: "Overall Performance",
    icon: "faChartLine",
    color: "#10b981",
  },
};
```

## Validation Rules

### Home Works

- `title`: Required, 3-100 characters
- `description`: Required, 10-500 characters
- `classId`: Required, valid class reference
- `subjectId`: Required, valid subject reference
- `workToDo`: Required, 10-1000 characters
- `dueDate`: Required, must be future date
- `priority`: Required, one of [high, medium, low]
- `attachments`: Optional, max 5 files, max 10MB each

### Remarks

- `studentId`: Required, valid student reference
- `classId`: Required, valid class reference
- `personalRemarks`: Required, 10-500 characters
- `workRemarks`: Optional, max 500 characters
- `parentRemarks`: Optional, max 500 characters
- `priority`: Required, one of [high, medium, low]
- `category`: Required, one of [academic, behavior, attendance, performance]
- `tags`: Optional, array of strings, max 10 tags
- `attachments`: Optional, max 3 files, max 5MB each

## Security Rules (Firestore)

```javascript
// Home Works
match /homeworks/{homeworkId} {
  allow read: if isAuthenticated() &&
    (isTeacher() || isStudent() || isParent()) &&
    belongsToSameSchool(resource.data.schoolId);

  allow write: if isAuthenticated() && isTeacher() &&
    belongsToSameSchool(request.resource.data.schoolId);
}

// Remarks
match /remarks/{remarkId} {
  allow read: if isAuthenticated() &&
    (isTeacher() ||
     (isStudent() && resource.data.studentId == request.auth.uid && resource.data.visibleToStudent) ||
     (isParent() && isParentOfStudent(resource.data.studentId) && resource.data.visibleToParents));

  allow write: if isAuthenticated() && isTeacher() &&
    belongsToSameSchool(request.resource.data.schoolId);
}
```

## API Endpoints Structure

### Home Works

- `GET /api/homeworks` - List all homeworks for class/subject
- `POST /api/homeworks` - Create new homework
- `PUT /api/homeworks/{id}` - Update homework
- `DELETE /api/homeworks/{id}` - Delete homework
- `GET /api/homeworks/{id}` - Get specific homework

### Remarks

- `GET /api/remarks` - List remarks (filtered by user role)
- `POST /api/remarks` - Create new remark
- `PUT /api/remarks/{id}` - Update remark
- `DELETE /api/remarks/{id}` - Delete remark
- `GET /api/remarks/student/{studentId}` - Get remarks for specific student
- `GET /api/remarks/class/{classId}` - Get remarks for class

## Indexes Required

### Home Works

```javascript
// Compound indexes
homeworks: [
  ["schoolId", "classId", "dueDate"],
  ["schoolId", "subjectId", "createdAt"],
  ["schoolId", "status", "priority"],
  ["createdBy", "createdAt"],
];
```

### Remarks

```javascript
// Compound indexes
remarks: [
  ["schoolId", "studentId", "createdAt"],
  ["schoolId", "classId", "priority"],
  ["schoolId", "category", "createdAt"],
  ["createdBy", "createdAt"],
  ["studentId", "visibleToStudent", "createdAt"],
  ["studentId", "visibleToParents", "createdAt"],
];
```

## Related Collections

### Students Collection Reference

```javascript
{
  id: "student_123",
  name: "John Doe",
  email: "john@example.com",
  classId: "ref:classes/class_123",
  parentIds: ["ref:users/parent_456"],
  schoolId: "ref:schools/school_001"
}
```

### Classes Collection Reference

```javascript
{
  id: "class_123",
  name: "Grade 10-A",
  schoolId: "ref:schools/school_001",
  teacherId: "ref:users/teacher_789",
  students: ["ref:users/student_123", "ref:users/student_124"]
}
```

### Subjects Collection Reference

```javascript
{
  id: "subject_456",
  name: "Mathematics",
  schoolId: "ref:schools/school_001",
  teacherId: "ref:users/teacher_789",
  classes: ["ref:classes/class_123"]
}
```
