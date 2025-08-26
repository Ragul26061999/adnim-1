"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/app/contexts/AuthContext";
import { getStudentsBySchool } from "@/lib/userManagement";

type TestResult = {
  id: string;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  percentageScore: number;
  grade?: string;
  duration?: number; // seconds
  startTime?: Timestamp;
  endTime?: Timestamp;
  studentId: string;
  studentName?: string;
  subjectName?: string;
  testId: string;
  studentAnswers?: Array<{ questionId: string; isCorrect?: boolean; subject?: string }>;
};

type TestDoc = {
  id: string;
  concept?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | string;
  bloom?: string;
  subjectID?: string;
  questionText?: string;
};

type Remark = {
  id: string;
  type?: string; // behavior | academic
  priority?: string; // low | medium | high
  personalRemarks?: string;
  workRemarks?: string;
  studentId: string;
  createdAt?: Timestamp;
};

type StudentDoc = {
  id: string;
  name?: string;
  rollNumber?: string;
  classId?: string;
  dob?: Timestamp;
  admissionDate?: Timestamp;
};

type UserDoc = {
  uid: string;
  email?: string;
  role?: string;
};

function toDateString(ts?: Timestamp) {
  try {
    if (!ts) return "";
    const d = ts.toDate();
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Safely extract an ID string from a Firestore DocumentReference or similar
function extractIdFromRef(ref: any): string {
  try {
    if (!ref) return "";
    if (typeof ref === "string") return ref;
    if (ref.id) return ref.id;
    if (ref._path?.segments) {
      const segs = ref._path.segments as string[];
      return segs[segs.length - 1] || "";
    }
    if (ref.path) {
      const parts = String(ref.path).split("/");
      return parts[parts.length - 1] || "";
    }
  } catch {
    // ignore
  }
  return "";
}

export default function StudentConsolidatedPage() {
  const params = useSearchParams();
  const paramStudentId = params.get("studentId") || "";

  const [studentId, setStudentId] = useState<string>(paramStudentId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [student, setStudent] = useState<StudentDoc | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testsMeta, setTestsMeta] = useState<Record<string, TestDoc>>({});
  const [remarks, setRemarks] = useState<Remark[]>([]);

  // Auth and school-wide students list
  const { schoolId, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Load all students for the logged-in user's school
  useEffect(() => {
    if (authLoading) return;
    if (!schoolId) return;
    let canceled = false;
    async function loadStudents() {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const data = await getStudentsBySchool(schoolId as string);
        if (!canceled) setStudents(data || []);
      } catch (e: any) {
        if (!canceled) setStudentsError(e?.message || "Failed to load students");
      } finally {
        if (!canceled) setStudentsLoading(false);
      }
    }
    loadStudents();
    return () => {
      canceled = true;
    };
  }, [schoolId, authLoading]);

  // Trigger load on mount and when studentId changes via input
  useEffect(() => {
    if (!studentId) return;
    let canceled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Basic Student Info: find student doc by userId
        const sQ = query(collection(db, "students"), where("userId", "==", studentId), limit(1));
        const sSnap = await getDocs(sQ);
        const studentData = !sSnap.empty
          ? ({ id: sSnap.docs[0].id, ...(sSnap.docs[0].data() as any) } as StudentDoc)
          : null;

        // User info from users collection
        const userRef = doc(db, "users", studentId);
        const userSnap = await getDoc(userRef);
        let userData: UserDoc | null = null;
        if (userSnap.exists()) {
          userData = { uid: (userSnap.data() as any)?.uid || userSnap.id, ...(userSnap.data() as any) } as UserDoc;
        } else {
          // Fallback: query by uid field
          try {
            const uq = query(collection(db, "users"), where("uid", "==", studentId), limit(1));
            const uqs = await getDocs(uq);
            if (!uqs.empty) {
              const d = uqs.docs[0];
              userData = { uid: (d.data() as any)?.uid || d.id, ...(d.data() as any) } as UserDoc;
            }
          } catch {
            // ignore
          }
        }

        if (!canceled) {
          setStudent(studentData);
          setUser(userData);
        }

        // Test Results for student
        const trQ = query(
          collection(db, "testresults"),
          where("studentId", "==", studentId)
        );
        const trSnap = await getDocs(trQ);
        const tr: TestResult[] = trSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TestResult, "id">),
        }));
        if (!canceled) setResults(tr);

        // Fetch related Test docs (concept/difficulty/bloom)
        const uniqueTestIds = Array.from(new Set(tr.map((r) => r.testId).filter(Boolean)));
        const metaEntries: [string, TestDoc][] = [];
        // Firestore has no batch get by IDs on client SDK without in() limit; use chunks of 10
        const chunkSize = 10;
        for (let i = 0; i < uniqueTestIds.length; i += chunkSize) {
          const chunk = uniqueTestIds.slice(i, i + chunkSize);
          if (!chunk.length) continue;
          // Try in-query first if supported
          if (chunk.length <= 10) {
            try {
              const tQ = query(
                collection(db, "test"),
                where("__name__", "in", chunk)
              );
              const tSnap = await getDocs(tQ);
              tSnap.forEach((td) => metaEntries.push([td.id, { id: td.id, ...(td.data() as any) }]));
              continue;
            } catch {
              // Fallback to per-doc fetch
            }
          }
          await Promise.all(
            chunk.map(async (tid) => {
              try {
                const tRef = doc(db, "test", tid);
                const tSnap = await getDoc(tRef);
                if (tSnap.exists()) metaEntries.push([tSnap.id, { id: tSnap.id, ...(tSnap.data() as any) }]);
              } catch {
                // ignore
              }
            })
          );
        }
        if (!canceled) setTestsMeta(Object.fromEntries(metaEntries));

        // Remarks (latest 5)
        let remarksList: Remark[] = [];
        try {
          const rq = query(
            collection(db, "remark"),
            where("studentId", "==", studentId),
            orderBy("createdAt", "desc"),
            limit(5)
          );
          const rSnap = await getDocs(rq);
          remarksList = rSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        } catch {
          // Fallback without orderBy if createdAt not present
          const rq = query(collection(db, "remark"), where("studentId", "==", studentId), limit(5));
          const rSnap = await getDocs(rq);
          remarksList = rSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
        if (!canceled) setRemarks(remarksList);
      } catch (e: any) {
        if (!canceled) setError(e?.message || "Failed to load report");
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    load();
    return () => {
      canceled = true;
    };
  }, [studentId]);

  // Derived aggregations
  const aggregations = useMemo(() => {
    if (!results.length) {
      return {
        totalTests: 0,
        overallAvg: 0,
        grade: "",
        subjects: {} as Record<string, { avg: number; correct: number; incorrect: number; skipped: number; tests: number }>,
        bestSubject: "",
        weakestSubject: "",
        concept: {} as Record<string, { count: number; avgAcc: number }>,
        difficulty: {} as Record<string, { count: number; avgAcc: number }>,
        bloom: {} as Record<string, { count: number; avgAcc: number }>,
        avgTimePerQuestion: 0,
        trend: [] as { date: string; percentage: number }[],
      };
    }

    const totalTests = results.length;
    const overallAvg = avg(results.map((r) => r.percentageScore || 0));
    const grade = results[results.length - 1]?.grade || "";

    // Subject-wise
    const subjects: Record<string, { sumPerc: number; correct: number; incorrect: number; skipped: number; tests: number }> = {};
    for (const r of results) {
      const s = (r.subjectName || "Unknown").trim() || "Unknown";
      if (!subjects[s]) subjects[s] = { sumPerc: 0, correct: 0, incorrect: 0, skipped: 0, tests: 0 };
      subjects[s].sumPerc += r.percentageScore || 0;
      subjects[s].correct += r.correctAnswers || 0;
      subjects[s].incorrect += r.incorrectAnswers || 0;
      subjects[s].skipped += r.skippedQuestions || 0;
      subjects[s].tests += 1;
    }
    const subjectsView: Record<string, { avg: number; correct: number; incorrect: number; skipped: number; tests: number }> = {};
    Object.entries(subjects).forEach(([k, v]) => {
      subjectsView[k] = {
        avg: v.tests ? v.sumPerc / v.tests : 0,
        correct: v.correct,
        incorrect: v.incorrect,
        skipped: v.skipped,
        tests: v.tests,
      };
    });

    // Best / Weakest subject by avg %
    const sortedSubjects = Object.entries(subjectsView).sort((a, b) => b[1].avg - a[1].avg);
    const bestSubject = sortedSubjects[0]?.[0] || "";
    const weakestSubject = sortedSubjects[sortedSubjects.length - 1]?.[0] || "";

    // Concept/Difficulty/Bloom from testsMeta
    const conceptAgg: Record<string, number[]> = {};
    const difficultyAgg: Record<string, number[]> = {};
    const bloomAgg: Record<string, number[]> = {};
    for (const r of results) {
      const meta = testsMeta[r.testId];
      const perc = r.percentageScore || 0;
      if (meta?.concept) {
        const k = meta.concept.trim();
        if (!conceptAgg[k]) conceptAgg[k] = [];
        conceptAgg[k].push(perc);
      }
      if (meta?.difficulty) {
        const k = meta.difficulty.trim();
        if (!difficultyAgg[k]) difficultyAgg[k] = [];
        difficultyAgg[k].push(perc);
      }
      if (meta?.bloom) {
        const k = meta.bloom.trim();
        if (!bloomAgg[k]) bloomAgg[k] = [];
        bloomAgg[k].push(perc);
      }
    }
    const concept = Object.fromEntries(
      Object.entries(conceptAgg).map(([k, arr]) => [k, { count: arr.length, avgAcc: avg(arr) }])
    );
    const difficulty = Object.fromEntries(
      Object.entries(difficultyAgg).map(([k, arr]) => [k, { count: arr.length, avgAcc: avg(arr) }])
    );
    const bloom = Object.fromEntries(
      Object.entries(bloomAgg).map(([k, arr]) => [k, { count: arr.length, avgAcc: avg(arr) }])
    );

    // Time efficiency: avg time per answered question
    const perQ: number[] = results
      .map((r) => (r.duration && r.answeredQuestions ? r.duration / r.answeredQuestions : 0))
      .filter((x) => x > 0);
    const avgTimePerQuestion = avg(perQ);

    // Trend over time
    const trend = [...results]
      .sort((a, b) => {
        const ad = a.endTime?.toMillis?.() || 0;
        const bd = b.endTime?.toMillis?.() || 0;
        return ad - bd;
      })
      .map((r) => ({
        date: r.endTime ? new Date(r.endTime.toMillis()).toLocaleDateString() : "",
        percentage: r.percentageScore || 0,
      }));

    return {
      totalTests,
      overallAvg,
      grade,
      subjects: subjectsView,
      bestSubject,
      weakestSubject,
      concept,
      difficulty,
      bloom,
      avgTimePerQuestion,
      trend,
    };
  }, [results, testsMeta]);

  const recommendations = useMemo(() => {
    const recs: string[] = [];
    if (!results.length) return recs;
    if (aggregations.bestSubject) recs.push(`Strength in ${aggregations.bestSubject}. Continue practicing at higher difficulty.`);
    if (aggregations.weakestSubject)
      recs.push(`Focus on ${aggregations.weakestSubject}. Review foundational concepts and attempt easier practice sets.`);
    // Difficulty insights
    const diffEntries = Object.entries(aggregations.difficulty);
    if (diffEntries.length) {
      const sorted = diffEntries.sort((a, b) => b[1].avgAcc - a[1].avgAcc);
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      if (top) recs.push(`Performs best on ${top[0]} difficulty (avg ${top[1].avgAcc.toFixed(1)}%).`);
      if (bottom) recs.push(`Struggles on ${bottom[0]} difficulty (avg ${bottom[1].avgAcc.toFixed(1)}%).`);
    }
    // Time efficiency
    if (aggregations.avgTimePerQuestion > 0)
      recs.push(`Average ${aggregations.avgTimePerQuestion.toFixed(1)}s per question. Aim for steady pace with accuracy.`);
    return recs;
  }, [aggregations, results.length]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Student Consolidated Report</h1>

      {/* Student selector */}
      {/* School-wide student list */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Students in Your School</h2>
        {!schoolId && !authLoading && (
          <div className="text-sm text-red-600">School not found. Please sign in.</div>
        )}
        {studentsError && <div className="text-sm text-red-600">{studentsError}</div>}
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or roll no"
            className="border px-3 py-2 rounded w-72"
          />
          {studentsLoading && <div className="text-sm text-gray-600">Loading students...</div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students
            .filter((s: any) => {
              const q = search.trim().toLowerCase();
              if (!q) return true;
              const name = (s.name || "").toLowerCase();
              const roll = (s.rollNumber || "").toLowerCase();
              return name.includes(q) || roll.includes(q);
            })
            .map((s: any) => (
              <button
                key={s.id}
                onClick={() => setStudentId(s.userId || s.id)}
                className="text-left border rounded p-3 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Load consolidated report"
              >
                <div className="font-medium">{s.name || "Unnamed"}</div>
                <div className="text-sm text-gray-600">Roll: {s.rollNumber || "-"}</div>
              </button>
            ))}
        </div>
      </section>

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Student ID</label>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value.trim())}
            placeholder="Enter studentId"
            className="border px-3 py-2 rounded w-64"
          />
        </div>
        <button
          onClick={() => setStudentId((s) => s.trim())}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load
        </button>
      </div>

      {loading && <div>Loading report...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && studentId && (
        <div className="space-y-8">
          {/* Basic Info */}
          <section className="space-y-1">
            <h2 className="text-xl font-semibold">Basic Student Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><span className="font-medium">Name:</span> {student?.name || "-"}</div>
              <div><span className="font-medium">Email:</span> {user?.email || "-"}</div>
              <div><span className="font-medium">Roll No:</span> {student?.rollNumber || "-"}</div>
              <div><span className="font-medium">Class:</span> {extractIdFromRef((student as any)?.classId) || "-"}</div>
              <div><span className="font-medium">DOB:</span> {toDateString((student as any)?.dob || (student as any)?.dateOfBirth)}</div>
              <div><span className="font-medium">Admission:</span> {toDateString((student as any)?.admissionDate)}</div>
            </div>
          </section>

          {/* Academic Summary */}
          <section>
            <h2 className="text-xl font-semibold">Academic Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <SummaryCard title="Total Tests" value={String(aggregations.totalTests)} />
              <SummaryCard title="Overall Avg %" value={aggregations.overallAvg.toFixed(1)} />
              <SummaryCard title="Grade" value={aggregations.grade || "-"} />
              <SummaryCard title="Best Subject" value={aggregations.bestSubject || "-"} />
              <SummaryCard title="Weakest Subject" value={aggregations.weakestSubject || "-"} />
              <SummaryCard title="Avg Time/Q" value={`${aggregations.avgTimePerQuestion.toFixed(1)}s`} />
            </div>
          </section>

          {/* Subject-wise Performance */}
          <section>
            <h2 className="text-xl font-semibold">Subject-Wise Performance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border mt-2">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Subject</Th>
                    <Th>Avg %</Th>
                    <Th>Correct</Th>
                    <Th>Incorrect</Th>
                    <Th>Skipped</Th>
                    <Th>Tests</Th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(aggregations.subjects).map(([s, v]) => (
                    <tr key={s} className="border-t">
                      <Td>{s}</Td>
                      <Td>{v.avg.toFixed(1)}</Td>
                      <Td>{v.correct}</Td>
                      <Td>{v.incorrect}</Td>
                      <Td>{v.skipped}</Td>
                      <Td>{v.tests}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Concept / Difficulty / Bloom */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KeyValueList title="Concept Mastery" data={aggregations.concept} valueFormatter={(v) => `${v.avgAcc.toFixed(1)}% (${v.count})`} />
            <KeyValueList title="Difficulty Performance" data={aggregations.difficulty} valueFormatter={(v) => `${v.avgAcc.toFixed(1)}% (${v.count})`} />
            <KeyValueList title="Bloom Performance" data={aggregations.bloom} valueFormatter={(v) => `${v.avgAcc.toFixed(1)}% (${v.count})`} />
          </section>

          {/* Trend */}
          <section>
            <h2 className="text-xl font-semibold mb-2">Performance Trend</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregations.trend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Line type="monotone" dataKey="percentage" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Remarks */}
          <section>
            <h2 className="text-xl font-semibold">Latest Remarks</h2>
            {remarks.length === 0 ? (
              <div className="text-sm text-gray-600 mt-1">No remarks.</div>
            ) : (
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {remarks.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">[{r.type || "general"}/{r.priority || "-"}]</span> {r.personalRemarks || r.workRemarks || "-"}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recommendations */}
          <section>
            <h2 className="text-xl font-semibold">Recommendations</h2>
            {recommendations.length === 0 ? (
              <div className="text-sm text-gray-600 mt-1">No recommendations yet.</div>
            ) : (
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {recommendations.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs uppercase text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left p-2 border-b font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-2">{children}</td>;
}

function KeyValueList<T extends { count: number; avgAcc: number }>({
  title,
  data,
  valueFormatter,
}: {
  title: string;
  data: Record<string, T>;
  valueFormatter: (v: T) => string;
}) {
  const entries = Object.entries(data);
  return (
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <div className="text-sm text-gray-600 mt-1">No data</div>
      ) : (
        <ul className="mt-2 space-y-1">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between border-b py-1">
              <span>{k}</span>
              <span className="text-gray-700">{valueFormatter(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

