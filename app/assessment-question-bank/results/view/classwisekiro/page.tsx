'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, DocumentData, DocumentReference } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { useAuthState } from 'react-firebase-hooks/auth';
import Sidebar from "@/app/assessment-question-bank/components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, BookOpen, Award, Download, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClassData {
  className: string;
  studentIds: Set<string>;
  totalScore: number;
  testCount: number;
  highestScore: number;
  lowestScore: number;
  passedCount: number;
  averageScore?: number;
  passRate?: number;
}

interface FormattedClassData {
  className: string;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

export default function ClasswiseReportPage() {
  const [user] = useAuthState(auth);
  const [classData, setClassData] = useState<FormattedClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

    useEffect(() => {
    const fetchClasswiseData = async () => {
      if (!user) {
        setClassData([]);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const testsQuery = query(collection(db, 'test'), where('createdBy', '==', userRef));
        const testsSnapshot = await getDocs(testsQuery);

        if (testsSnapshot.empty) {
          setClassData([]);
          setLoading(false);
          return;
        }

        const testIds = testsSnapshot.docs.map(doc => doc.id);
        const testsMap = new Map();
        const classRefMap = new Map<string, DocumentReference>();

        testsSnapshot.forEach(doc => {
          const testData = doc.data();
          testsMap.set(doc.id, { id: doc.id, ...testData });
          if (testData.classId instanceof DocumentReference) {
            classRefMap.set(testData.classId.id, testData.classId);
          }
        });

        const classNames = new Map<string, string>();
        for (const [id, ref] of classRefMap.entries()) {
            const classDoc = await getDoc(ref);
            if (classDoc.exists()) {
                classNames.set(id, classDoc.data().name || `Unknown Class`);
            } else {
                classNames.set(id, `Unknown Class`);
            }
        }

        // Fetch all relevant test results in batches of 30 (Firestore 'in' query limit)
        const allResults: DocumentData[] = [];
        for (let i = 0; i < testIds.length; i += 30) {
            const batchIds = testIds.slice(i, i + 30);
            const resultsQuery = query(collection(db, 'testResults'), where('testId', 'in', batchIds));
            const resultsSnapshot = await getDocs(resultsQuery);
            resultsSnapshot.forEach(doc => allResults.push(doc.data()));
        }

        if (allResults.length === 0) {
            setClassData([]);
            setLoading(false);
            return;
        }

        // Process results to aggregate class-wise data
        const aggregatedData = allResults.reduce<Record<string, ClassData>>((acc, result) => {
          const testData = testsMap.get(result.testId);
          
          if (!testData || !testData.classId) {
            return acc;
          }
          
          const classId = testData.classId.id;
          const className = classNames.get(classId) || 'Unknown Class';
          
          if (!acc[classId]) {
            acc[classId] = {
              className: className,
              studentIds: new Set<string>(),
              totalScore: 0,
              testCount: 0,
              highestScore: 0,
              lowestScore: 101,
              passedCount: 0
            };
          }
          
          acc[classId].studentIds.add(result.studentId);
          acc[classId].totalScore += result.percentageScore || 0;
          acc[classId].testCount++;
          acc[classId].highestScore = Math.max(acc[classId].highestScore, result.percentageScore || 0);
          acc[classId].lowestScore = Math.min(acc[classId].lowestScore, result.percentageScore || 0);
          
          if ((result.percentageScore || 0) >= 35) {
            acc[classId].passedCount++;
          }
          
          return acc;
        }, {});

        const formattedData = Object.values(aggregatedData).map((data: ClassData) => {
          const averageScore = data.testCount > 0 ? data.totalScore / data.testCount : 0;
          const passRate = data.testCount > 0 ? (data.passedCount / data.testCount) * 100 : 0;

          return {
            className: data.className,
            totalStudents: data.studentIds.size,
            averageScore: parseFloat(averageScore.toFixed(2)),
            highestScore: parseFloat(data.highestScore.toFixed(2)),
            lowestScore: data.lowestScore === 101 ? 0 : parseFloat(data.lowestScore.toFixed(2)),
            passRate: parseFloat(passRate.toFixed(2)),
          };
        });

        setClassData(formattedData);
      } catch (error) {
        console.error('Error fetching classwise data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasswiseData();
  }, [user]);

  // Prepare chart data
  const chartData = classData.map(cls => ({
    name: cls.className.replace('Class ', ''),
    averageScore: cls.averageScore,
    passRate: cls.passRate,
    students: cls.totalStudents
  }));

  const performanceDistribution = [
    { name: 'Excellent', value: classData.filter(c => c.averageScore >= 80).length, color: '#22c55e' },
    { name: 'Good', value: classData.filter(c => c.averageScore >= 60 && c.averageScore < 80).length, color: '#06b6d4' },
    { name: 'At-Risk', value: classData.filter(c => c.averageScore < 60).length, color: '#ef4444' }
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 text-lg font-medium">Loading class performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (classData.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="text-center bg-white rounded-xl shadow-sm p-12 max-w-md">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No class performance data available</p>
            <p className="text-gray-500 text-sm mt-2">Create some tests to see analytics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Performance Dashboard</h1>
            <p className="text-gray-600">Monitor and analyze class performance metrics</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Overall Average Card */}
            <div className="bg-blue-500 rounded-xl p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-blue-100 text-sm font-medium">Overall Average</p>
                  <TrendingUp className="h-5 w-5 text-blue-200" />
                </div>
                <p className="text-3xl font-bold">
                  {(classData.reduce((sum, cls) => sum + cls.averageScore, 0) / classData.length).toFixed(1)}%
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            {/* Tests Completed Card */}
            <div className="bg-green-500 rounded-xl p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-100 text-sm font-medium">Classes</p>
                  <BookOpen className="h-5 w-5 text-green-200" />
                </div>
                <p className="text-3xl font-bold">{classData.length}</p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            {/* Available Tests Card */}
            <div className="bg-purple-500 rounded-xl p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-purple-100 text-sm font-medium">Total Students</p>
                  <Users className="h-5 w-5 text-purple-200" />
                </div>
                <p className="text-3xl font-bold">
                  {classData.reduce((sum, cls) => sum + cls.totalStudents, 0)}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            {/* Best Percentage Card */}
            <div className="bg-orange-500 rounded-xl p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-orange-100 text-sm font-medium">Pass Rate</p>
                  <Award className="h-5 w-5 text-orange-200" />
                </div>
                <p className="text-3xl font-bold">
                  {(classData.reduce((sum, cls) => sum + cls.passRate, 0) / classData.length).toFixed(1)}%
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Class Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance</h3>
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
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="averageScore" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="passRate" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Chart Legend */}
              <div className="flex flex-wrap gap-6 mt-4 justify-center">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600 font-medium">Average Score (%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600 font-medium">Pass Rate (%)</span>
                </div>
              </div>
              
              {/* Pro Tip */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Pro Tip:</span> Compare the blue bars (average scores) with green bars (pass rates) to identify classes that may need additional support. High average scores with low pass rates may indicate inconsistent performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Distribution</h3>
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
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Chart Legend */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-4 h-4 rounded-full mr-3 bg-green-500"></div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-green-700">Excellent</span>
                    <p className="text-xs text-green-600">80% - 100%</p>
                  </div>
                </div>
                <div className="flex items-center justify-center p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                  <div className="w-4 h-4 rounded-full mr-3 bg-cyan-500"></div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-cyan-700">Good</span>
                    <p className="text-xs text-cyan-600">60% - 79%</p>
                  </div>
                </div>
                <div className="flex items-center justify-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-4 h-4 rounded-full mr-3 bg-red-500"></div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-red-700">At-Risk</span>
                    <p className="text-xs text-red-600">Below 60%</p>
                  </div>
                </div>
              </div>
              
              {/* Pro Tip */}
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">Pro Tip:</span> This distribution shows how your classes are performing overall. A large "At-Risk" segment indicates classes needing immediate attention, while a balanced distribution suggests consistent teaching quality across classes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Class Cards */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Class Performance Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {classData.map((classInfo, index) => (
                <div key={index} className="group bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100/50 backdrop-blur-sm overflow-hidden">
                  {/* Header Section */}
                  <div className="relative p-6 pb-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -mr-16 -mt-16 opacity-60"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-bold text-gray-900">{classInfo.className}</h3>
                            <p className="text-sm text-gray-500 flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {classInfo.totalStudents} students
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Average</span>
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">{classInfo.averageScore}%</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Pass Rate</span>
                          <Award className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{classInfo.passRate}%</p>
                      </div>
                    </div>

                    {/* Score Range */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-600">Highest Score</span>
                        </div>
                        <span className="font-semibold text-green-600">{classInfo.highestScore}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-600">Lowest Score</span>
                        </div>
                        <span className="font-semibold text-red-600">{classInfo.lowestScore}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Performance</span>
                        <span className="text-xs font-semibold text-gray-700">{classInfo.averageScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${Math.min(classInfo.averageScore, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className="mb-6">
                      <ResponsiveContainer width="100%" height={60}>
                        <LineChart data={[
                          { name: 'Low', value: classInfo.lowestScore },
                          { name: 'Avg', value: classInfo.averageScore },
                          { name: 'High', value: classInfo.highestScore }
                        ]}>
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Action Button */}
                    <button 
                      onClick={() => router.push(`/assessment-question-bank/results/view/class-details/${encodeURIComponent(classInfo.className)}`)}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] flex items-center justify-center group"
                    >
                      <span>View Full Details</span>
                      <TrendingUp className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
              <Download className="h-5 w-5 mr-2" />
              Download PDF Report
            </button>
            <button className="flex items-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Export to Excel
            </button>
            <button className="flex items-center px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
              <BarChart3 className="h-5 w-5 mr-2" />
              View Analytics
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}