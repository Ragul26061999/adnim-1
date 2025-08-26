# Assignment Grading Database Structure

## Overview

This document explains how assignment submissions and grading are stored in Firebase Firestore for the student app development team. It covers the complete lifecycle from submission to grading.

---

## Collections Overview

### 1. `assignment_submitted` Collection

This is the main collection where all student assignment submissions and grading information are stored.

### 2. `assignments` Collection

Contains the assignment details created by teachers.

### 3. `students` Collection

Contains student information.

### 4. `users` Collection

Contains user accounts (students exist here too with role: "student").

---

## Assignment Submission Document Structure

### Collection: `assignment_submitted`

Each document represents one student's submission for one assignment.

| Field             | Type                | Description             | Example Value                                 | Notes                                    |
| ----------------- | ------------------- | ----------------------- | --------------------------------------------- | ---------------------------------------- |
| `assignmentId`    | `string`            | ID of the assignment    | `"Pyg6LKFRCSfBUtyCgUq9"`                      | References assignments collection        |
| `studentId`       | `string`            | Student's document ID   | `"rwge5A4UV1dhHHtGu0ITKZ6hpn92"`              | Can be from students or users collection |
| `studentEmail`    | `string`            | Student's email address | `"nelson@edueron.com"`                        | For identification                       |
| `studentName`     | `string`            | Student's display name  | `"Nelson"`                                    | For display purposes                     |
| `assignmentTopic` | `string`            | Assignment title/topic  | `"Assignment Check - 2"`                      | Cached for quick reference               |
| `classId`         | `DocumentReference` | Reference to class      | `doc(db, "classes", "4CpjRnOA8W3ognI5eskQ")`  |                                          |
| `subjectId`       | `DocumentReference` | Reference to subject    | `doc(db, "subjects", "BcIuHVs1BwgFoiJhy0kz")` |                                          |
| `schoolId`        | `DocumentReference` | Reference to school     | `doc(db, "school", "hicas_cbe")`              |                                          |

### File Information Fields

| Field              | Type     | Description                    | Example Value                                  | Notes                         |
| ------------------ | -------- | ------------------------------ | ---------------------------------------------- | ----------------------------- |
| `submissionUrl`    | `string` | Firebase Storage download URL  | `"https://firebasestorage.googleapis.com/..."` | Direct link to submitted file |
| `originalFileName` | `string` | Original name of uploaded file | `"assignment1.pdf"`                            | Preserve original filename    |
| `fileSize`         | `number` | File size in bytes             | `2048576`                                      | For storage management        |

### Submission Metadata Fields

| Field         | Type        | Description               | Example Value                               | Notes                     |
| ------------- | ----------- | ------------------------- | ------------------------------------------- | ------------------------- |
| `submittedAt` | `Timestamp` | When submission was made  | `Timestamp(2024, 0, 25, 14, 30, 0)`         | Firebase server timestamp |
| `status`      | `string`    | Current submission status | `"submitted"` \| `"graded"` \| `"rejected"` | See status values below   |

### Grading Information Fields

| Field      | Type                | Description                  | Example Value                       | Notes                    |
| ---------- | ------------------- | ---------------------------- | ----------------------------------- | ------------------------ |
| `grade`    | `number \| null`    | Numerical grade (0-100)      | `85`                                | `null` if not graded yet |
| `feedback` | `string \| null`    | Teacher's feedback/comments  | `"Good work! Improve formatting."`  | `null` if no feedback    |
| `gradedAt` | `Timestamp \| null` | When it was graded           | `Timestamp(2024, 0, 26, 10, 15, 0)` | `null` if not graded     |
| `gradedBy` | `string \| null`    | Teacher/admin UID who graded | `"5KK3TnpijKO2t33vnHtBO5o65dA3"`    | `null` if not graded     |

---

## Status Values

| Status        | Description                          | When Applied              |
| ------------- | ------------------------------------ | ------------------------- |
| `"submitted"` | Student has submitted the assignment | Initial submission        |
| `"graded"`    | Teacher has approved and graded      | After approval with grade |
| `"rejected"`  | Teacher has rejected the submission  | After rejection           |

---

## Complete Document Example

