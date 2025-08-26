import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "./firebaseClient";

// Types
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: "student" | "parent" | "teacher" | "admin";
  schoolId: any;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface StudentData {
  userId: string;
  email: string;
  name: string;
  rollNumber: string;
  classId: any;
  dateOfBirth: Date;
  phone?: string;
  address?: string;
  admissionDate?: Date;
  schoolId: any;
  parentId: any;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: any;
}

export interface ParentData {
  userId?: string;
  email: string;
  name: string;
  phone: string;
  occupation?: string;
  address?: string;
  schoolId: any;
  children: any[];
  hasLoginAccess: boolean;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: any;
}

// Email validation and uniqueness check
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const userQuery = query(
      collection(db, "users"),
      where("email", "==", email.toLowerCase().trim())
    );
    const snapshot = await getDocs(userQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking email:", error);
    throw new Error("Failed to check email availability");
  }
}

// Create Firebase Auth user
export async function createFirebaseUser(email: string, password: string, displayName: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("Email is already registered");
    }
    console.error("Error creating Firebase user:", error);
    throw new Error("Failed to create user account");
  }
}

// Create user document in Firestore
export async function createUserDocument(userData: UserData): Promise<string> {
  try {
    await setDoc(doc(db, "users", userData.uid), {
      ...userData,
      email: userData.email.toLowerCase().trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return userData.uid;
  } catch (error) {
    console.error("Error creating user document:", error);
    throw new Error("Failed to create user record");
  }
}

// Create student with proper relationships
export async function createStudentWithRelationships(
  studentData: Omit<StudentData, 'userId' | 'parentId'>,
  parentData: Omit<ParentData, 'children'>,
  studentPassword: string,
  parentPassword: string = "password",
  createParentLogin: boolean = true
): Promise<{ studentId: string; parentId: string }> {
  try {
    console.log("📝 Starting student creation process...");
    console.log("📧 Checking if email exists:", studentData.email);
    
    // Check if email already exists
    const emailExists = await checkEmailExists(studentData.email);
    if (emailExists) {
      throw new Error(`Email ${studentData.email} is already registered`);
    }
    console.log("✅ Student email is available");

    // Check if parent email already exists
    const parentEmailExists = await checkEmailExists(parentData.email);
    if (parentEmailExists && createParentLogin) {
      throw new Error(`Parent email ${parentData.email} is already registered`);
    }

    // Create student Firebase Auth user
    console.log("🔑 Creating Firebase Auth user for student...");
    const studentUser = await createFirebaseUser(studentData.email, studentPassword, studentData.name);
    console.log("✅ Student Firebase user created:", studentUser.uid);

    // Create student user document
    const studentUserData: UserData = {
      uid: studentUser.uid,
      email: studentData.email,
      displayName: studentData.name,
      role: "student",
      schoolId: studentData.schoolId,
      isActive: true
    };
    await createUserDocument(studentUserData);

    // Check if parent already exists in parents collection
    let parentId: string;
    const existingParentQuery = query(
      collection(db, "parents"),
      where("email", "==", parentData.email.toLowerCase().trim())
    );
    const existingParentSnapshot = await getDocs(existingParentQuery);

    if (!existingParentSnapshot.empty) {
      // Parent exists, use existing parent
      parentId = existingParentSnapshot.docs[0].id;
    } else {
      // Create new parent
      let parentUserId: string | undefined;

      if (createParentLogin) {
        // Create parent Firebase Auth user
        const parentUser = await createFirebaseUser(parentData.email, parentPassword, parentData.name);
        
        // Create parent user document
        const parentUserData: UserData = {
          uid: parentUser.uid,
          email: parentData.email,
          displayName: parentData.name,
          role: "parent",
          schoolId: parentData.schoolId,
          isActive: true
        };
        await createUserDocument(parentUserData);
        parentUserId = parentUser.uid;
      }

      // Create parent document
      const parentDocData: ParentData = {
        ...parentData,
        userId: parentUserId,
        email: parentData.email.toLowerCase().trim(),
        children: [], // Will be updated after creating student
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const parentDocRef = await addDoc(collection(db, "parents"), parentDocData);
      parentId = parentDocRef.id;
    }

    // Create student document
    const fullStudentData: StudentData = {
      ...studentData,
      userId: studentUser.uid,
      email: studentData.email.toLowerCase().trim(),
      parentId: doc(db, "parents", parentId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log("📄 Creating student document with data:", fullStudentData);
    const studentDocRef = await addDoc(collection(db, "students"), fullStudentData);
    const studentId = studentDocRef.id;
    console.log("✅ Student document created with ID:", studentId);

    // Update parent's children array
    const parentDoc = doc(db, "parents", parentId);
    const parentSnapshot = await getDocs(query(collection(db, "parents"), where("__name__", "==", parentId)));
    
    if (!parentSnapshot.empty) {
      const currentParentData = parentSnapshot.docs[0].data();
      const updatedChildren = [...(currentParentData.children || []), studentDocRef];
      
      await updateDoc(parentDoc, {
        children: updatedChildren,
        updatedAt: serverTimestamp()
      });
    }

    return { studentId, parentId };

  } catch (error) {
    console.error("Error creating student with relationships:", error);
    throw error;
  }
}

// Update student information
export async function updateStudent(
  studentId: string,
  updates: Partial<StudentData>
): Promise<void> {
  try {
    const studentDoc = doc(db, "students", studentId);
    await updateDoc(studentDoc, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating student:", error);
    throw new Error("Failed to update student information");
  }
}

// Get students for a specific school and class
export async function getStudentsByClass(schoolId: string, classId: string) {
  try {
    const studentsQuery = query(
      collection(db, "students"),
      where("schoolId", "==", doc(db, "school", schoolId)),
      where("classId", "==", doc(db, "classes", classId)),
      where("isActive", "==", true)
    );
    
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching students by class:", error);
    throw new Error("Failed to fetch students");
  }
}

// Get all students for a school
export async function getStudentsBySchool(schoolId: string) {
  try {
    const studentsQuery = query(
      collection(db, "students"),
      where("schoolId", "==", doc(db, "school", schoolId)),
      where("isActive", "==", true)
    );
    
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching students by school:", error);
    throw new Error("Failed to fetch students");
  }
}

// Get parent's children
export async function getParentChildren(parentId: string) {
  try {
    const studentsQuery = query(
      collection(db, "students"),
      where("parentId", "==", doc(db, "parents", parentId)),
      where("isActive", "==", true)
    );
    
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching parent's children:", error);
    throw new Error("Failed to fetch children information");
  }
}

// Format date of birth for password
export function formatDateOfBirth(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

// Generate parent password (can be customized)
export function generateParentPassword(): string {
  return "password"; // In production, generate a secure password
}

export default {
  checkEmailExists,
  createFirebaseUser,
  createUserDocument,
  createStudentWithRelationships,
  updateStudent,
  getStudentsByClass,
  getStudentsBySchool,
  getParentChildren,
  formatDateOfBirth,
  generateParentPassword
}; 