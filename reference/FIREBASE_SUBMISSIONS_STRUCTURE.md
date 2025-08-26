# Firebase Assignment Submissions Structure

## Overview

This document describes the Firebase Firestore collections and document structure for managing assignment submissions in the student portal.

## Collections Structure

### 1. `assignment_submitted` Collection

This is the main collection where all student assignment submissions are stored.

#### Document Structure

```javascript
{
  // Submission Identification
  assignmentId: "string",           // Reference to the assignment ID
  studentId: "string",              // Student's UID from Firebase Auth
  studentEmail: "string",           // Student's email address
  studentName: "string",            // Student's display name

  // Assignment Details (for quick reference)
  assignmentTopic: "string",        // Topic/title of the assignment
  classId: DocumentReference,       // Reference to classes collection
  subjectId: DocumentReference,     // Reference to subjects collection
  schoolId: DocumentReference,      // Reference to school collection

  // File Information
  submissionUrl: "string",          // Firebase Storage download URL
  originalFileName: "string",       // Original name of uploaded file
  fileSize: number,                 // File size in bytes

  // Submission Metadata
  submittedAt: Timestamp,           // When the submission was made
  status: "submitted",              // Current status (submitted, graded, returned)

  // Grading Information (initially null)
  grade: number | null,             // Numerical grade (e.g., 85, 92)
  feedback: string | null,          // Teacher's feedback/comments
  gradedAt: Timestamp | null,       // When it was graded
  gradedBy: string | null           // Teacher/admin UID who graded it
}
```

#### Example Document

```javascript
{
  assignmentId: "assignment_123",
  studentId: "student_uid_456",
  studentEmail: "john.doe@school.edu",
  studentName: "John Doe",
  assignmentTopic: "Math Problem Set 1",
  classId: DocumentReference("classes/class_789"),
  subjectId: DocumentReference("subjects/math_101"),
  schoolId: DocumentReference("school/school_001"),
  submissionUrl: "https://firebasestorage.googleapis.com/v0/b/project.../submissions%2Fassignment_123%2Fstudent_uid_456_1642598400000_homework.pdf",
  originalFileName: "homework.pdf",
  fileSize: 2048576,
  submittedAt: Timestamp(2024, 0, 25, 14, 30, 0),
  status: "submitted",
  grade: null,
  feedback: null,
  gradedAt: null,
  gradedBy: null
}
```

## Firebase Storage Structure

### File Organization

```
submissions/
├── {assignmentId}/
│   ├── {studentId}_{timestamp}_{originalFileName}
│   ├── {studentId}_{timestamp}_{originalFileName}
│   └── ...
└── ...
```

#### Example Storage Path

```
submissions/assignment_123/student_uid_456_1642598400000_homework.pdf
```

## Admin Access Queries

### 1. Get All Submissions for a Specific Assignment

```javascript
// Get all submissions for assignment_123
const submissionsQuery = query(
  collection(db, "assignment_submitted"),
  where("assignmentId", "==", "assignment_123"),
  orderBy("submittedAt", "desc")
);
```

### 2. Get All Submissions by a Specific Student

```javascript
// Get all submissions by student_uid_456
const studentSubmissionsQuery = query(
  collection(db, "assignment_submitted"),
  where("studentId", "==", "student_uid_456"),
  orderBy("submittedAt", "desc")
);
```

### 3. Get All Submissions for a Class

```javascript
// Get all submissions for a specific class
const classSubmissionsQuery = query(
  collection(db, "assignment_submitted"),
  where("classId", "==", classRef),
  orderBy("submittedAt", "desc")
);
```

### 4. Get All Ungraded Submissions

```javascript
// Get submissions that need grading
const ungradedSubmissionsQuery = query(
  collection(db, "assignment_submitted"),
  where("status", "==", "submitted"),
  where("grade", "==", null),
  orderBy("submittedAt", "asc")
);
```

### 5. Get Submissions by Subject

```javascript
// Get all submissions for a specific subject
const subjectSubmissionsQuery = query(
  collection(db, "assignment_submitted"),
  where("subjectId", "==", subjectRef),
  orderBy("submittedAt", "desc")
);
```

## Admin Operations

### 1. Grade a Submission

