'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, collection, query, where, getDocs, DocumentReference } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface AttendanceRecord {
  id: number;
  studentName: string;
  class: string;
  status: string;
  date: string;
}

interface StudentPerformance {
  id: string;
  name: string;
  class: string;
  avatar: string;
}

interface StudentDoc {
  name: string;
  avatar?: string;
  classId?: DocumentReference;
}

interface TeachingLesson {
  id: number;
  time: string;
  subject: string;
  type: string;
  students: number;
  duration: string;
  status: string;
}

interface UpcomingEvent {
  id: number;
  time: string;
  subject: string;
  description: string;
  duration: string;
}

export default function AttendanceDashboard() {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [studentsPerformance, setStudentsPerformance] = useState<StudentPerformance[]>([]);
  const [teachingLessons, setTeachingLessons] = useState<TeachingLesson[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [totalClasses, setTotalClasses] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalTeachers, setTotalTeachers] = useState<number>(0);
  const [activeMenuItem, setActiveMenuItem] = useState('manage-school');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calendar helper functions
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleMenuClick = (menuItem: string) => {
    setActiveMenuItem(menuItem);
    // Add navigation logic here
    console.log(`Navigating to: ${menuItem}`);
  };

  const handleLogout = () => {
    // Add logout logic here
    console.log('Logging out...');
    // Example: redirect to login page
    // router.push('/login');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const userSchoolId = userData?.schoolId;
          setSchoolId(userSchoolId);

              if (userSchoolId) {
            // Fetch total classes
            const classesQuery = query(collection(db, 'classes'), where('schoolId', '==', userSchoolId));
            const classesSnapshot = await getDocs(classesQuery);
            setTotalClasses(classesSnapshot.size);

            // Fetch total students
            const studentsQuery = query(collection(db, 'students'), where('schoolId', '==', userSchoolId));
            const studentsSnapshot = await getDocs(studentsQuery);
            setTotalStudents(studentsSnapshot.size);

            // Fetch total teachers
            const teachersQuery = query(collection(db, 'teachers'), where('schoolId', '==', userSchoolId));
            const teachersSnapshot = await getDocs(teachersQuery);
            setTotalTeachers(teachersSnapshot.size);
          }
        }
      } else {
        setSchoolId(null);
        setTotalClasses(0);
        setTotalStudents(0);
        setTotalTeachers(0);
      }
      setLoading(false);
    });

    // Simulate other data fetching (if any, keep for now or remove if not needed)
    const fetchData = async () => {
      setAttendanceData([
        { id: 1, studentName: 'John Doe', class: '10A', status: 'Present', date: '2025-01-13' },
        { id: 2, studentName: 'Jane Smith', class: '10A', status: 'Absent', date: '2025-01-13' },
        { id: 3, studentName: 'Mike Johnson', class: '10B', status: 'Present', date: '2025-01-13' },
      ]);



      setTeachingLessons([
        { id: 1, time: '10:30 AM', subject: 'Mathematics', type: 'High fidelity wireframes', students: 2, duration: '60 min', status: 'Reminder' },
        { id: 2, time: '11:30 AM', subject: 'Physics', type: 'High fidelity wireframes', students: 2, duration: '45 min', status: 'Reminder' },
        { id: 3, time: '1:00 PM', subject: 'Chemistry', type: 'High fidelity wireframes', students: 2, duration: '60 min', status: 'Reminder' },
        { id: 4, time: '2:30 PM', subject: 'Biology', type: 'High fidelity wireframes', students: 2, duration: '45 min', status: 'Reminder' },
      ]);

      setUpcomingEvents([
        { id: 1, time: '9:00 am', subject: 'Biology', description: 'Prepare Questions for final test', duration: '09:00-10:00 am' },
        { id: 2, time: '11:00 am', subject: 'Chemistry', description: 'Prepare Questions for final test', duration: '09:00-10:00 am' },
        { id: 3, time: '1:00 pm', subject: 'Physics', description: 'Prepare Questions for final test', duration: '09:00-10:00 am' },
      ]);
    };

    fetchData();

    return () => unsubscribe();
  }, [schoolId]);

  useEffect(() => {
    const fetchStudentsPerformance = async () => {
      if (schoolId) {
        const studentsPerformanceQuery = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const studentsPerformanceSnapshot = await getDocs(studentsPerformanceQuery);
        const fetchedStudentsPerformance: StudentPerformance[] = await Promise.all(
          studentsPerformanceSnapshot.docs.map(async (doc) => {
            const studentData = {
              id: doc.id,
              name: (doc.data() as StudentDoc).name,
              class: 'N/A', // Default to N/A, will be updated if class is found
              avatar: (doc.data() as StudentDoc).avatar || '👨‍🎓',
            };

            // Fetch class name using classId reference
            const classId = (doc.data() as StudentDoc).classId;
            if (classId) {
              const classDoc = await getDoc(classId);
              if (classDoc.exists()) {
                studentData.class = classDoc.data().name || 'N/A';
              }
            }
            return studentData;
          })
        );
        setStudentsPerformance(fetchedStudentsPerformance);
      }
    };

    fetchStudentsPerformance();
  }, [schoolId]);

  // Update current date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Sidebar - Material 3 Navigation Rail */}
      <div className="fixed left-0 top-0 h-full w-72 bg-white/80 backdrop-blur-xl shadow-2xl shadow-purple-500/10 flex flex-col border-r border-purple-100/50">
        {/* Logo Section */}
        <div className="mt-8 ml-8 mb-8">
          <div className="flex items-center space-x-3">
            <img
              src="/assets/images/classa logo.png"
              alt="CLASSA Logo"
              className="w-40 h-auto object-contain"
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-4">
          <nav className="space-y-3 px-6">
            {/* Dashboard */}
            <div
              onClick={() => handleMenuClick('dashboard')}
              className={`flex items-center space-x-4 px-6 py-4 rounded-3xl cursor-pointer transition-all duration-300 ${activeMenuItem === 'dashboard'
                ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-lg shadow-purple-200/50 scale-105'
                : 'text-gray-700 hover:bg-gray-100/70 hover:scale-102'
                }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-1">
                  <div className="w-2 h-2 bg-current rounded-lg"></div>
                  <div className="w-2 h-2 bg-current rounded-lg"></div>
                  <div className="w-2 h-2 bg-current rounded-lg"></div>
                  <div className="w-2 h-2 bg-current rounded-lg"></div>
                </div>
              </div>
              <span className="font-semibold text-base">Dashboard</span>
            </div>

            {/* Manage School Content - Active */}
            <div
              onClick={() => handleMenuClick('manage-school')}
              className={`flex items-center space-x-4 px-6 py-4 rounded-3xl cursor-pointer transition-all duration-300 ${activeMenuItem === 'manage-school'
                ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-lg shadow-purple-200/50 scale-105'
                : 'text-gray-700 hover:bg-gray-100/70 hover:scale-102'
                }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-.979 0-1.92.13-2.828.388A1 1 0 003 5.38v9.245a1 1 0 00.707.957A9.966 9.966 0 015.5 16c.979 0 1.920-.13 2.828-.388A1 1 0 009 14.62V4.804zM17 5.38a1 1 0 00-.328-.992A9.966 9.966 0 0014.5 4c-.979 0-1.92.13-2.828.388A1 1 0 0011 5.38v9.245a1 1 0 00.293.707A9.966 9.966 0 0114.5 16c.979 0 1.920-.13 2.828-.388A1 1 0 0017 14.62V5.38z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-base">Manage School</div>
                <div className="text-sm opacity-80">Content</div>
              </div>
            </div>

            {/* Edueron Content */}
            <div
              onClick={() => handleMenuClick('edueron-content')}
              className={`flex items-center space-x-4 px-6 py-4 rounded-3xl cursor-pointer transition-all duration-300 ${activeMenuItem === 'edueron-content'
                ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-lg shadow-purple-200/50 scale-105'
                : 'text-gray-700 hover:bg-gray-100/70 hover:scale-102'
                }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <span className="font-semibold text-base">Edueron Content</span>
            </div>

            {/* Help Center */}
            <div
              onClick={() => handleMenuClick('help-center')}
              className={`flex items-center space-x-4 px-6 py-4 rounded-3xl cursor-pointer transition-all duration-300 ${activeMenuItem === 'help-center'
                ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-lg shadow-purple-200/50 scale-105'
                : 'text-gray-700 hover:bg-gray-100/70 hover:scale-102'
                }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-semibold text-base">Help Center</span>
            </div>
          </nav>
        </div>

        {/* User Profile / Log Out */}
        <div className="p-6 border-t border-purple-100/50">
          <div
            onClick={handleLogout}
            className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-102"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <span className="font-semibold text-base">Log Out</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-72 p-8">
        {/* Header */}
        {/* <div className="flex justify-between items-start mb-10"> */}
        {/* <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Greetings, Karla!
            </h1>
            <p className="text-gray-600 text-lg font-medium">7 May 2023</p>
          </div> */}
        {/* <div className="flex items-center space-x-4"> */}
        {/* <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/50 hover:scale-110 transition-transform duration-300 cursor-pointer">
              <span className="text-white text-xl">🔔</span>
            </div> */}
        {/* <div className="flex items-center space-x-3 bg-white/70 backdrop-blur-sm rounded-2xl p-3 shadow-lg shadow-blue-200/30">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg"></div>
              <div>
                <p className="text-base font-bold text-gray-900">John Karla</p>
                <p className="text-sm text-gray-600">john.karla@gmail.com</p>
              </div>
            </div> */}
        {/* </div> */}
        {/* </div> */}

        <div className="grid grid-cols-12 gap-6 mt-20">
          {/* Left Column */}
          <div className="col-span-8 space-y-6">
            {/* Stats Cards - Material 3 */}
            <div className="grid grid-cols-3 gap-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-pink-200/30 border border-pink-100/50 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-200/40">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-200/50">
                    <span className="text-white text-2xl">📚</span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">⋯</button>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2">{totalClasses}</div>
                <div className="text-base font-semibold text-gray-600">Total Classes</div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-purple-200/30 border border-purple-100/50 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200/40">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200/50">
                    <span className="text-white text-2xl">👥</span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">⋯</button>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-2">{totalStudents}</div>
                <div className="text-base font-semibold text-gray-600">Total Students</div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-blue-200/30 border border-blue-100/50 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/40">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200/50">
                    <span className="text-white text-2xl">�‍🏫</span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">⋯</button>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">{totalTeachers}</div>
                <div className="text-base font-semibold text-gray-600">Total Teachers</div>
              </div>
            </div>

            {/* Students Performance and Attendance Report */}
            <div className="grid grid-cols-2 gap-8">
              {/* Students Performance */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-purple-200/20 border border-purple-100/30">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Students </h3>
                </div>
                <div className="space-y-5">
                  {studentsPerformance.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-purple-50/50 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-lg shadow-lg">
                          {student.avatar}
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-900">{student.name}</p>
                          <p className="text-sm font-medium text-gray-600">{student.class}</p>
                        </div>
                      </div>
                      {/* Removed attendance and performance spans as per instruction */}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Attendance Report */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-blue-200/20 border border-blue-100/30">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Total attendance report</h3>
                  <select className="text-sm font-semibold text-gray-600 border-none bg-gray-100/70 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div className="h-56 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl flex items-center justify-center mb-6 border border-blue-100/50">
                      <div className="text-center">
                        <span className="text-4xl mb-2 block">📈</span>
                        <span className="text-blue-600 font-semibold">Chart Visualization</span>
                      </div>
                    </div>
                    <p className="text-base font-semibold text-gray-600">Attendance trend visualization</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Teaching Lessons */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-indigo-200/20 border border-indigo-100/30">
              <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8">Teaching Lessons</h3>
              <div className="space-y-6">
                {teachingLessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50/80 to-indigo-50/50 rounded-3xl border border-indigo-100/30 hover:shadow-lg hover:scale-102 transition-all duration-300">
                    <div className="flex items-center space-x-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl">📚</span>
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900">Start from</p>
                        <p className="text-sm font-semibold text-gray-600">Today, {lesson.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div>
                        <p className="text-base font-bold text-gray-900">{lesson.type}</p>
                        <div className="flex items-center space-x-6 text-sm font-medium text-gray-600 mt-2">
                          <span className="flex items-center space-x-1">
                            <span>👥</span>
                            <span>{lesson.students} lessons</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>⏰</span>
                            <span>{lesson.duration}</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-900 mb-2">{lesson.subject}</p>
                        <span className="inline-block px-4 py-2 text-sm font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-2xl border border-purple-200/50">
                          {lesson.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-4 space-y-8">
            {/* Calendar */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-purple-200/20 border border-purple-100/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {getMonthName(currentDate)}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="w-8 h-8 flex items-center justify-center rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="w-8 h-8 flex items-center justify-center rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-gray-600 mb-4">
                <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-sm font-medium">
                {/* Empty cells for days before the first day of the month */}
                {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                  <div key={`empty-${i}`} className="h-10"></div>
                ))}

                {/* Days of the month */}
                {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
                  const day = i + 1;
                  return (
                    <div
                      key={day}
                      className={`h-10 flex items-center justify-center rounded-2xl cursor-pointer transition-all duration-200 ${isToday(day)
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-300/50 scale-110 font-bold'
                          : 'text-gray-700 hover:bg-purple-100 hover:scale-105'
                        }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              {/* Today's date indicator */}
              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-gray-600">
                  Today: {currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-green-200/20 border border-green-100/30">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Upcoming Events</h3>
                <button className="text-sm font-semibold text-purple-600 hover:text-purple-700 bg-purple-100/70 px-4 py-2 rounded-2xl hover:bg-purple-200/70 transition-colors">Add Notes</button>
              </div>
              <div className="text-base font-bold text-gray-700 mb-6">10 Jan</div>
              <div className="space-y-6">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-green-50/50 transition-colors duration-200">
                    <div className="w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mt-3 shadow-lg"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-bold text-gray-900">{event.time}</span>
                        <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">⋯</button>
                      </div>
                      <p className="text-base font-bold text-purple-600 mb-2">{event.subject}</p>
                      <p className="text-sm font-medium text-gray-600 mb-1">{event.description}</p>
                      <p className="text-sm font-medium text-gray-500">{event.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My Notes */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-yellow-200/20 border border-yellow-100/30">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">My Notes</h3>
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg">5</span>
                  <button className="text-sm font-semibold text-purple-600 hover:text-purple-700 bg-purple-100/70 px-4 py-2 rounded-2xl hover:bg-purple-200/70 transition-colors">Add Notes</button>
                </div>
              </div>
              <div className="space-y-5">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-yellow-50/50 transition-colors duration-200">
                    <div className={`w-4 h-4 rounded-2xl mt-2 shadow-lg ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-400' :
                      i === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-400' :
                        i === 2 ? 'bg-gradient-to-br from-green-400 to-emerald-400' :
                          'bg-gradient-to-br from-purple-400 to-pink-400'
                      }`}></div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-900 mb-1">Prepare Questions for final test</p>
                      <p className="text-sm font-medium text-gray-600">Prepare Questions for final test from the students</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">⋯</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}