import { doc, addDoc, collection, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "./firebaseClient";
import { createStudentWithRelationships } from "./userManagement";

/**
 * Creates proper student and parent records for Nelson
 * This function can be called from the application to fix Nelson's missing records
 */
export async function createNelsonRecords() {
  try {
    console.log("🚀 Creating Nelson's proper records...");

    // Check if Nelson already has a student record
    const existingStudentsQuery = await getDoc(doc(db, "students", "nelson-placeholder"));
    
    const studentData = {
      email: "nelson@edueron.com",
      name: "Nelson",
      rollNumber: "104",
      classId: doc(db, "classes", "4CpjRnOA8W3ognI5eskQ"), // Class 12
      dateOfBirth: new Date("2007-01-15"),
      phone: "+91 9876543230",
      address: "Nelson's Address, Coimbatore, Tamil Nadu",
      admissionDate: new Date("2024-06-01"),
      schoolId: doc(db, "school", "hicas_cbe"),
      isActive: true,
      createdBy: doc(db, "users", "5KK3TnpijKO2t33vnHtBO5o65dA3") // Default admin user
    };

    const parentData = {
      email: "nelson.parent@email.com",
      name: "Nelson's Parent",
      phone: "+91 9876543231",
      occupation: "Software Engineer",
      address: "Nelson's Family Address, Coimbatore, Tamil Nadu",
      schoolId: doc(db, "school", "hicas_cbe"),
      hasLoginAccess: true,
      isActive: true,
      createdBy: doc(db, "users", "5KK3TnpijKO2t33vnHtBO5o65dA3")
    };

    // Use the DOB as password (DDMMYYYY format)
    const studentPassword = "15012007"; // 15-01-2007
    const parentPassword = "password";

    console.log("📝 Creating student and parent records with relationships...");

    // Use the robust function to create both records with proper relationships
    const result = await createStudentWithRelationships(
      studentData,
      parentData,
      studentPassword,
      parentPassword,
      true // Create parent login
    );

    console.log("✅ Successfully created Nelson's records:");
    console.log(`- Student ID: ${result.studentId}`);
    console.log(`- Parent ID: ${result.parentId}`);

    // Update the existing user record to link to the new student record
    const userDoc = doc(db, "users", "rwge5A4UV1dhHHtGu0ITKZ6hpn92");
    await updateDoc(userDoc, {
      linkedStudentId: result.studentId,
      updatedAt: serverTimestamp()
    });

    console.log("🔗 Updated user record to link to student record");

    return {
      success: true,
      studentId: result.studentId,
      parentId: result.parentId,
      message: "Nelson's records created successfully!"
    };

  } catch (error: any) {
    console.error("❌ Error creating Nelson's records:", error);
    return {
      success: false,
      error: error.message || "Failed to create Nelson's records",
      message: "Failed to create Nelson's records. Please try again."
    };
  }
}

/**
 * Creates a manual student record (alternative method)
 * This bypasses the full relationship creation for testing
 */
export async function createManualNelsonStudentRecord() {
  try {
    console.log("📝 Creating manual student record for Nelson...");

    // First create parent record
    const parentData = {
      email: "nelson.parent@email.com",
      name: "Nelson's Parent",
      phone: "+91 9876543231",
      occupation: "Software Engineer",
      address: "Nelson's Family Address, Coimbatore, Tamil Nadu",
      schoolId: doc(db, "school", "hicas_cbe"),
      children: [], // Will be updated after creating student
      hasLoginAccess: true,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: doc(db, "users", "5KK3TnpijKO2t33vnHtBO5o65dA3")
    };

    const parentDocRef = await addDoc(collection(db, "parents"), parentData);
    console.log("✅ Created parent record:", parentDocRef.id);

    // Create student record
    const studentData = {
      userId: "rwge5A4UV1dhHHtGu0ITKZ6hpn92", // Nelson's existing user ID
      email: "nelson@edueron.com",
      name: "Nelson",
      rollNumber: "104",
      classId: doc(db, "classes", "4CpjRnOA8W3ognI5eskQ"), // Class 12
      dateOfBirth: new Date("2007-01-15"),
      phone: "+91 9876543230",
      address: "Nelson's Address, Coimbatore, Tamil Nadu",
      admissionDate: new Date("2024-06-01"),
      schoolId: doc(db, "school", "hicas_cbe"),
      parentId: parentDocRef,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: doc(db, "users", "5KK3TnpijKO2t33vnHtBO5o65dA3")
    };

    const studentDocRef = await addDoc(collection(db, "students"), studentData);
    console.log("✅ Created student record:", studentDocRef.id);

    // Update parent's children array
    await updateDoc(parentDocRef, {
      children: [studentDocRef],
      updatedAt: serverTimestamp()
    });

    console.log("🔗 Updated parent-child relationships");

    return {
      success: true,
      studentId: studentDocRef.id,
      parentId: parentDocRef.id,
      message: "Nelson's manual records created successfully!"
    };

  } catch (error: any) {
    console.error("❌ Error creating manual Nelson records:", error);
    return {
      success: false,
      error: error.message || "Failed to create manual Nelson records",
      message: "Failed to create manual records. Please try again."
    };
  }
}

// Export both functions
export default {
  createNelsonRecords,
  createManualNelsonStudentRecord
}; 