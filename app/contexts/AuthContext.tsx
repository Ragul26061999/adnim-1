"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebaseClient";

interface AuthContextType {
  user: User | null;
  schoolId: string | null;
  userRole: string | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (user: User) => {
    try {
      // Check if user is a teacher
      const teacherDoc = await getDoc(doc(db, "teachers", user.uid));
      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data();
        setSchoolId(teacherData.schoolId?.id || null);
        setUserRole("teacher");
        return;
      }

      // Check if user is a school admin
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.schoolId) {
          setSchoolId(userData.schoolId.id);
          setUserRole("admin");
        } else {
          setUserRole("user");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setSchoolId(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, schoolId, userRole, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 