```javascript
{
  // Submission Identification
  "assignmentId": "Pyg6LKFRCSfBUtyCgUq9",
  "studentId": "rwge5A4UV1dhHHtGu0ITKZ6hpn92",
  "studentEmail": "nelson@edueron.com",
  "studentName": "Nelson",

  // Assignment Context
  "assignmentTopic": "Assignment Check - 2",
  "classId": DocumentReference("classes/4CpjRnOA8W3ognI5eskQ"),
  "subjectId": DocumentReference("subjects/BcIuHVs1BwgFoiJhy0kz"),
  "schoolId": DocumentReference("school/hicas_cbe"),

  // File Information
  "submissionUrl": "https://firebasestorage.googleapis.com/v0/b/edueron-a0ce0.appspot.com/o/submissions%2FPyg6LKFRCSfBUtyCgUq9%2Frwge5A4UV1dhHHtGu0ITKZ6hpn92_1642598400000_homework.pdf?alt=media",
  "originalFileName": "homework.pdf",
  "fileSize": 2048576,

  // Submission Metadata
  "submittedAt": Timestamp("2024-01-25T14:30:00Z"),
  "status": "graded",

  // Grading Information
  "grade": 85,
  "feedback": "Good work! Please improve formatting in future submissions.",
  "gradedAt": Timestamp("2024-01-26T10:15:00Z"),
  "gradedBy": "5KK3TnpijKO2t33vnHtBO5o65dA3"
}
```

---

## Grading Workflow & Field Changes

### 1. Initial Submission

When a student submits an assignment:

**Fields Set:**

- `assignmentId`, `studentId`, `studentEmail`, `studentName`
- `assignmentTopic`, `classId`, `subjectId`, `schoolId`
- `submissionUrl`, `originalFileName`, `fileSize`
- `submittedAt`: Current timestamp
- `status`: `"submitted"`

**Fields NULL:**

- `grade`: `null`
- `feedback`: `null`
- `gradedAt`: `null`
- `gradedBy`: `null`

### 2. Teacher Approves (Grades)

When teacher approves with a grade:

**Fields Updated:**

- `grade`: Set to numerical value (0-100)
- `feedback`: Set to teacher's comments (optional)
- `gradedAt`: Current timestamp
- `gradedBy`: Teacher's UID
- `status`: Changed to `"graded"`

### 3. Teacher Rejects

When teacher rejects the submission:

**Fields Updated:**

- `grade`: Set to `0` or kept as `null`
- `feedback`: Set to rejection reason
- `gradedAt`: Current timestamp
- `gradedBy`: Teacher's UID
- `status`: Changed to `"rejected"`

---

## Student App Queries

### 1. Get Student's Submissions

```javascript
// Get all submissions by a specific student
const studentSubmissionsQuery = query(
  collection(db, "assignment_submitted"),
  where("studentId", "==", currentStudentId),
  orderBy("submittedAt", "desc")
);
```

### 2. Get Submissions for a Specific Assignment

```javascript
// Check if student has submitted a specific assignment
const submissionQuery = query(
  collection(db, "assignment_submitted"),
  where("assignmentId", "==", assignmentId),
  where("studentId", "==", currentStudentId)
);
```

### 3. Get Graded Submissions

```javascript
// Get only graded submissions for a student
const gradedSubmissionsQuery = query(
  collection(db, "assignment_submitted"),
  where("studentId", "==", currentStudentId),
  where("status", "==", "graded"),
  orderBy("gradedAt", "desc")
);
```

---

## Security Rules Considerations

Students should only be able to:

- ✅ Read their own submissions
- ✅ Create new submissions
- ✅ Update their submissions (if resubmission is allowed)
- ❌ Modify grading fields (`grade`, `feedback`, `gradedAt`, `gradedBy`, `status`)

Teachers/Admins can:

- ✅ Read all submissions
- ✅ Update grading fields only

---

## File Storage Structure

### Firebase Storage Path

```
submissions/
├── {assignmentId}/
│   ├── {studentId}_{timestamp}_{originalFileName}
│   └── ...
```

### Example Path

```
submissions/Pyg6LKFRCSfBUtyCgUq9/rwge5A4UV1dhHHtGu0ITKZ6hpn92_1642598400000_homework.pdf
```

---

## Real-time Updates

For real-time grade notifications in the student app:

```javascript
// Listen for changes to student's submissions
const unsubscribe = onSnapshot(
  query(
    collection(db, "assignment_submitted"),
    where("studentId", "==", currentStudentId)
  ),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "modified") {
        const data = change.doc.data();
        if (data.status === "graded" && data.grade !== null) {
          // Show grade notification
          showGradeNotification(data);
        }
      }
    });
  }
);
```

---

## Important Notes for Student App

1. **Student Identification**: Students can exist in both `students` and `users` collections. Use email as the unique identifier.

2. **File Downloads**: Use the `submissionUrl` for downloading submitted files.

3. **Status Tracking**: Always check the `status` field to determine current state.

4. **Grade Display**: Only show grades when `status === "graded"` and `grade !== null`.

5. **Feedback**: Display feedback when available, regardless of grade value.

6. **Timestamps**: Convert Firestore Timestamps to JavaScript Dates for display.

7. **Offline Support**: Consider caching submission status for offline viewing.

This structure provides complete traceability of the assignment submission and grading process while maintaining data integrity and proper access control.
