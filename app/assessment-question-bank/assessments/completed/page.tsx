'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';

interface Student {
  id: string;
  name: string;
  email: string;
  className: string;
  avatar?: string;
}

interface Assessment {
  id: string;
  title: string;
  subject: string;
  totalMarks: number;
  dueDate: Timestamp;
  students: {
    studentId: string;
    score: number;
    submittedAt: Timestamp;
    status: 'completed' | 'pending' | 'missed';
  }[];
}

// Mock data for subjects and students
const MOCK_SUBJECTS = [
  { id: 'math', name: 'Mathematics' },
  { id: 'science', name: 'Science' },
  { id: 'english', name: 'English' },
  { id: 'history', name: 'History' },
];

const MOCK_STUDENTS: Student[] = [
  { id: 'STU001', name: 'John Doe', email: 'john@example.com', className: '10A' },
  { id: 'STU002', name: 'Jane Smith', email: 'jane@example.com', className: '10A' },
  { id: 'STU003', name: 'Alex Johnson', email: 'alex@example.com', className: '10B' },
  { id: 'STU004', name: 'Sarah Williams', email: 'sarah@example.com', className: '10B' },
];

const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: 'ASSESS1',
    title: 'Algebra Basics',
    subject: 'math',
    totalMarks: 100,
    dueDate: Timestamp.fromDate(new Date('2025-09-15')),
    students: [
      { studentId: 'STU001', score: 85, submittedAt: Timestamp.fromDate(new Date('2025-09-14')), status: 'completed' },
      { studentId: 'STU002', score: 92, submittedAt: Timestamp.fromDate(new Date('2025-09-14')), status: 'completed' },
      { studentId: 'STU003', score: 0, submittedAt: Timestamp.fromDate(new Date()), status: 'pending' },
    ]
  },
  {
    id: 'ASSESS2',
    title: 'Physics Fundamentals',
    subject: 'science',
    totalMarks: 100,
    dueDate: Timestamp.fromDate(new Date('2025-09-20')),
    students: [
      { studentId: 'STU001', score: 78, submittedAt: Timestamp.fromDate(new Date('2025-09-19')), status: 'completed' },
      { studentId: 'STU004', score: 95, submittedAt: Timestamp.fromDate(new Date('2025-09-19')), status: 'completed' },
    ]
  },
  {
    id: 'ASSESS3',
    title: 'Literature Analysis',
    subject: 'english',
    totalMarks: 100,
    dueDate: Timestamp.fromDate(new Date('2025-09-25')),
    students: [
      { studentId: 'STU002', score: 88, submittedAt: Timestamp.fromDate(new Date('2025-09-24')), status: 'completed' },
      { studentId: 'STU003', score: 0, submittedAt: Timestamp.fromDate(new Date()), status: 'pending' },
    ]
  },
];

