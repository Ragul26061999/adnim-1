"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, DocumentReference } from "firebase/firestore";
import { db } from "../../../lib/firebaseClient";
import { useAuth } from "../../contexts/AuthContext";
import LearningManagementSidebar from "../components/LearningManagementSidebar";
import DiaryForm from "../../components/forms/DiaryForm";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrash,
  faBookOpen,
  faExclamationTriangle,
  faCalendarAlt,
  faUser,
  faGraduationCap,
  faComments,
  faClipboard,
  faSearch,
  faFileAlt,
  faUserCheck,
  faCalendarCheck,
  faChartLine,
  faBook,
  faUsers,
  faFilter,
  faSort,
  faTimes,
  faChevronDown,
  faEllipsisVertical
} from "@fortawesome/free-solid-svg-icons";

interface HomeworkEntry {
  id: string;
  type: "homework";
  title: string;
  description: string;
  workToDo: string;
  dueDate: any;
  priority: string;
  metadata: {
    estimatedTime?: string;
    difficulty?: string;
  };
  classId: DocumentReference;
  subjectId: DocumentReference;
  attachments?: any[];
  createdAt: any;
  updatedAt?: any;
}

interface RemarkEntry {
  id: string;
  type: "remark";
  studentId: DocumentReference;
  personalRemarks: string;
  workRemarks?: string;
  parentRemarks?: string;
  priority: string;
  category: string;
  tags?: string[];
  visibleToParents: boolean;
  visibleToStudent: boolean;
  followUpRequired: boolean;
  followUpDate?: any;
  classId: DocumentReference;
  subjectId?: DocumentReference;
  attachments?: any[];
  createdAt: any;
  updatedAt?: any;
}

type DiaryEntry = HomeworkEntry | RemarkEntry;

type DiaryEntryWithDetails = DiaryEntry & {
  className: string;
  subjectName: string;
  studentName?: string;
};

const PRIORITY_COLORS = {
  high: { 
    primary: "#D32F2F", 
    container: "#FFEBEE", 
    onContainer: "#B71C1C",
    surface: "#FCE4EC"
  },
  medium: { 
    primary: "#F57C00", 
    container: "#FFF3E0", 
    onContainer: "#E65100",
    surface: "#FFF8E1"
  },
  low: { 
    primary: "#388E3C", 
    container: "#E8F5E8", 
    onContainer: "#1B5E20",
    surface: "#F1F8E9"
  }
};

const CATEGORY_ICONS = {
  academic: faGraduationCap,
  behavior: faUserCheck,
  attendance: faCalendarCheck,
  performance: faChartLine
};

