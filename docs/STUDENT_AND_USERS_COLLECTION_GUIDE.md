# Student & Users Collection Guide for Student Web App Team

## Overview

This guide explains the structure and usage of the `students` and `users` collections in Firestore for student management, including how to fetch and filter data for class-based content and display in the student web app.

---

## 1. `users` Collection (for Student Role)

### Purpose

- Stores authentication and basic profile info for all users (students, teachers, parents, admins).
- Each user is created via Firebase Authentication and has a unique `uid`.

### Typical Student User Document Structure

```json
{
  "uid": "firebase_auth_uid",         // Unique Firebase Auth ID
  "email": "student@email.com",       // Student's email (unique)
  "displayName": "Student Name",      // Student's full name
  "role": "student",                  // User role
  "schoolId": <DocumentReference>,    // Reference to the school document
  "isActive": true,                   // Is the user active?
  "createdAt": <Timestamp>,
  "updatedAt": <Timestamp>
}
```

### How to Use

- **Authentication:** Use this collection to authenticate and identify the logged-in user.
- **Role Check:** Filter by `role: "student"` to get only student users.
- **Basic Info:** Use `displayName`, `email`, and `uid` for display and lookups.

---

## 2. `students` Collection

### Purpose

- Stores all extended student-specific details and relationships.
- Each document represents a student and links to their user, class, parent, and school.

### Typical Student Document Structure

```json
{
  "id": "auto_generated_id",          // Firestore document ID
  "userId": "firebase_auth_uid",      // Reference to the user's uid in `users`
  "email": "student@email.com",       // Student's email (should match user)
  "name": "Student Name",             // Student's full name
  "rollNumber": "STU001",             // Roll number (unique per school)
  "classId": <DocumentReference>,     // Reference to the class document
  "dateOfBirth": <Timestamp>,
  "phone": "+91 9876543210",
  "address": "Complete Address",
  "admissionDate": <Timestamp>,
  "schoolId": <DocumentReference>,    // Reference to the school document
  "parentId": <DocumentReference>,    // Reference to the parent document
  "isActive": true,
  "createdAt": <Timestamp>,
  "updatedAt": <Timestamp>,
  "createdBy": <DocumentReference>
}
```

### How to Use

- **Student Profile:** Fetch all details for the logged-in student using their `userId` (which matches their Auth `uid`).
- **Class Filtering:** Filter students by `classId` to get all students in a specific class.
- **School Filtering:** Filter by `schoolId` for school-wide queries.
- **Parent/Guardian Info:** Use `parentId` to fetch parent details if needed.

---

## 3. How to Fetch Data in the Student Web App

### 3.1 Get Current Student’s Details

```js
// Assume you have the logged-in user's uid (from Firebase Auth)
const uid = firebase.auth().currentUser.uid;

// Query the students collection for this user
const studentQuery = query(
  collection(db, "students"),
  where("userId", "==", uid),
  where("isActive", "==", true)
);
const studentSnapshot = await getDocs(studentQuery);
const studentData = studentSnapshot.docs[0]?.data();
```

### 3.2 Get All Students in a Class

```js
const classId = "your_class_doc_id";
const classRef = doc(db, "classes", classId);

const classStudentsQuery = query(
  collection(db, "students"),
  where("classId", "==", classRef),
  where("isActive", "==", true)
);
const classStudentsSnapshot = await getDocs(classStudentsQuery);
const studentsInClass = classStudentsSnapshot.docs.map((doc) => doc.data());
```

### 3.3 Get Student’s Display Name, Email, etc.

- Use the `students` document for `name`, `rollNumber`, `classId`, etc.
- Use the `users` document for `displayName`, `email`, and authentication.

### 3.4 Filtering Content by Class

- When displaying assignments, notes, or other class-based content, use the student’s `classId` to filter relevant documents in other collections (e.g., `assignments`, `notes`, etc.).

---

## 4. Best Practices

- **Always use `userId` to link between `users` and `students`.**
- **Use `classId` (DocumentReference) for all class-based queries and filtering.**
- **For display, prefer `name` from `students` and `displayName` from `users` (they should match, but `students` is the source of truth for school records).**
- **Check `isActive` to filter out inactive students.**
- **For parent info, use the `parentId` reference in the student document.**

---

## 5. Summary Table

| Collection | Key Field(s)     | Purpose                         | Example Usage                         |
| ---------- | ---------------- | ------------------------------- | ------------------------------------- |
| users      | uid, email, role | Auth & basic info               | Login, role check, displayName        |
| students   | userId, classId  | Student details & relationships | Profile, class filtering, parent info |

---

## 6. Sample Query for Student App

```js
// Get logged-in student's full profile and class
const uid = firebase.auth().currentUser.uid;
const studentQuery = query(
  collection(db, "students"),
  where("userId", "==", uid),
  where("isActive", "==", true)
);
const studentSnapshot = await getDocs(studentQuery);
const student = studentSnapshot.docs[0]?.data();

if (student) {
  // Fetch class details
  const classDoc = await getDoc(student.classId);
  const classData = classDoc.data();

  // Fetch parent details
  const parentDoc = await getDoc(student.parentId);
  const parentData = parentDoc.data();

  // Now you have all info for display and filtering!
}
```

---

**If your team follows this structure, you’ll be able to fetch, filter, and display all student and class-based content efficiently and reliably. If you need a code sample for a specific use case, just ask!**
