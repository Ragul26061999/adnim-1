import { doc, addDoc, collection } from "firebase/firestore";
import { db } from "./firebaseClient";

/**
 * Simple test function to create a student document directly
 * This helps us isolate if the issue is with the complex relationship logic
 */
export async function createTestStudent() {
  try {
    console.log("🧪 Creating test student document...");
    
    const testStudentData = {
      email: "test.student@example.com",
      name: "Test Student",
      rollNumber: "TEST001",
      classId: doc(db, "classes", "4CpjRnOA8W3ognI5eskQ"), // Class 12
      phone: "+91 9999999999",
      address: "Test Address",
      schoolId: doc(db, "school", "hicas_cbe"),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("📄 Test student data:", testStudentData);
    
    const studentDocRef = await addDoc(collection(db, "students"), testStudentData);
    console.log("✅ Test student created with ID:", studentDocRef.id);
    
    return {
      success: true,
      studentId: studentDocRef.id,
      message: "Test student created successfully!"
    };
    
  } catch (error: any) {
    console.error("❌ Error creating test student:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to create test student"
    };
  }
}

/**
 * Function to call from browser console for testing
 */
declare global {
  interface Window {
    createTestStudent: typeof createTestStudent;
  }
}

// Make function available in browser console
if (typeof window !== 'undefined') {
  window.createTestStudent = createTestStudent;
}

export default createTestStudent; 