export default function DiaryManagementPage() {
  const { schoolId, loading: authLoading } = useAuth();
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "homework" | "remark">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "medium" | "low">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!authLoading) {
      if (schoolId) {
        fetchDiaryEntries();
      } else {
        setError("School ID not found. Please ensure you're logged in as a school administrator.");
        setLoading(false);
      }
    }
  }, [schoolId, authLoading]);

  const fetchDiaryEntries = async () => {
    if (!schoolId) return;

    setLoading(true);
    setError("");
    
    try {
      // Fetch homework entries
      const homeworkQuery = query(
        collection(db, "homeworks"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const homeworkSnapshot = await getDocs(homeworkQuery);
      
      // Fetch remark entries
      const remarkQuery = query(
        collection(db, "remarks"),
        where("schoolId", "==", doc(db, "school", schoolId))
      );
      const remarkSnapshot = await getDocs(remarkQuery);

      const allEntries = [
        ...homeworkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "homework" as const })),
        ...remarkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "remark" as const }))
      ];

      const entryPromises = allEntries.map(async (entryData: any) => {
        const entry = entryData as DiaryEntry;

        // Fetch class name
        let className = "Unknown Class";
        try {
          if (entry.classId) {
            const classDoc = await getDoc(entry.classId);
            if (classDoc.exists()) {
              const classData = classDoc.data();
              className = classData?.name || "Unknown Class";
            }
          }
        } catch (error) {
          console.error("Error fetching class name:", error);
        }

        // Fetch subject name
        let subjectName = "Unknown Subject";
        try {
          if (entry.subjectId) {
            const subjectDoc = await getDoc(entry.subjectId);
            if (subjectDoc.exists()) {
              const subjectData = subjectDoc.data();
              subjectName = subjectData?.name || "Unknown Subject";
            }
          }
        } catch (error) {
          console.error("Error fetching subject name:", error);
        }

        // Fetch student name for remarks
        let studentName = "";
        if (entry.type === "remark") {
          try {
            const studentDoc = await getDoc(entry.studentId);
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              studentName = studentData?.name || studentData?.email || "Unknown Student";
            }
          } catch (error) {
            console.error("Error fetching student name:", error);
          }
        }

        return {
          ...entry,
          className,
          subjectName,
          studentName,
        };
      });

      const entriesWithDetails = await Promise.all(entryPromises);
      
      // Sort by created date (newest first)
      entriesWithDetails.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setDiaryEntries(entriesWithDetails);
    } catch (error) {
      console.error("Error fetching diary entries:", error);
      setError("Failed to load diary entries. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string, entryType: string) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    try {
      const collectionName = entryType === "homework" ? "homeworks" : "remarks";
      await deleteDoc(doc(db, collectionName, entryId));
      setDiaryEntries(diaryEntries.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error("Error deleting entry:", error);
      setError("Failed to delete entry");
    }
  };

  const handleEditEntry = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntry(null);
    fetchDiaryEntries();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    return date.toDate ? date.toDate().toLocaleDateString() : "N/A";
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium;
  };

  const filteredEntries = diaryEntries.filter(entry => {
    const matchesSearch = (
      (entry.type === "homework" && (
        (entry.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (entry.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (entry.workToDo?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      )) ||
      (entry.type === "remark" && (
        (entry.personalRemarks?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (entry.workRemarks?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (entry.parentRemarks?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (entry.studentName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      ))
    ) || (entry.className?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (entry.subjectName?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || entry.type === filterType;
    const matchesPriority = filterPriority === "all" || entry.priority === filterPriority;

    return matchesSearch && matchesType && matchesPriority;
  });

  const getStats = () => {
    const total = diaryEntries.length;
    const homework = diaryEntries.filter(entry => entry.type === "homework").length;
    const remarks = diaryEntries.filter(entry => entry.type === "remark").length;
    const highPriority = diaryEntries.filter(entry => entry.priority === "high").length;
    
    return { total, homework, remarks, highPriority };
  };

  const stats = getStats();

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mx-auto mb-4 animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show error if no school ID
  if (!schoolId) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
        <LearningManagementSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-red-200 rounded-3xl p-8 text-center shadow-lg backdrop-blur-sm">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You don't have permission to access this page. Please ensure you're logged in as a school administrator.
              </p>
              <button
                onClick={() => window.location.href = "/login"}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 hover:shadow-lg transform hover:scale-105"
              >
                Go to Login
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <LearningManagementSidebar />
      
      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FontAwesomeIcon icon={faClipboard} className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
                  Diary Management
                </h1>
                <p className="text-gray-600 text-lg">Manage homework assignments and student remarks</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <FontAwesomeIcon icon={faPlus} className="text-lg group-hover:rotate-90 transition-transform duration-300" />
              <span>Add Entry</span>
            </button>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { 
                label: "Total Entries", 
                value: stats.total, 
                icon: faClipboard, 
                color: "blue",
                gradient: "from-blue-500 to-indigo-600"
              },
              { 
                label: "Homework", 
                value: stats.homework, 
                icon: faBookOpen, 
                color: "green",
                gradient: "from-green-500 to-emerald-600"
              },
              { 
                label: "Remarks", 
                value: stats.remarks, 
                icon: faComments, 
                color: "purple",
                gradient: "from-purple-500 to-violet-600"
              },
              { 
                label: "High Priority", 
                value: stats.highPriority, 
                icon: faExclamationTriangle, 
                color: "red",
                gradient: "from-red-500 to-rose-600"
              }
            ].map((stat, index) => (
              <div 
                key={stat.label}
                className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-xl p-6 transition-all duration-300 hover:scale-105 border border-white/50"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-r ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
                    <FontAwesomeIcon icon={stat.icon} className="text-white text-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Search and Filter */}
          <div className="mb-8 bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm p-6 border border-white/50">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200">
                  <FontAwesomeIcon icon={faSearch} />
                </div>
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                />
              </div>
              
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-3 rounded-2xl font-medium flex items-center gap-2 transition-all duration-200 ${
                  showFilters 
                    ? 'bg-indigo-100 text-indigo-700 shadow-inner' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faFilter} className={`transition-transform duration-200 ${showFilters ? 'rotate-12' : ''}`} />
                Filters
                <FontAwesomeIcon 
                  icon={faChevronDown} 
                  className={`text-sm transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} 
                />
              </button>
            </div>

            {/* Expandable Filters */}
            <div className={`overflow-hidden transition-all duration-300 ${showFilters ? 'mt-4 max-h-40' : 'max-h-0'}`}>
              <div className="flex flex-wrap gap-4">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Types</option>
                  <option value="homework">Homework</option>
                  <option value="remark">Remarks</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
                
                {/* Clear Filters */}
                {(filterType !== "all" || filterPriority !== "all" || searchTerm) && (
                  <button
                    onClick={() => {
                      setFilterType("all");
                      setFilterPriority("all");
                      setSearchTerm("");
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors duration-200 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-sm" />
                </div>
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchDiaryEntries()}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mx-auto mb-4 animate-spin"></div>
                <p className="text-gray-600 font-medium">Loading diary entries...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Enhanced Entries Grid */}
              {filteredEntries.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FontAwesomeIcon icon={faClipboard} className="text-gray-400 text-3xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No entries found</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    {searchTerm || filterType !== "all" || filterPriority !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Create your first diary entry to get started"}
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-medium flex items-center gap-3 mx-auto transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Entry
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEntries.map((entry, index) => {
                    const priorityColors = getPriorityColor(entry.priority);
                    
                    return (
                      <div 
                        key={entry.id}
                        className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/50 hover:scale-105"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Enhanced Entry Header */}
                        <div 
                          className="p-6 border-b border-gray-100 relative overflow-hidden"
                          style={{ backgroundColor: priorityColors.container }}
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                          
                          <div className="flex items-center justify-between relative">
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-300"
                              >
                                <FontAwesomeIcon 
                                  icon={entry.type === "homework" ? faBookOpen : faComments}
                                  className="text-xl"
                                  style={{ color: priorityColors.primary }}
                                />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                  {entry.type === "homework" ? "Homework" : "Remark"}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <div
                                    className="w-3 h-3 rounded-full shadow-sm"
                                    style={{ backgroundColor: priorityColors.primary }}
                                  ></div>
                                  <span className="text-sm font-medium" style={{ color: priorityColors.onContainer }}>
                                    {entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1)} Priority
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 bg-white/50 px-3 py-1 rounded-full">
                              {formatDate(entry.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6">
                          {/* Enhanced Content */}
                          <div className="mb-6">
                            {entry.type === "homework" ? (
                              <div>
                                <h4 className="font-bold text-gray-900 mb-3 text-lg leading-tight">
                                  {entry.title}
                                </h4>
                                <p className="text-gray-600 line-clamp-2 mb-4">
                                  {entry.description}
                                </p>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-600 text-xs" />
                                    </div>
                                    <span className="text-gray-600">Due: {formatDate(entry.dueDate)}</span>
                                  </div>
                                  {entry.metadata?.estimatedTime && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <div className="w-5 h-5 bg-green-100 rounded-lg flex items-center justify-center">
                                        <FontAwesomeIcon icon={faUser} className="text-green-600 text-xs" />
                                      </div>
                                      <span className="text-gray-600">Time: {entry.metadata.estimatedTime}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <FontAwesomeIcon 
                                      icon={CATEGORY_ICONS[entry.category as keyof typeof CATEGORY_ICONS]} 
                                      className="text-purple-600 text-sm"
                                    />
                                  </div>
                                  <span className="font-medium text-gray-900">
                                    {entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}
                                  </span>
                                </div>
                                <p className="text-gray-700 line-clamp-3 mb-4 leading-relaxed">
                                  {entry.personalRemarks}
                                </p>
                                {entry.studentName && (
                                  <div className="flex items-center gap-2 text-sm mb-3">
                                    <div className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center">
                                      <FontAwesomeIcon icon={faUser} className="text-indigo-600 text-xs" />
                                    </div>
                                    <span className="text-gray-600">Student: {entry.studentName}</span>
                                  </div>
                                )}
                                {entry.tags && entry.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {entry.tags.slice(0, 3).map((tag: string, index: number) => (
                                      <span key={index} className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                                        {tag}
                                      </span>
                                    ))}
                                    {entry.tags.length > 3 && (
                                      <span className="bg-gray-50 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
                                        +{entry.tags.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Enhanced Details */}
                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl">
                              <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <FontAwesomeIcon icon={faUsers} className="text-indigo-600 text-sm" />
                              </div>
                              <span className="text-gray-700 font-medium">{entry.className}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl">
                              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                                <FontAwesomeIcon icon={faBook} className="text-green-600 text-sm" />
                              </div>
                              <span className="text-gray-700 font-medium">{entry.subjectName}</span>
                            </div>
                          </div>

                          {/* Enhanced Attachments */}
                          {entry.attachments && entry.attachments.length > 0 && (
                            <div className="mb-6 p-3 bg-blue-50/50 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                                  <FontAwesomeIcon icon={faFileAlt} className="text-blue-600 text-sm" />
                                </div>
                                <span className="text-blue-700 font-medium">
                                  {entry.attachments.length} attachment{entry.attachments.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Enhanced Actions */}
                          <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button
                              onClick={() => handleEditEntry(entry)}
                              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-2xl font-medium transition-all duration-200 flex items-center justify-center gap-2 group hover:scale-105"
                            >
                              <FontAwesomeIcon icon={faEdit} className="group-hover:rotate-12 transition-transform duration-200" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id, entry.type)}
                              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-3 rounded-2xl font-medium transition-all duration-200 flex items-center justify-center gap-2 group hover:scale-105"
                            >
                              <FontAwesomeIcon icon={faTrash} className="group-hover:scale-110 transition-transform duration-200" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Enhanced Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl transform animate-in zoom-in-95 duration-300">
            <DiaryForm
              entryId={editingEntry?.id}
              initialData={editingEntry}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 lg:hidden w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-40"
      >
        <FontAwesomeIcon icon={faPlus} className="text-xl" />
      </button>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes zoom-in-95 {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: animate-in 0.3s ease-out;
        }
        
        .fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .zoom-in-95 {
          animation: zoom-in-95 0.3s ease-out;
        }
        
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #6366f1, #8b5cf6);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #4f46e5, #7c3aed);
        }
        
        /* Glass morphism effect */
        .backdrop-blur-sm {
          backdrop-filter: blur(8px);
        }
        
        /* Ripple effect for buttons */
        .group:active::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transform: translate(-50%, -50%);
          animation: ripple 0.6s ease-out;
        }
        
        @keyframes ripple {
          to {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}