export default function CompletedAssessments() {
  const [subjects, setSubjects] = useState<{id: string, name: string, completed: number, total: number}[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      try {
        // Calculate completion stats for each subject
        const subjectStats = MOCK_SUBJECTS.map(subject => {
          const subjectAssessments = MOCK_ASSESSMENTS.filter(a => a.subject === subject.id);
          const totalStudents = MOCK_STUDENTS.length * subjectAssessments.length;
          const completedStudents = subjectAssessments.reduce(
            (sum, a) => sum + a.students.filter(s => s.status === 'completed').length, 0
          );
          
          return {
            id: subject.id,
            name: subject.name,
            completed: completedStudents,
            total: totalStudents
          };
        });

        setSubjects(subjectStats);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId === selectedSubject ? null : subjectId);
    setSelectedAssessment(null);
    setSelectedStudent(null);
  };

  const handleAssessmentSelect = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setSelectedStudent(null);
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
  };

  const getStudentById = (id: string) => MOCK_STUDENTS.find(s => s.id === id);

  const getStudentScore = (studentId: string, assessment: Assessment) => {
    const submission = assessment.students.find(s => s.studentId === studentId);
    if (!submission) return { score: 0, status: 'Not Submitted' };
    return {
      score: submission.score,
      status: submission.status === 'completed' ? 'Completed' : 'Pending',
      percentage: Math.round((submission.score / assessment.totalMarks) * 100)
    };
  };

  const getImprovementSuggestions = (studentId: string, subjectId: string) => {
    // This is a mock implementation
    const assessments = MOCK_ASSESSMENTS
      .filter(a => a.subject === subjectId)
      .map(a => ({
        title: a.title,
        ...getStudentScore(studentId, a)
      }));

    const avgScore = assessments.reduce((sum, a) => sum + (a.percentage || 0), 0) / assessments.length;
    
    if (avgScore >= 80) {
      return "Excellent performance! Keep up the good work and consider challenging yourself with advanced topics.";
    } else if (avgScore >= 60) {
      return "Good work! Focus on practicing more problems to improve your understanding.";
    } else {
      return "Needs improvement. Please review the basic concepts and seek help from your teacher.";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Subject Assessments</h1>
            <button 
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm md:text-base"
            >
              ← Back
            </button>
          </div>
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading assessments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Subject Assessments</h1>
            <p className="text-gray-600 mt-1">View and manage completed assessments by subject</p>
          </div>
          <button 
            onClick={() => router.back()}
            className="mt-4 md:mt-0 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm md:text-base flex items-center space-x-2 self-start md:self-auto"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subjects List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Subjects</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {subjects.map((subject) => (
                  <div key={subject.id} className="p-4 hover:bg-gray-50">
                    <button
                      onClick={() => handleSubjectSelect(subject.id)}
                      className="w-full text-left focus:outline-none"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-900">{subject.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {subject.completed}/{subject.total} completed
                          </span>
                          <svg
                            className={`h-5 w-5 text-gray-400 transform transition-transform ${
                              selectedSubject === subject.id ? 'rotate-180' : ''
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Assessments for this subject */}
                    {selectedSubject === subject.id && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-200">
                        {MOCK_ASSESSMENTS
                          .filter(a => a.subject === subject.id)
                          .map(assessment => (
                            <div 
                              key={assessment.id} 
                              className={`p-2 mt-1 rounded cursor-pointer ${
                                selectedAssessment?.id === assessment.id 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'hover:bg-gray-100'
                              }`}
                              onClick={() => handleAssessmentSelect(assessment)}
                            >
                              <div className="text-sm font-medium">{assessment.title}</div>
                              <div className="text-xs text-gray-500">
                                {assessment.students.filter(s => s.status === 'completed').length} / {MOCK_STUDENTS.length} completed
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student List or Assessment Details */}
          <div className="lg:col-span-2">
            {selectedAssessment ? (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedAssessment.title}</h2>
                      <p className="text-sm text-gray-500">
                        {MOCK_SUBJECTS.find(s => s.id === selectedAssessment.subject)?.name} • {selectedAssessment.totalMarks} points
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedAssessment(null)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {selectedStudent ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{selectedStudent.name}</h3>
                        <p className="text-sm text-gray-500">{selectedStudent.className} • {selectedStudent.email}</p>
                      </div>
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        ← Back to list
                      </button>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                      <h4 className="font-medium text-blue-800 mb-2">Assessment Score</h4>
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${getStudentScore(selectedStudent.id, selectedAssessment).percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-2xl font-bold text-blue-800">
                          {getStudentScore(selectedStudent.id, selectedAssessment).score} / {selectedAssessment.totalMarks}
                          <span className="text-lg text-gray-600 ml-1">
                            ({getStudentScore(selectedStudent.id, selectedAssessment).percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Performance Analysis</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-700">
                          {getImprovementSuggestions(selectedStudent.id, selectedAssessment.subject)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Submission Details</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className="text-sm font-medium">
                            {getStudentScore(selectedStudent.id, selectedAssessment).status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Submitted On:</span>
                          <span className="text-sm font-medium">
                            {selectedAssessment.students.find(s => s.studentId === selectedStudent.id)?.submittedAt?.toDate().toLocaleDateString() || 'Not submitted'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Due Date:</span>
                          <span className="text-sm font-medium">
                            {selectedAssessment.dueDate.toDate().toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    <div className="p-4 bg-gray-50 flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        {selectedAssessment.students.length} students
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedAssessment.students.filter(s => s.status === 'completed').length} completed • {selectedAssessment.students.length - selectedAssessment.students.filter(s => s.status === 'completed').length} remaining
                      </div>
                    </div>
                    
                    {MOCK_STUDENTS.map(student => {
                      const scoreInfo = getStudentScore(student.id, selectedAssessment);
                      return (
                        <div 
                          key={student.id} 
                          className="p-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleStudentSelect(student)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                {student.name.charAt(0)}
                              </div>
                              <div className="ml-3">
                                <h4 className="text-sm font-medium text-gray-900">{student.name}</h4>
                                <p className="text-sm text-gray-500">{student.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${
                                (scoreInfo.percentage ?? 0) >= 80 ? 'text-green-600' :
                                (scoreInfo.percentage ?? 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {scoreInfo.status === 'Completed' ? `${scoreInfo.score}${scoreInfo.percentage !== undefined ? ` (${scoreInfo.percentage}%)` : ''}` : scoreInfo.status}
                              </div>
                              <div className="text-xs text-gray-500">
                                {scoreInfo.status === 'Completed' ? 'Submitted' : 'Not submitted'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow p-8 text-center h-full flex items-center justify-center">
                <div>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No assessment selected</h3>
                  <p className="mt-1 text-gray-500">
                    Select a subject and assessment to view student submissions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
