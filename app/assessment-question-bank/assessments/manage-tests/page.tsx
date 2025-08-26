// This is the Test Management page for managing created tests.
"use client";
import * as React from "react";
import Sidebar from "../../components/Sidebar";
import { db } from "@/lib/firebaseClient";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  DocumentReference,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import QuestionSelectionDialog from "../../components/QuestionSelectionDialog";
import PDFDownloadButton from "../../pyq/neet/PDFDownloadButton";
import TestPreviewDialog from "../../components/TestPreviewDialog";
import latexToPngDataUrl from "../../pyq/neet/latexToDataUrl";
import { Dialog } from "@headlessui/react";
import { 
  ChartBarIcon, 
  CheckCircleIcon, 
  DocumentTextIcon, 
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  DocumentArrowDownIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

const pastelStatus = {
  published: "bg-blue-100 text-blue-700",
  drafted: "bg-gray-100 text-gray-700",
  ongoing: "bg-green-100 text-green-700",
  finished: "bg-pink-100 text-pink-700",
};

// Helper to split text and LaTeX and generate images
async function splitTextWithLatex(text: string) {
  const regex = /\$([^$]+)\$/g;
  let lastIndex = 0;
  let match;
  const result: (string | { latex: string; img: string })[] = [];
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    const latex = match[1];
    const img = await latexToPngDataUrl(latex);
    result.push({ latex, img });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return result;
}

export default function ManageTestsPage() {
  const [tests, setTests] = React.useState<any[]>([]);
  const [allTests, setAllTests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const router = useRouter();
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(6);
  const [userSchoolId, setUserSchoolId] = React.useState<string | null>(null);
  const [selectDialogOpen, setSelectDialogOpen] = React.useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = React.useState<{
    [testId: string]: string[];
  }>({});
  const [preparePdfTest, setPreparePdfTest] = React.useState<any | null>(null);
  const [pdfQuestions, setPdfQuestions] = React.useState<any[]>([]);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'all' | 'online' | 'drafted'>('all');
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = React.useState<any[]>([]);
  const [isClient, setIsClient] = React.useState(false);
  
  // Cache key for tests
  const TESTS_CACHE_KEY = 'manage_tests_cache';
  const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

  // Fix hydration by ensuring client-side rendering
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function for consistent date formatting
  const formatDate = (date: any) => {
    if (!date || !isClient) return "-";
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return "-";
    }
  };

  // Fetch current user's schoolID
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        if (userData && userData.schoolId) {
          setUserSchoolId(userData.schoolId);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!userSchoolId) return;
    
    (async () => {
      setLoading(true);
      try {
        // Check cache first
        const cached = localStorage.getItem(TESTS_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_EXPIRY_TIME) {
            setAllTests(data);
            // Filter tests based on school and apply manual filtering
            const filteredTests = data.filter((t: any) => {
              const matchesSchool = !userSchoolId || !t.schoolId || t.schoolId === userSchoolId;
              return matchesSchool;
            });
            setTests(filteredTests);
            setLoading(false);
            return;
          }
        }

        const testsSnap = await getDocs(collection(db, "test"));
        const testList: any[] = [];
        for (const testDoc of testsSnap.docs) {
          const data = testDoc.data();
          // Fetch class name
          let className = "-";
          if (data.classId) {
            try {
              const classSnap = await getDoc(data.classId as DocumentReference);
              className = classSnap.exists() ? classSnap.data().name : "-";
            } catch {}
          }
          testList.push({
            id: testDoc.id,
            name: data.name,
            className,
            start: data.start?.toDate ? data.start.toDate() : data.start,
            end: data.end?.toDate ? data.end.toDate() : data.end,
            status: (data.status || "drafted") as keyof typeof pastelStatus,
            online: data.online,
            published: data.published,
            schoolId: data.schoolId,
            questions: Array.isArray(data.questions) ? data.questions : [],
            totalQuestions:
              typeof data.totalQuestions === "number"
                ? data.totalQuestions
                : null,
          });
        }
        
        // Cache the data
        localStorage.setItem(TESTS_CACHE_KEY, JSON.stringify({
          data: testList,
          timestamp: Date.now()
        }));
        
        setAllTests(testList);
        
        // Filter tests based on school and apply manual filtering
        const filteredTests = testList.filter((t) => {
          const matchesSchool = !userSchoolId || !t.schoolId || t.schoolId === userSchoolId;
          return matchesSchool;
        });
        setTests(filteredTests);
      } catch (err: any) {
        setError(err.message || "Failed to fetch tests.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userSchoolId]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const now = new Date();
    return {
      total: tests.length,
      drafted: tests.filter(t => !t.online).length,
      online: tests.filter(t => t.online).length,
      completed: tests.filter(t => t.end && new Date(t.end) < now).length,
    };
  }, [tests]);

  // Filter tests based on active tab
  const filteredTests = React.useMemo(() => {
    let filtered = [...tests];
    
    if (activeTab === 'drafted') {
      filtered = filtered.filter(t => !t.online);
    } else if (activeTab === 'online') {
      filtered = filtered.filter(t => t.online);
    }
    
    return filtered.sort((a, b) => {
      const aEnd = a.end ? new Date(a.end).getTime() : 0;
      const bEnd = b.end ? new Date(b.end).getTime() : 0;
      return bEnd - aEnd;
    });
  }, [tests, activeTab]);

  const totalPages = Math.ceil(filteredTests.length / pageSize);
  const paginatedTests = filteredTests.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Reset page when switching tabs
  React.useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    if (!id) return;
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, "test", id));
      // Remove from both allTests and tests to ensure UI updates correctly
      setAllTests(prev => prev.filter(t => t.id !== id));
      setTests(prev => prev.filter(t => t.id !== id));
      setConfirmDeleteId(null);
      // Bust the cache
      localStorage.removeItem(TESTS_CACHE_KEY);
    } catch (err) {
      console.error("Error deleting test:", err);
      setError("Failed to delete test. You may not have the required permissions.");
    } finally {
      setActionLoading(null);
    }
  };

  // Function to refresh a specific test's data
  const refreshTestData = async (testId: string) => {
    try {
      const testDoc = await getDoc(doc(db, "test", testId));
      if (testDoc.exists()) {
        const data = testDoc.data();
        // Fetch class name
        let className = "-";
        if (data.classId) {
          try {
            const classSnap = await getDoc(data.classId as DocumentReference);
            className = classSnap.exists() ? classSnap.data().name : "-";
          } catch {}
        }
        
        const updatedTest = {
          id: testDoc.id,
          name: data.name,
          className,
          start: data.start?.toDate ? data.start.toDate() : data.start,
          end: data.end?.toDate ? data.end.toDate() : data.end,
          status: (data.status || "drafted") as keyof typeof pastelStatus,
          online: data.online,
          questions: Array.isArray(data.questions) ? data.questions : [],
          totalQuestions: typeof data.totalQuestions === "number" ? data.totalQuestions : null,
        };
        
        setTests((prev) =>
          prev.map((t) => (t.id === testId ? updatedTest : t))
        );
      }
    } catch (err) {
      console.error("Error refreshing test data:", err);
    }
  };

  const handlePublish = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "test", id), { published: true });
      setTests((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, published: true } : t
        )
      );
      setAllTests((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, published: true } : t
        )
      );
    } catch (err) {
      alert("Failed to publish test.");
    } finally {
      setActionLoading(null);
    }
  };

  // Handler to toggle online status
  const handleToggleOnline = async (id: string, currentOnline: boolean) => {
    setActionLoading(id);
    try {
      const newOnlineStatus = !currentOnline;
      await updateDoc(doc(db, "test", id), { online: newOnlineStatus });
      setTests((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, online: newOnlineStatus } : t
        )
      );
      setAllTests((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, online: newOnlineStatus } : t
        )
      );
    } catch (err) {
      alert("Failed to update test status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Handler to generate PDF for test
  const handleGeneratePDF = async (test: any) => {
    setPreparePdfTest(test);
    setPdfLoading(true);
    try {
      // Fetch question data from test
      let questionsData = [];
      if (test.questions && test.questions.length > 0) {
        questionsData = await Promise.all(
          test.questions.map(async (qItem: any, index: number) => {
            let qSnap;
            let questionId = null;
            
            try {
              // Handle different question reference formats
              if (typeof qItem === 'string') {
                // If it's a string ID, create document reference
                questionId = qItem;
                const qRef = doc(db, 'questions', qItem);
                qSnap = await getDoc(qRef);
              } else if (qItem && typeof qItem === 'object') {
                // Handle object formats
                if (qItem.id) {
                  // Object with id property
                  questionId = qItem.id;
                  const qRef = doc(db, 'questions', qItem.id);
                  qSnap = await getDoc(qRef);
                } else if (qItem._path && qItem._path.segments) {
                  // Firestore DocumentReference object
                  questionId = qItem._path.segments[qItem._path.segments.length - 1];
                  const qRef = doc(db, 'questions', questionId);
                  qSnap = await getDoc(qRef);
                } else if (qItem.path) {
                  // Path string
                  const pathParts = qItem.path.split('/');
                  questionId = pathParts[pathParts.length - 1];
                  const qRef = doc(db, 'questions', questionId);
                  qSnap = await getDoc(qRef);
                } else if (qItem.referencePath) {
                  // Handle referencePath format like 'questionCollection/questionId'
                  const pathParts = qItem.referencePath.split('/');
                  questionId = pathParts[pathParts.length - 1];
                  const collectionName = pathParts[0];
                  console.log(`Processing question ${index} with referencePath:`, questionId, 'from collection:', collectionName);
                  const qRef = doc(db, collectionName, questionId);
                  qSnap = await getDoc(qRef);
                } else {
                  console.warn('Unknown question reference format:', qItem);
                  return null;
                }
              } else {
                console.warn('Invalid question reference:', qItem);
                return null;
              }
              
              if (!qSnap.exists()) {
                console.warn(`Question document not found: ${questionId}`);
                return null;
              }
            
            const d = (qSnap.data() as any) || {};
            return {
              id: qSnap.id,
              question: d.questionText || d.question || d.text || "",
              optionA: d.optionA || d.option_a || d.options?.[0] || "",
              optionB: d.optionB || d.option_b || d.options?.[1] || "",
              optionC: d.optionC || d.option_c || d.options?.[2] || "",
              optionD: d.optionD || d.option_d || d.options?.[3] || "",
              correct: d.correct || d.correctAnswer || d.answer || "",
              explanation: d.explanation || "",
              solution: d.solution || "",
              difficulty: d.difficulty || "",
              bloom: d.bloom || "",
            };
            } catch (error) {
              console.error(`Error processing PDF question ${index}:`, error, qItem);
              return null;
            }
          })
        );
        
        // Filter out null results
        questionsData = questionsData.filter(q => q !== null);
      }
      
      setPdfQuestions(questionsData);
    } catch (err) {
      console.error('Error preparing PDF:', err);
      alert('Failed to prepare PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  // Helper function to generate PDF content (simplified)
  const generateTestPDF = (test: any, questions: any[]) => {
    let content = `Test: ${test.name}\nClass: ${test.className}\nDate: ${formatDate(test.start)}\n\n`;
    
    questions.forEach((q, index) => {
      content += `${index + 1}. ${q.question}\n`;
      content += `A) ${q.optionA}\n`;
      content += `B) ${q.optionB}\n`;
      content += `C) ${q.optionC}\n`;
      content += `D) ${q.optionD}\n`;
      content += `Correct: ${q.correct}\n\n`;
    });
    
    return content;
  };

  // Helper function to find question in different collections
  const findQuestionInCollections = async (questionId: string) => {
    if (!questionId) return null;

    // Search in the most likely collection names based on documentation and code.
    const collectionsToTry = ["questions", "questionCollection", "test"];

    for (const col of collectionsToTry) {
      try {
        const docRef = doc(db, col, questionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          // Return a consistently formatted question object
          return {
            id: docSnap.id,
            question: d.questionText || d.question || d.text || "",
            optionA: d.optionA || d.option_a || d.options?.[0] || "",
            optionB: d.optionB || d.option_b || d.options?.[1] || "",
            optionC: d.optionC || d.option_c || d.options?.[2] || "",
            optionD: d.optionD || d.option_d || d.options?.[3] || "",
            correct: d.correct || d.correctAnswer || d.answer || "",
            explanation: d.explanation || "",
            solution: d.solution || "",
            difficulty: d.difficulty || "",
            bloom: d.bloom || "",
          };
        }
      } catch (error) {
        // This can happen if a collection doesn't exist or due to permissions, so we don't treat it as a fatal error.
        console.warn(`Could not check for question ${questionId} in collection '${col}'.`);
      }
    }

    console.error(`Question with ID ${questionId} not found in any of the tried collections.`);
    return null;
  };

  // Handler to preview test questions
  const handlePreviewQuestions = async (test: any) => {
    if (!test || !test.questions || test.questions.length === 0) {
      setPreviewQuestions([]);
      setPreviewDialogOpen(test.id);
      return;
    }

    setActionLoading(test.id);
    setPreviewDialogOpen(test.id);

    try {
      const questionPromises = test.questions.map((qRef: any) => {
        let id;
        // Handle various reference formats to extract the question ID
        if (typeof qRef === 'string') {
          id = qRef;
        } else if (qRef && typeof qRef === 'object') {
          id = qRef.id || qRef.path?.split('/').pop() || qRef.referencePath?.split('/').pop() || qRef._path?.segments?.pop();
        }
        
        if (!id) {
          console.warn('Could not determine question ID from reference:', qRef);
          return Promise.resolve(null);
        }
        
        return findQuestionInCollections(id);
      });

      const fetchedQuestions = (await Promise.all(questionPromises)).filter(Boolean);
      setPreviewQuestions(fetchedQuestions);

    } catch (error) {
      console.error("Error fetching preview questions:", error);
      setError("Could not load questions for preview.");
      setPreviewQuestions([]);
    } finally {
      setActionLoading(null);
    }
  };

  // Handler to prepare questions with LaTeX images for PDF
  const handlePreparePdf = async (test: any) => {
    setPreparePdfTest(test);
    setPdfLoading(true);
    // If questions are DocumentReferences, fetch their data
    let questionsData = [];
    if (
      test.questions &&
      test.questions.length > 0 &&
      typeof test.questions[0] === "object" &&
      test.questions[0].path
    ) {
      // Firestore DocumentReferences
      questionsData = await Promise.all(
        test.questions.map(async (qRef: any) => {
          const qSnap = await getDoc(qRef);
          const d = (qSnap.data() as any) || {};
          return {
            id: qSnap.id,
            question: d.questionText || d.question || "",
            optionA: d.optionA || "",
            optionB: d.optionB || "",
            optionC: d.optionC || "",
            optionD: d.optionD || "",
            correct: d.correct || "",
            explanation: d.explanation || "",
            solution: d.solution || "",
            difficulty: d.difficulty || "",
            bloom: d.bloom || "",
            questionLatex: d.questionLatex || "",
            optionALatex: d.optionALatex || "",
            optionBLatex: d.optionBLatex || "",
            optionCLatex: d.optionCLatex || "",
            optionDLatex: d.optionDLatex || "",
          };
        })
      );
    } else {
      // Already have question data
      questionsData = (test.questions || []).map((q: any) => ({
        id: q.id,
        question: q.questionText || q.question || "",
        optionA: q.optionA || "",
        optionB: q.optionB || "",
        optionC: q.optionC || "",
        optionD: q.optionD || "",
        correct: q.correct || "",
        explanation: q.explanation || "",
        solution: q.solution || "",
        difficulty: q.difficulty || "",
        bloom: q.bloom || "",
        questionLatex: q.questionLatex || "",
        optionALatex: q.optionALatex || "",
        optionBLatex: q.optionBLatex || "",
        optionCLatex: q.optionCLatex || "",
        optionDLatex: q.optionDLatex || "",
      }));
    }
    // Prepare questions with LaTeX images
    const questionsWithLatex = await Promise.all(
      questionsData.map(async (q: any) => {
        let questionLatexImg = null;
        if (q.questionLatex && q.questionLatex.trim()) {
          questionLatexImg = await latexToPngDataUrl(q.questionLatex);
          console.log("LaTeX Q:", q.questionLatex, "->", questionLatexImg);
        }
        let optionALatexImg = null;
        if (q.optionALatex && q.optionALatex.trim()) {
          optionALatexImg = await latexToPngDataUrl(q.optionALatex);
          console.log("LaTeX A:", q.optionALatex, "->", optionALatexImg);
        }
        let optionBLatexImg = null;
        if (q.optionBLatex && q.optionBLatex.trim()) {
          optionBLatexImg = await latexToPngDataUrl(q.optionBLatex);
          console.log("LaTeX B:", q.optionBLatex, "->", optionBLatexImg);
        }
        let optionCLatexImg = null;
        if (q.optionCLatex && q.optionCLatex.trim()) {
          optionCLatexImg = await latexToPngDataUrl(q.optionCLatex);
          console.log("LaTeX C:", q.optionCLatex, "->", optionCLatexImg);
        }
        let optionDLatexImg = null;
        if (q.optionDLatex && q.optionDLatex.trim()) {
          optionDLatexImg = await latexToPngDataUrl(q.optionDLatex);
          console.log("LaTeX D:", q.optionDLatex, "->", optionDLatexImg);
        }
        const questionParts = await splitTextWithLatex(q.question || "");
        const optionAParts = await splitTextWithLatex(q.optionA || "");
        const optionBParts = await splitTextWithLatex(q.optionB || "");
        const optionCParts = await splitTextWithLatex(q.optionC || "");
        const optionDParts = await splitTextWithLatex(q.optionD || "");
        return {
          ...q,
          questionLatexImg,
          optionALatexImg,
          optionBLatexImg,
          optionCLatexImg,
          optionDLatexImg,
          questionParts,
          optionAParts,
          optionBParts,
          optionCParts,
          optionDParts,
        };
      })
    );
    setPdfQuestions(questionsWithLatex);
    setPdfLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Test Management Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Manage and organize your assessment tests
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Tests</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl">
                  <ChartBarIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Online</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.online}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl">
                  <CheckCircleIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Drafted</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.drafted}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl">
                  <DocumentTextIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.completed}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl">
                  <ClockIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-2 mb-8 border border-white/20 shadow-lg">
            <div className="flex space-x-2">
              <button
                className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all duration-200 ${
                  activeTab === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All Tests ({stats.total})
              </button>
              <button
                className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all duration-200 ${
                  activeTab === 'drafted'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('drafted')}
              >
                Drafted ({stats.drafted})
              </button>
              <button
                className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all duration-200 ${
                  activeTab === 'online'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('online')}
              >
                Online ({stats.online})
              </button>
            </div>
          </div>
          {/* Tests Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {activeTab === 'all' ? 'All Tests' : activeTab === 'drafted' ? 'Drafted Tests' : 'Online Tests'}
              </h2>
              <div className="text-sm text-gray-600">
                Showing {paginatedTests.length} of {filteredTests.length} tests
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-center mb-4 p-4 bg-red-50 rounded-2xl">{error}</div>
            )}
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {paginatedTests.length > 0 ? (
                  paginatedTests.map((test: any) => (
                    <div
                      key={test.id}
                      className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      {/* Test Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{test.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <DocumentTextIcon className="h-4 w-4" />
                              <span>
                                Questions: {test.questions?.length || 0}
                                {test.totalQuestions > 0 && ` / ${test.totalQuestions}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            test.online 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {test.online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      {/* Test Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50/50 rounded-xl">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Start Date</span>
                          <p className="text-gray-800 font-medium">
                            {test.start ? formatDate(test.start) : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">End Date</span>
                          <p className="text-gray-800 font-medium">
                            {test.end ? formatDate(test.end) : '-'}
                          </p>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm"
                          onClick={() => setSelectDialogOpen(test.id)}
                          disabled={actionLoading === test.id}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Select
                        </button>
                        
                        <button
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm"
                          onClick={() => handlePreviewQuestions(test)}
                          disabled={!test.questions || test.questions.length === 0 || actionLoading === test.id}
                        >
                          <EyeIcon className="h-4 w-4" />
                          Preview
                        </button>
                        
                        <button
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm"
                          onClick={() => router.push(`/assessment-question-bank/assessments/edit-test?id=${test.id}`)}
                          disabled={actionLoading === test.id}
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </button>
                        
                        <button
                          className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm ${
                            test.online
                              ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                              : 'bg-green-50 hover:bg-green-100 text-green-700'
                          }`}
                          onClick={() => handleToggleOnline(test.id, test.online)}
                          disabled={actionLoading === test.id}
                        >
                          {actionLoading === test.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                          ) : test.online ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                          {test.online ? 'Offline' : 'Online'}
                        </button>
                        
                        <button
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm"
                          onClick={() => handleGeneratePDF(test)}
                          disabled={actionLoading === test.id}
                        >
                          {actionLoading === test.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                          ) : (
                            <DocumentArrowDownIcon className="h-4 w-4" />
                          )}
                          PDF
                        </button>
                        
                        <button
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm"
                          onClick={() => setConfirmDeleteId(test.id)}
                          disabled={actionLoading === test.id}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                      {/* Question Selection Dialog for this test */}
                      {selectDialogOpen === test.id && (
                        <QuestionSelectionDialog
                          open={true}
                          onClose={() => setSelectDialogOpen(null)}
                          onUpdate={async (selected: string[]) => {
                            setSelectedQuestions((prev) => ({
                              ...prev,
                              [test.id]: selected,
                            }));
                            setSelectDialogOpen(null);
                            // Refresh the test data to show updated question count
                            await refreshTestData(test.id);
                          }}
                          initialSelected={selectedQuestions[test.id] || []}
                          schoolId={userSchoolId}
                          testId={doc(db, "test", test.id)}
                          onRefreshTest={() => refreshTestData(test.id)}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No tests found
                    </h3>
                    <p className="text-gray-500">
                      {allTests.length === 0
                        ? "Create your first test to get started"
                        : "Tests may be filtered by school or online status"
                      }
                    </p>
                    {allTests.length > 0 && (
                      <div className="mt-4 text-xs text-gray-400">
                        <p>Debug info: Total tests: {allTests.length}, User school: {userSchoolId || 'Not set'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                className="px-6 py-3 rounded-xl font-semibold bg-white/80 backdrop-blur-sm text-gray-700 border border-white/20 hover:bg-white/90 disabled:opacity-50 transition-all duration-200 hover:scale-105 shadow-lg"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="px-4 py-3 bg-white/80 backdrop-blur-sm rounded-xl text-gray-700 font-semibold border border-white/20 shadow-lg">
                Page {page} of {totalPages}
              </span>
              <button
                className="px-6 py-3 rounded-xl font-semibold bg-white/80 backdrop-blur-sm text-gray-700 border border-white/20 hover:bg-white/90 disabled:opacity-50 transition-all duration-200 hover:scale-105 shadow-lg"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Test Preview Dialog */}
        {previewDialogOpen && (
          <TestPreviewDialog
            open={true}
            onClose={() => setPreviewDialogOpen(null)}
            questions={previewQuestions}
            testId={previewDialogOpen}
            onRefreshTest={() => refreshTestData(previewDialogOpen)}
          />
        )}
        </div>
      </main>
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md relative border border-white/20 flex flex-col items-center">
            <div className="p-4 bg-red-50 rounded-2xl mb-6">
              <TrashIcon className="h-12 w-12 text-red-500 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Delete Test?
            </h2>
            <p className="text-gray-600 mb-8 text-center">
              Are you sure you want to delete this test? This action cannot be undone.
            </p>
            <div className="flex gap-4 w-full">
              <button
                className="flex-1 px-6 py-3 rounded-2xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 hover:scale-105"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 rounded-2xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={actionLoading === confirmDeleteId}
              >
                {actionLoading === confirmDeleteId ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                ) : (
                  <TrashIcon className="h-5 w-5" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Prepare PDF Dialog */}
      {preparePdfTest && (
        <Dialog
          open={!!preparePdfTest}
          onClose={() => setPreparePdfTest(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative border border-blue-100 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4">
              Download PDF for {preparePdfTest.name}
            </h2>
            {pdfLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>{" "}
                Preparing PDF...
              </div>
            ) : (
              <PDFDownloadButton questions={pdfQuestions} viewYear={2024} />
            )}
            <button
              className="mt-4 px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
              onClick={() => setPreparePdfTest(null)}
            >
              Close
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