```javascript
const gradeSubmission = async (submissionId, grade, feedback, teacherUid) => {
  const submissionRef = doc(db, "assignment_submitted", submissionId);
  await updateDoc(submissionRef, {
    grade: grade,
    feedback: feedback,
    gradedAt: Timestamp.now(),
    gradedBy: teacherUid,
    status: "graded",
  });
};
```

### 2. Download Submission File

```javascript
const downloadSubmission = (submissionUrl, originalFileName) => {
  // Create a temporary anchor element to trigger download
  const link = document.createElement("a");
  link.href = submissionUrl;
  link.download = originalFileName;
  link.click();
};
```

### 3. Get Submission Statistics

```javascript
const getSubmissionStats = async (assignmentId) => {
  const submissionsQuery = query(
    collection(db, "assignment_submitted"),
    where("assignmentId", "==", assignmentId)
  );

  const snapshot = await getDocs(submissionsQuery);
  const submissions = snapshot.docs.map((doc) => doc.data());

  return {
    totalSubmissions: submissions.length,
    gradedSubmissions: submissions.filter((s) => s.grade !== null).length,
    averageGrade:
      submissions
        .filter((s) => s.grade !== null)
        .reduce((sum, s) => sum + s.grade, 0) /
        submissions.filter((s) => s.grade !== null).length || 0,
  };
};
```

## Security Rules

### Recommended Firestore Security Rules for `assignment_submitted` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Assignment submissions collection rules
    match /assignment_submitted/{submissionId} {
      // Students can only read/write their own submissions
      allow read, write: if request.auth != null &&
        (request.auth.uid == resource.data.studentId ||
         hasAdminRole(request.auth.uid));

      // Teachers/Admins can read all submissions and update grades
      allow read, update: if request.auth != null &&
        hasTeacherRole(request.auth.uid);
    }

    // Helper function to check admin role
    function hasAdminRole(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role == 'admin';
    }

    // Helper function to check teacher role
    function hasTeacherRole(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role in ['teacher', 'admin'];
    }
  }
}
```

## Firebase Storage Security Rules

### Recommended Storage Security Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Submissions folder
    match /submissions/{assignmentId}/{fileName} {
      // Students can upload to their own submission folder
      allow write: if request.auth != null &&
        fileName.matches('.*' + request.auth.uid + '.*');

      // Students can read their own submissions
      // Teachers/Admins can read all submissions
      allow read: if request.auth != null &&
        (fileName.matches('.*' + request.auth.uid + '.*') ||
         hasTeacherRole());
    }
  }
}
```

## Admin Dashboard Integration

### Sample Admin Dashboard Queries for React

```javascript
// Component for viewing assignment submissions
const AssignmentSubmissions = ({ assignmentId }) => {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const submissionsQuery = query(
        collection(db, "assignment_submitted"),
        where("assignmentId", "==", assignmentId),
        orderBy("submittedAt", "desc")
      );

      const snapshot = await getDocs(submissionsQuery);
      const submissionData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          // Dereference class, subject for display
          const classDoc = await getDoc(data.classId);
          const subjectDoc = await getDoc(data.subjectId);

          return {
            id: doc.id,
            ...data,
            className: classDoc.data()?.name,
            subjectName: subjectDoc.data()?.name,
          };
        })
      );

      setSubmissions(submissionData);
    };

    fetchSubmissions();
  }, [assignmentId]);

  return (
    <div>
      {submissions.map((submission) => (
        <div key={submission.id}>
          <h3>{submission.studentName}</h3>
          <p>
            Submitted: {submission.submittedAt.toDate().toLocaleDateString()}
          </p>
          <button
            onClick={() => window.open(submission.submissionUrl, "_blank")}
          >
            Download: {submission.originalFileName}
          </button>
          {/* Add grading interface here */}
        </div>
      ))}
    </div>
  );
};
```

## Notes

1. **File Storage**: All submission files are stored in Firebase Storage under the `submissions/` folder with organized subfolders by assignment ID.

2. **Unique Filenames**: Files are renamed with timestamp and student ID to prevent conflicts and maintain organization.

3. **Metadata Tracking**: Complete submission metadata is stored in Firestore for easy querying and management.

4. **Grading Support**: The structure supports grading workflow with fields for grade, feedback, and grading metadata.

5. **Admin Access**: Admins can query submissions by assignment, student, class, subject, or grading status.

6. **Real-time Updates**: The structure supports real-time updates when submissions are graded or status changes.

This structure provides a complete foundation for managing assignment submissions with proper admin oversight and student access control.
