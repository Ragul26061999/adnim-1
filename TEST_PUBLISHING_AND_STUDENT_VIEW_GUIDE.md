# Test Publishing and Student View Guide

## Overview

This guide explains what happens when the publish button is clicked in a test card and how to properly list tests for students in the student web app, including both selective and whole class test assignments.

---

## 1. What Happens When Publish Button is Clicked

### 1.1 Database Update Process

When you click the **Publish** button in a test card, the following database changes occur:

```typescript
const handlePublish = async (id: string) => {
  setActionLoading(id);
  try {
    await updateDoc(doc(db, "test", id), { online: true });
    setTests((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "published", online: true } : t
      )
    );
  } catch (err) {
    alert("Failed to publish test.");
  } finally {
    setActionLoading(null);
  }
};
```

### 1.2 Database Changes

**Before Publishing:**

```javascript
{
  id: "test_id",
  name: "Test Name",
  classId: DocumentReference,
  start: Timestamp,
  end: Timestamp,
  online: false,           // ← Draft status
  status: "drafted",       // ← Draft status
  questions: [DocumentReference],
  totalQuestions: 50,
  wholeClass: boolean,
  userID: [DocumentReference], // For selective students
  schoolID: DocumentReference,
  createdAt: Timestamp,
  createdBy: DocumentReference
}
```

**After Publishing:**

```javascript
{
  id: "test_id",
  name: "Test Name",
  classId: DocumentReference,
  start: Timestamp,
  end: Timestamp,
  online: true,            // ← Now published
  status: "published",     // ← Status changed
  questions: [DocumentReference],
  totalQuestions: 50,
  wholeClass: boolean,
  userID: [DocumentReference], // For selective students
  schoolID: DocumentReference,
  createdAt: Timestamp,
  createdBy: DocumentReference
}
```

### 1.3 Test Status Logic

```typescript
const getTestStatus = (test: any) => {
  const now = new Date();
  const startTime = test.start?.toDate();
  const endTime = test.end?.toDate();

  if (!test.online) return "draft";
  if (endTime && endTime < now) return "finished";
  if (startTime && startTime <= now && endTime && endTime > now)
    return "ongoing";
  if (startTime && startTime > now) return "upcoming";
  return "published";
};
```

---

## 2. Student Test View Implementation

### 2.1 Basic Test Query for Students

```typescript
// Get current student's details and available tests
const getStudentTests = async (studentId: string) => {
  try {
    // 1. Get student's class ID
    const studentDoc = await getDoc(doc(db, "students", studentId));
    const studentData = studentDoc.data();
    const classId = studentData.classId; // DocumentReference to class

    // 2. Query published tests for this class
    const testsQuery = query(
      collection(db, "test"),
      where("classId", "==", classId),
      where("online", "==", true), // Only published tests
      where("end", ">=", new Date()) // Only tests that haven't ended
    );

    const testsSnapshot = await getDocs(testsQuery);
    const availableTests = testsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return availableTests;
  } catch (error) {
    console.error("Error fetching tests:", error);
    return [];
  }
};
```

### 2.2 Handling Selective vs Whole Class Tests

```typescript
const getStudentSpecificTests = async (studentId: string) => {
  try {
    const studentDoc = await getDoc(doc(db, "students", studentId));
    const studentData = studentDoc.data();
    const classId = studentData.classId;

    // Query tests for this class
    const testsQuery = query(
      collection(db, "test"),
      where("classId", "==", classId),
      where("online", "==", true)
    );

    const testsSnapshot = await getDocs(testsQuery);
    const allTests = testsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter based on test assignment type
    const availableTests = allTests.filter((test) => {
      if (test.wholeClass) {
        // Whole class test - available to all students in class
        return true;
      } else {
        // Selective test - check if student is in userID array
        const studentRef = doc(db, "students", studentId);
        return (
          test.userID &&
          test.userID.some((ref: any) => ref.path === studentRef.path)
        );
      }
    });

    return availableTests;
  } catch (error) {
    console.error("Error fetching student tests:", error);
    return [];
  }
};
```

### 2.3 Enhanced Test Query with Status and Timing

