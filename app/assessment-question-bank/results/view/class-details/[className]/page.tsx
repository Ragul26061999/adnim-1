'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, DocumentData, DocumentReference } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { useAuthState } from 'react-firebase-hooks/auth';
import Sidebar from "@/app/assessment-question-bank/components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, BookOpen, Award, ArrowLeft, Calendar, Target, Trophy, User, Clock } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface StudentPerformance {
  studentId: string;
  studentName: string;
  testsTaken: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  testResults: Array<{
    testId: string;
    testName: string;
    score: number;
    dateTaken: string;
    passed: boolean;
  }>;
}

interface TestInfo {
  testId: string;
  testName: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  dateTaken: string;
}

interface ClassDetailData {
  className: string;
  totalStudents: number;
  totalTests: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  students: StudentPerformance[];
  tests: TestInfo[];
}

export default function ClassDetailsPage() {
  const [user] = useAuthState(auth);
  const [classData, setClassData] = useState<ClassDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const className = decodeURIComponent(params.className as string);

  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const testsQuery = query(collection(db, 'test'), where('createdBy', '==', userRef));
        const testsSnapshot = await getDocs(testsQuery);

        if (testsSnapshot.empty) {
          setClassData(null);
          setLoading(false);
          return;
        }

        // Filter tests for this specific class
        const classTests = [];
        const testsMap = new Map();
        
        for (const testDoc of testsSnapshot.docs) {
          const testData = testDoc.data();
          if (testData.classId) {
            const classDoc = await getDoc(testData.classId);
            const testClassName = classDoc.exists() ? (classDoc.data() as any)?.name || 'Unknown Class' : 'Unknown Class';
            
            if (testClassName === className) {
              const testInfo = { 
                id: testDoc.id, 
                ...testData, 
                className: testClassName,
                name: testData.name || 'Unnamed Test',
                createdAt: testData.createdAt || new Date().toISOString()
              };
              classTests.push(testInfo);
              testsMap.set(testDoc.id, testInfo);
            }
          }
        }

        if (classTests.length === 0) {
          setClassData(null);
          setLoading(false);
          return;
        }

        const testIds = classTests.map(test => test.id);
        
        // Fetch all test results for this class
        const allResults: DocumentData[] = [];
        for (let i = 0; i < testIds.length; i += 30) {
          const batchIds = testIds.slice(i, i + 30);
          const resultsQuery = query(collection(db, 'testResults'), where('testId', 'in', batchIds));
          const resultsSnapshot = await getDocs(resultsQuery);
          resultsSnapshot.forEach(doc => allResults.push(doc.data()));
        }

        // Process student performance data
        const studentMap = new Map<string, StudentPerformance>();
        const testStatsMap = new Map<string, { scores: number[], attempts: number }>();

        for (const result of allResults) {
          const testData = testsMap.get(result.testId);
          if (!testData) continue;

          const studentId = result.studentId;
          const score = result.percentageScore || 0;
          const passed = score >= 35;

          // Initialize student data
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              studentId,
              studentName: result.studentName || `Student ${studentId.substring(0, 8)}`,
              testsTaken: 0,
              averageScore: 0,
              highestScore: 0,
              lowestScore: 100,
              passRate: 0,
              testResults: []
            });
          }

          const student = studentMap.get(studentId)!;
          student.testsTaken++;
          student.highestScore = Math.max(student.highestScore, score);
          student.lowestScore = Math.min(student.lowestScore, score);
          student.testResults.push({
            testId: result.testId,
            testName: (testData as any).name || 'Unnamed Test',
            score,
            dateTaken: result.createdAt || 'Unknown',
            passed
          });

          // Initialize test stats
          if (!testStatsMap.has(result.testId)) {
            testStatsMap.set(result.testId, { scores: [], attempts: 0 });
          }
          const testStats = testStatsMap.get(result.testId)!;
          testStats.scores.push(score);
          testStats.attempts++;
        }

        // Calculate student averages and pass rates
        const students = Array.from(studentMap.values()).map(student => {
          const totalScore = student.testResults.reduce((sum, test) => sum + test.score, 0);
          const passedTests = student.testResults.filter(test => test.passed).length;
          
          return {
            ...student,
            averageScore: student.testsTaken > 0 ? Math.round(totalScore / student.testsTaken) : 0,
            passRate: student.testsTaken > 0 ? Math.round((passedTests / student.testsTaken) * 100) : 0,
            lowestScore: student.lowestScore === 100 ? 0 : student.lowestScore
          };
        });

        // Calculate test statistics
        const tests = classTests.map(test => {
          const stats = testStatsMap.get(test.id);
          if (!stats || stats.scores.length === 0) {
            return {
              testId: test.id,
              testName: (test as any).name || 'Unnamed Test',
              totalAttempts: 0,
              averageScore: 0,
              passRate: 0,
              dateTaken: (test as any).createdAt || 'Unknown'
            };
          }

          const totalScore = stats.scores.reduce((sum, score) => sum + score, 0);
          const passedCount = stats.scores.filter(score => score >= 35).length;

          return {
            testId: test.id,
            testName: (test as any).name || 'Unnamed Test',
            totalAttempts: stats.attempts,
            averageScore: Math.round(totalScore / stats.scores.length),
            passRate: Math.round((passedCount / stats.scores.length) * 100),
            dateTaken: (test as any).createdAt || 'Unknown'
          };
        });

        // Calculate overall class statistics
        const allScores = allResults.map(r => r.percentageScore || 0);
        const totalScore = allScores.reduce((sum, score) => sum + score, 0);
        const passedCount = allScores.filter(score => score >= 35).length;

        const classDetailData: ClassDetailData = {
          className,
          totalStudents: students.length,
          totalTests: classTests.length,
          averageScore: allScores.length > 0 ? Math.round(totalScore / allScores.length) : 0,
          passRate: allScores.length > 0 ? Math.round((passedCount / allScores.length) * 100) : 0,
          highestScore: allScores.length > 0 ? Math.max(...allScores) : 0,
          lowestScore: allScores.length > 0 ? Math.min(...allScores) : 0,
          students: students.sort((a, b) => b.averageScore - a.averageScore),
          tests: tests.sort((a, b) => b.averageScore - a.averageScore)
        };

        setClassData(classDetailData);
      } catch (error) {
        console.error('Error fetching class details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetails();
  }, [user, className]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 text-lg font-medium">Loading class details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="text-center bg-white rounded-xl shadow-sm p-12 max-w-md">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No data available for this class</p>
            <button 
              onClick={() => router.back()}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const performanceDistribution = [
    { name: 'Excellent', value: classData.students.filter(s => s.averageScore >= 80).length, color: '#22c55e' },
    { name: 'Good', value: classData.students.filter(s => s.averageScore >= 60 && s.averageScore < 80).length, color: '#06b6d4' },
    { name: 'At-Risk', value: classData.students.filter(s => s.averageScore < 60).length, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const chartData = classData.tests.map(test => ({
    name: test.testName.length > 15 ? test.testName.substring(0, 15) + '...' : test.testName,
    averageScore: test.averageScore,
    passRate: test.passRate,
    attempts: test.totalAttempts
  }));

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Overview
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{classData.className} - Detailed Report</h1>
            <p className="text-gray-600">Comprehensive analysis of class performance and student progress</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl shadow-blue-500/40 hover:shadow-3xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-blue-100 text-sm font-medium">Class Average</p>
                  <TrendingUp className="h-5 w-5 text-blue-200" />
                </div>
                <p className="text-3xl font-bold">{classData.averageScore}%</p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            <div className="bg-green-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl shadow-green-500/40 hover:shadow-3xl hover:shadow-green-500/50 transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-100 text-sm font-medium">Total Students</p>
                  <Users className="h-5 w-5 text-green-200" />
                </div>
                <p className="text-3xl font-bold">{classData.totalStudents}</p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            <div className="bg-purple-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl shadow-purple-500/40 hover:shadow-3xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-purple-100 text-sm font-medium">Tests Conducted</p>
                  <BookOpen className="h-5 w-5 text-purple-200" />
                </div>
                <p className="text-3xl font-bold">{classData.totalTests}</p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            <div className="bg-orange-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl shadow-orange-500/40 hover:shadow-3xl hover:shadow-orange-500/50 transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-orange-100 text-sm font-medium">Pass Rate</p>
                  <Award className="h-5 w-5 text-orange-200" />
                </div>
                <p className="text-3xl font-bold">{classData.passRate}%</p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Test Performance Chart */}
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100/50">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Test Performance Overview</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="averageScore" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={25} />
                  <Bar dataKey="passRate" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Student Performance Distribution */}
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100/50">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Student Performance Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={performanceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {performanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {performanceDistribution.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Students Performance Table */}
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100/50 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Student Performance Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Student</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">Tests Taken</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">Average Score</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">Highest Score</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">Pass Rate</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {classData.students.map((student, index) => (
                    <tr key={student.studentId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{student.studentName}</p>
                            <p className="text-sm text-gray-500">ID: {student.studentId.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4 font-medium text-gray-900">{student.testsTaken}</td>
                      <td className="text-center py-4 px-4">
                        <span className={`font-bold ${student.averageScore >= 80 ? 'text-green-600' : student.averageScore >= 60 ? 'text-blue-600' : 'text-red-600'}`}>
                          {student.averageScore}%
                        </span>
                      </td>
                      <td className="text-center py-4 px-4 font-medium text-green-600">{student.highestScore}%</td>
                      <td className="text-center py-4 px-4 font-medium text-gray-900">{student.passRate}%</td>
                      <td className="text-center py-4 px-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${student.averageScore >= 80 ? 'bg-green-500' : student.averageScore >= 60 ? 'bg-blue-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(student.averageScore, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tests Overview */}
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100/50">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Tests Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classData.tests.map((test, index) => (
                <div key={test.testId} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${test.averageScore >= 80 ? 'bg-green-100 text-green-700' : test.averageScore >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      {test.averageScore >= 80 ? 'Excellent' : test.averageScore >= 60 ? 'Good' : 'At-Risk'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{test.testName}</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Attempts:</span>
                      <span className="font-medium">{test.totalAttempts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Score:</span>
                      <span className="font-medium">{test.averageScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pass Rate:</span>
                      <span className="font-medium">{test.passRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
