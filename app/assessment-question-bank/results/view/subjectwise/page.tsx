'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, DocumentData, DocumentReference } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { useAuthState } from 'react-firebase-hooks/auth';
import Sidebar from "@/app/assessment-question-bank/components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, BookOpen, Award, Download, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubjectData {
  subjectName: string;
  studentIds: Set<string>;
  totalScore: number;
  testCount: number;
  highestScore: number;
  lowestScore: number;
  passedCount: number;
  averageScore?: number;
  passRate?: number;
}

interface FormattedSubjectData {
  subjectName: string;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

export default function SubjectwiseReportPage() {
  const [user] = useAuthState(auth);
  const [subjectData, setSubjectData] = useState<FormattedSubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSubjectwiseData = async () => {
      if (!user) {
        setSubjectData([]);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const testsQuery = query(collection(db, 'test'), where('createdBy', '==', userRef));
        const testsSnapshot = await getDocs(testsQuery);

        if (testsSnapshot.empty) {
          setSubjectData([]);
          setLoading(false);
          return;
        }

        const testIds = testsSnapshot.docs.map(doc => doc.id);
        const testsMap = new Map();
        const subjectMap = new Map<string, string>();

        // Process test data to get subject information
        for (const doc of testsSnapshot.docs) {
          const testData = doc.data();
          testsMap.set(doc.id, { id: doc.id, ...testData });
          
          // Get subject name from test data
          if (testData.subject) {
            subjectMap.set(doc.id, testData.subject);
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
          setSubjectData([]);
          setLoading(false);
          return;
        }

        // Process results to aggregate subject-wise data
        const aggregatedData = allResults.reduce<Record<string, SubjectData>>((acc, result) => {
          const testData = testsMap.get(result.testId);
          
          if (!testData) {
            return acc;
          }
          
          const subjectName = subjectMap.get(result.testId) || 'Other';
          
          if (!acc[subjectName]) {
            acc[subjectName] = {
              subjectName: subjectName,
              studentIds: new Set<string>(),
              totalScore: 0,
              testCount: 0,
              highestScore: 0,
              lowestScore: 101,
              passedCount: 0
            };
          }
          
          acc[subjectName].studentIds.add(result.studentId);
          acc[subjectName].totalScore += result.percentageScore || 0;
          acc[subjectName].testCount++;
          acc[subjectName].highestScore = Math.max(acc[subjectName].highestScore, result.percentageScore || 0);
          acc[subjectName].lowestScore = Math.min(acc[subjectName].lowestScore, result.percentageScore || 0);
          
          if ((result.percentageScore || 0) >= 35) {
            acc[subjectName].passedCount++;
          }
          
          return acc;
        }, {});

        const formattedData = Object.values(aggregatedData).map((data: SubjectData) => {
          const averageScore = data.testCount > 0 ? data.totalScore / data.testCount : 0;
          const passRate = data.testCount > 0 ? (data.passedCount / data.testCount) * 100 : 0;

          return {
            subjectName: data.subjectName,
            totalStudents: data.studentIds.size,
            averageScore: parseFloat(averageScore.toFixed(2)),
            highestScore: parseFloat(data.highestScore.toFixed(2)),
            lowestScore: data.lowestScore === 101 ? 0 : parseFloat(data.lowestScore.toFixed(2)),
            passRate: parseFloat(passRate.toFixed(2)),
          };
        });

        setSubjectData(formattedData);
      } catch (error) {
        console.error('Error fetching subject-wise data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectwiseData();
  }, [user]);

  // Prepare chart data
  const chartData = subjectData.map(subject => ({
    name: subject.subjectName,
    averageScore: subject.averageScore,
    passRate: subject.passRate,
    students: subject.totalStudents
  }));

  const performanceDistribution = [
    { name: 'Excellent', value: subjectData.filter(s => s.averageScore >= 80).length, color: '#22c55e' },
    { name: 'Good', value: subjectData.filter(s => s.averageScore >= 60 && s.averageScore < 80).length, color: '#06b6d4' },
    { name: 'At-Risk', value: subjectData.filter(s => s.averageScore < 60).length, color: '#ef4444' }
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 text-lg font-medium">Loading subject performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (subjectData.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="text-center bg-white rounded-xl shadow-sm p-12 max-w-md">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No subject performance data available</p>
            <p className="text-gray-500 text-sm mt-2">Create some tests with subjects to see analytics</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Subject Performance Dashboard</h1>
            <p className="text-gray-600">Monitor and analyze subject performance metrics</p>
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
                  {(subjectData.reduce((sum, subj) => sum + subj.averageScore, 0) / subjectData.length).toFixed(1)}%
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            {/* Subjects Card */}
            <div className="bg-green-500 rounded-xl p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-100 text-sm font-medium">Subjects</p>
                  <BookOpen className="h-5 w-5 text-green-200" />
                </div>
                <p className="text-3xl font-bold">{subjectData.length}</p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            {/* Total Students Card */}
            <div className="bg-purple-500 rounded-xl p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-purple-100 text-sm font-medium">Total Students</p>
                  <Users className="h-5 w-5 text-purple-200" />
                </div>
                <p className="text-3xl font-bold">
                  {subjectData.reduce((sum, subj) => sum + subj.totalStudents, 0)}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>

            {/* Pass Rate Card */}
            <div className="bg-orange-500 rounded-xl p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-orange-100 text-sm font-medium">Pass Rate</p>
                  <Award className="h-5 w-5 text-orange-200" />
                </div>
                <p className="text-3xl font-bold">
                  {(subjectData.reduce((sum, subj) => sum + subj.passRate, 0) / subjectData.length).toFixed(1)}%
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Subject Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
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
                  <Bar dataKey="averageScore" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} name="Average Score" />
                  <Bar dataKey="passRate" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} name="Pass Rate" />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Chart Legend */}
              <div className="flex flex-wrap gap-6 mt-4 justify-center">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Average Score</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Pass Rate</span>
                </div>
              </div>
            </div>

            {/* Performance Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h3>
              <div className="h-64 flex items-center justify-center">
                {performanceDistribution.length > 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-48 h-48 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={performanceDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {performanceDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} subjects`, 'Count']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {performanceDistribution.map((entry, index) => (
                        <div key={`legend-${index}`} className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: entry.color }}
                          ></div>
                          <span className="text-sm text-gray-600">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">Not enough data to show distribution</p>
                )}
              </div>
            </div>
          </div>

          {/* Subject Performance Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Subject Performance Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Score
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Highest
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lowest
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pass Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjectData.map((subject, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{subject.subjectName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{subject.totalStudents}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          subject.averageScore >= 70 ? 'text-green-600' : 
                          subject.averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {subject.averageScore}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{subject.highestScore}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{subject.lowestScore}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subject.passRate >= 70 ? 'bg-green-100 text-green-800' : 
                            subject.passRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {subject.passRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