```typescript
const getStudentTestsWithDetails = async (studentId: string) => {
  try {
    const studentDoc = await getDoc(doc(db, "students", studentId));
    const studentData = studentDoc.data();
    const classId = studentData.classId;

    // Query all published tests for the class
    const testsQuery = query(
      collection(db, "test"),
      where("classId", "==", classId),
      where("online", "==", true)
    );

    const testsSnapshot = await getDocs(testsQuery);
    const allTests = testsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const now = new Date();
    const studentRef = doc(db, "students", studentId);

    // Filter and categorize tests
    const availableTests = allTests
      .filter((test) => {
        // Check if student should see this test
        if (test.wholeClass) {
          return true; // Available to whole class
        } else {
          // Check if student is in selective list
          return (
            test.userID &&
            test.userID.some((ref: any) => ref.path === studentRef.path)
          );
        }
      })
      .map((test) => {
        const startTime = test.start?.toDate();
        const endTime = test.end?.toDate();

        // Determine test status
        let status = "published";
        if (endTime && endTime < now) status = "finished";
        else if (startTime && startTime <= now && endTime && endTime > now)
          status = "ongoing";
        else if (startTime && startTime > now) status = "upcoming";

        return {
          ...test,
          status,
          canTake: status === "ongoing" || status === "upcoming",
          timeRemaining: endTime
            ? Math.max(0, endTime.getTime() - now.getTime())
            : 0,
        };
      });

    return availableTests;
  } catch (error) {
    console.error("Error fetching student tests:", error);
    return [];
  }
};
```

---

## 3. Student Dashboard Implementation

### 3.1 Complete Student Dashboard Component

```typescript
import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface Test {
  id: string;
  name: string;
  start: any;
  end: any;
  status: string;
  questions: any[];
  totalQuestions: number;
  wholeClass: boolean;
  canTake: boolean;
  timeRemaining: number;
}

const StudentTestDashboard = () => {
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [filter, setFilter] = useState<
    "all" | "ongoing" | "upcoming" | "finished"
  >("all");

  useEffect(() => {
    const fetchStudentTests = async () => {
      // Get current user (student)
      const user = auth.currentUser;
      if (!user) return;

      // Get student details
      const studentQuery = query(
        collection(db, "students"),
        where("userId", "==", user.uid),
        where("isActive", "==", true)
      );

      const studentSnapshot = await getDocs(studentQuery);
      const studentData = studentSnapshot.docs[0]?.data();

      if (studentData) {
        setCurrentStudent(studentData);
        const tests = await getStudentTestsWithDetails(
          studentSnapshot.docs[0].id
        );
        setAvailableTests(tests);
      }

      setLoading(false);
    };

    fetchStudentTests();
  }, []);

  const filteredTests = availableTests.filter((test) => {
    if (filter === "all") return true;
    return test.status === filter;
  });

  const startTest = (testId: string) => {
    // Navigate to test taking interface
    window.location.href = `/student/test/${testId}`;
  };

  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-green-100 text-green-700";
      case "upcoming":
        return "bg-blue-100 text-blue-700";
      case "finished":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Tests</h1>

        {/* Filter Controls */}
        <div className="mb-6">
          <div className="flex gap-2">
            {["all", "ongoing", "upcoming", "finished"].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType as any)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === filterType
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300"
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <div key={test.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {test.name}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      test.status
                    )}`}
                  >
                    {test.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>Start: {test.start?.toDate().toLocaleString()}</p>
                  <p>End: {test.end?.toDate().toLocaleString()}</p>
                  <p>Questions: {test.questions?.length || 0}</p>
                  {test.status === "ongoing" && (
                    <p className="text-red-600 font-medium">
                      Time remaining: {formatTimeRemaining(test.timeRemaining)}
                    </p>
                  )}
                  <p className="text-blue-600">
                    {test.wholeClass ? "Whole Class Test" : "Selective Test"}
                  </p>
                </div>

                <button
                  onClick={() => startTest(test.id)}
                  disabled={!test.canTake}
                  className={`w-full py-2 px-4 rounded-lg font-medium ${
                    test.canTake
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {test.canTake ? "Start Test" : "Test Unavailable"}
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tests available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTestDashboard;
```

---

## 4. Database Indexes for Efficient Queries

The following Firebase indexes support efficient test queries:

```json
{
  "collectionGroup": "test",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "classId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "online",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "end",
      "order": "ASCENDING"
    }
  ]
}
```

Additional indexes for selective tests:

```json
{
  "collectionGroup": "test",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "classId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "online",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "wholeClass",
      "order": "ASCENDING"
    }
  ]
}
```

---

## 5. Test Assignment Types

### 5.1 Whole Class Tests

**Database Structure:**

```javascript
{
  wholeClass: true,
  userID: null, // Not used for whole class tests
  classId: DocumentReference, // All students in this class can access
}
```

**Query Logic:**

```typescript
if (test.wholeClass) {
  return true; // Available to all students in class
}
```

### 5.2 Selective Tests

**Database Structure:**

```javascript
{
  wholeClass: false,
  userID: [DocumentReference, DocumentReference, ...], // Array of student references
  classId: DocumentReference,
}
```

**Query Logic:**

```typescript
if (!test.wholeClass) {
  const studentRef = doc(db, "students", studentId);
  return (
    test.userID && test.userID.some((ref: any) => ref.path === studentRef.path)
  );
}
```

---

## 6. Key Implementation Points

### 6.1 Security Considerations

1. **Always verify student belongs to the class** before showing tests
2. **Check `isActive` status** of students
3. **Validate test timing** (start/end times)
4. **Use proper authentication** before allowing test access

### 6.2 Performance Optimizations

1. **Use Firebase indexes** for efficient queries
2. **Cache student data** to avoid repeated queries
3. **Implement pagination** for large test lists
4. **Use real-time listeners** for live updates

### 6.3 Error Handling

```typescript
const handleTestFetchError = (error: any) => {
  console.error("Error fetching tests:", error);

  if (error.code === "permission-denied") {
    // Handle authentication issues
    return { error: "Authentication required" };
  }

  if (error.code === "unavailable") {
    // Handle network issues
    return { error: "Network error. Please try again." };
  }

  return { error: "Failed to load tests. Please refresh the page." };
};
```

---

## 7. Testing the Implementation

### 7.1 Test Cases

1. **Whole Class Test:**

   - Create test with `wholeClass: true`
   - Verify all students in class can see it
   - Verify students from other classes cannot see it

2. **Selective Test:**

   - Create test with `wholeClass: false` and specific `userID` array
   - Verify only selected students can see it
   - Verify unselected students cannot see it

3. **Timing Tests:**
   - Test with future start time (should show as "upcoming")
   - Test with current time (should show as "ongoing")
   - Test with past end time (should show as "finished")

### 7.2 Debug Queries

```typescript
// Debug: Check what tests a student can see
const debugStudentTests = async (studentId: string) => {
  const studentDoc = await getDoc(doc(db, "students", studentId));
  const studentData = studentDoc.data();

  console.log("Student data:", studentData);
  console.log("Student class ID:", studentData.classId.path);

  const testsQuery = query(
    collection(db, "test"),
    where("classId", "==", studentData.classId),
    where("online", "==", true)
  );

  const testsSnapshot = await getDocs(testsQuery);
  console.log(
    "All tests for class:",
    testsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  );
};
```

---

## 8. Summary

### 8.1 Publish Button Flow

1. **Click Publish** → Update `online: true` in database
2. **Status Change** → `status: "published"`
3. **Student Visibility** → Tests become available to students
4. **Real-time Update** → UI updates immediately

### 8.2 Student Test View Flow

1. **Authentication** → Verify student is logged in
2. **Get Student Data** → Fetch student's class and details
3. **Query Tests** → Get published tests for student's class
4. **Filter by Assignment** → Handle whole class vs selective
5. **Apply Timing** → Filter by start/end times
6. **Display Results** → Show available tests with status

### 8.3 Key Database Fields

| Field        | Purpose           | Example                                         |
| ------------ | ----------------- | ----------------------------------------------- |
| `online`     | Published status  | `true` for published tests                      |
| `wholeClass` | Assignment type   | `true` for whole class, `false` for selective   |
| `userID`     | Selected students | Array of DocumentReferences for selective tests |
| `classId`    | Target class      | DocumentReference to class                      |
| `start/end`  | Test timing       | Timestamp objects                               |
| `status`     | Test status       | "drafted", "published", "ongoing", "finished"   |

This implementation ensures that students only see tests they're supposed to take, with proper timing and assignment type handling.
