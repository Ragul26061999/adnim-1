"use client";
import React, { useEffect, useState } from "react";
import ContentSidebar from "../../components/ContentSidebar";
import { db } from "../../../../lib/firebaseClient";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { auth } from "../../../../components/firebase";

export default function NotesManagement() {
  // All useState declarations (MUST be at the top)
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  // Subjects for main page filter
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  // Subjects for upload modal filter
  const [uploadSubjects, setUploadSubjects] = useState<any[]>([]);
  const [loadingUploadSubjects, setLoadingUploadSubjects] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Filter state
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  // Client-only render guard
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  // All useEffect hooks below here


  // Fetch classes for the logged-in user's school (always on mount)
  useEffect(() => {
    async function fetchClasses() {
      setLoadingClasses(true);
      try {
        const user = auth.currentUser;
        if (!user) return;
        // Fetch user doc to get schoolId
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const schoolID = userSnap.exists() ? userSnap.data().schoolId : null;
        if (!schoolID) return;
        const q = query(collection(db, "classes"), where("schoolId", "==", schoolID));
        const snap = await getDocs(q);
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {}
      setLoadingClasses(false);
    }
    fetchClasses();
  }, []);

  // Fetch subjects for the main page filter
  useEffect(() => {
    async function fetchSubjectsForMainPage() {
      setLoadingSubjects(true);
      try {
        if (!filterClass) {
          setSubjects([]);
          setLoadingSubjects(false);
          return;
        }
        const classRef = doc(db, "classes", filterClass);
        const q = query(
          collection(db, "subjects"),
          where("assClass", "array-contains", classRef)
        );
        const snap = await getDocs(q);
        setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {}
      setLoadingSubjects(false);
    }
    fetchSubjectsForMainPage();
  }, [filterClass]);

  // Fetch subjects for the upload modal filter
  useEffect(() => {
    async function fetchSubjectsForUploadModal() {
      setLoadingUploadSubjects(true);
      try {
        if (!selectedClass) {
          setUploadSubjects([]);
          setLoadingUploadSubjects(false);
          return;
        }
        const classRef = doc(db, "classes", selectedClass);
        const q = query(
          collection(db, "subjects"),
          where("assClass", "array-contains", classRef)
        );
        const snap = await getDocs(q);
        setUploadSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {}
      setLoadingUploadSubjects(false);
    }
    fetchSubjectsForUploadModal();
  }, [selectedClass]);

  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      setError(null);
      try {
        // Fetch user doc to get schoolId
        const user = auth.currentUser;
        if (!user) return;
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const schoolID = userSnap.exists() ? userSnap.data().schoolId : null;
        if (!schoolID) return;

        // Fetch notes (contents where video == false and schoolID matches)
        const q = query(
          collection(db, "contents"),
          where("video", "==", false),
          where("schoolID", "==", schoolID)
        );
        const snap = await getDocs(q);
        const notesData = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const d = docSnap.data();
            let className = "";
            if (d.classId) {
              try {
                const classSnap = await getDoc(d.classId);
                className = classSnap.exists() ? (classSnap.data() as any).name || "" : "";
              } catch {}
            }
            let subjectName = "";
            if (d.subjectId) {
              try {
                const subjectSnap = await getDoc(d.subjectId);
                subjectName = subjectSnap.exists() ? (subjectSnap.data() as any).name || "" : "";
              } catch {}
            }
            return {
              id: docSnap.id,
              title: d.title,
              description: d.description,
              className,
              subjectName,
              downloadUrl: d.url || "#"
            };
          })
        );
        setNotes(notesData);
      } catch (e) {
        setError("Failed to fetch notes.");
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, []);

  async function handleUpload() {
    setUploadError(null);
    if (!title || !description || !selectedClass || !selectedSubject || !file) {
      setUploadError("Please fill all fields and select a file.");
      return;
    }
    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) throw new Error("User doc not found");
      const schoolID = userSnap.data().schoolId;
      const storageMod = await import("firebase/storage");
      const { ref, uploadBytes, getDownloadURL } = storageMod;
      const storageRef = ref(
        (await import("../../../../components/firebase")).storage,
        `notes/${user.uid}/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const { addDoc, serverTimestamp } = await import("firebase/firestore");
      await addDoc(collection(db, "contents"), {
        title,
        description,
        url,
        createdBy: doc(db, "users", user.uid),
        createdAt: serverTimestamp(),
        classId: doc(db, "classes", selectedClass),
        subjectId: doc(db, "subjects", selectedSubject),
        schoolID,
        video: false
      });
      setShowModal(false);
      setTitle("");
      setDescription("");
      setSelectedClass("");
      setSelectedSubject("");
      setFile(null);
      // Restore fetchNotes after upload to use the same query (no orderBy)
      (async function fetchNotes() {
        setLoading(true);
        setError(null);
        try {
          const q = query(
            collection(db, "contents"),
            where("video", "==", false)
          );
          const snap = await getDocs(q);
          const notesData = await Promise.all(
            snap.docs.map(async (docSnap) => {
              const d = docSnap.data();
              let className = "";
              if (d.classId) {
                try {
                  const classSnap = await getDoc(d.classId);
                  className = classSnap.exists() ? (classSnap.data() as any).name || "" : "";
                } catch {}
              }
              let subjectName = "";
              if (d.subjectId) {
                try {
                  const subjectSnap = await getDoc(d.subjectId);
                  subjectName = subjectSnap.exists() ? (subjectSnap.data() as any).name || "" : "";
                } catch {}
              }
              return {
                id: docSnap.id,
                title: d.title,
                description: d.description,
                className,
                subjectName,
                downloadUrl: d.url || "#"
              };
            })
          );
          setNotes(notesData);
        } catch (e) {
          setError("Failed to fetch notes.");
        } finally {
          setLoading(false);
        }
      })();
    } catch (e: any) {
      setUploadError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }


  // Now, after all state and effects are declared, compute filteredNotes
  const filteredNotes = notes.filter((note: any) => {
    if (filterClass && note.className !== (classes.find((c: any) => c.id === filterClass)?.name || "")) return false;
    if (filterSubject && note.subjectName !== (subjects.find((s: any) => s.id === filterSubject)?.name || "")) return false;
    return true;
  });

  // Prevent hydration mismatch: only render after client mount
  if (!hasMounted) return null;

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <ContentSidebar />
      <main className="flex-1 bg-gray-50 p-10">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">Notes Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Notes Count */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow flex flex-col items-center border border-gray-100">
            <div className="text-4xl font-bold text-blue-700 mb-2">{loading ? "-" : filteredNotes.length}</div>
            <div className="text-gray-600">Total Notes Uploaded</div>
          </div>
          {/* Upload New Notes */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow flex flex-col items-center border border-gray-100">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow hover:bg-blue-700 transition text-lg mb-2" onClick={() => setShowModal(true)}>Upload New Notes</button>
            <div className="text-gray-600">Upload PDF or document notes for your classes.</div>
          </div>
        </div>
        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <select
            value={filterClass}
            onChange={e => {
              setFilterClass(e.target.value);
              setFilterSubject(""); // Reset subject filter when class changes
            }}
            className="border rounded px-3 py-2"
            disabled={loadingClasses}
          >
            <option value="">All Classes</option>
            {/* Only show classes belonging to the user's school (already filtered in classes state) */}
            {classes.map((cls: any) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          {/* Subject filter only appears after a class is selected */}
          {filterClass && (
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="border rounded px-3 py-2"
              disabled={!filterClass || loadingSubjects}
            >
              <option value="">All Subjects</option>
              {subjects.length === 0 && <option disabled>No subjects found for this class</option>}
              {subjects.map((sub: any) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          )}

        </div>
        {/* Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm overflow-auto">
            <div className="relative w-full max-w-2xl mx-auto p-0">
              <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-100 p-0 flex flex-col animate-fadeIn overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-2">
                  <h2 className="text-2xl font-bold text-gray-800">Upload Files</h2>
                  <button
                    className="bg-white/70 hover:bg-gray-100 text-blue-500 rounded-full p-2 shadow-md border border-gray-200 transition"
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                  >
                    <svg width="1.5em" height="1.5em" viewBox="0 0 24 24"><path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>
                  </button>
                </div>
                {/* File Upload Area */}
                <div className="px-8 pt-2 pb-6 overflow-y-auto">
                  <div className="w-full bg-gray-50/80 border-2 border-dashed border-blue-100 rounded-2xl flex flex-col items-center justify-center py-8 mb-6 shadow-sm">
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" className="mb-2 text-blue-300"><path fill="currentColor" d="M12 16v-8m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <div className="text-gray-500 text-lg mb-2">Drop files to upload or click</div>
                    <label className="inline-block">
                      <input type="file" accept="application/pdf,.doc,.docx" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                      <span className="inline-block bg-blue-100 text-blue-700 font-semibold px-6 py-2 rounded-xl shadow hover:bg-blue-200 hover:text-blue-800 transition cursor-pointer">Upload Files</span>
                    </label>
                    {file && <div className="mt-2 text-blue-600 font-semibold">{file.name}</div>}
                  </div>
                  {/* Details Section (no tabs) */}
                  <div className="mb-6">
                    <div className="text-blue-700 font-bold text-lg mb-2">Details</div>
                  </div>
                  {/* Form Fields */}
                  <form className="flex flex-col gap-6">
                    {/* Class/Subject Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Upload Modal Class Dropdown */}
                      <div className="relative">
                        <select
                          value={selectedClass}
                          onChange={e => {
                            setSelectedClass(e.target.value);
                            setSelectedSubject(""); // Reset subject when class changes
                          }}
                          className="border rounded px-3 py-2 w-full"
                          disabled={loadingClasses}
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls: any) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                      {/* Upload Modal Subject Dropdown */}
                      <div className="relative">
                        {selectedClass && (
                          <select
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                            className="border rounded px-3 py-2 w-full"
                            disabled={!selectedClass || loadingUploadSubjects}
                          >
                            <option value="">Select Subject</option>
                            {uploadSubjects.length === 0 && <option disabled>No subjects found for this class</option>}
                            {uploadSubjects.map((sub: any) => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        )}
                      </div>

                    </div>
                    {/* Title */}``
                    <div className="relative">
                      <label className="block text-gray-700 font-semibold mb-1">Title</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50/80 backdrop-blur border border-blue-100 rounded-xl px-5 py-3 text-base font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow"
                        placeholder="Title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    {/* Description */}
                    <div className="relative">
                      <label className="block text-gray-700 font-semibold mb-1">Description</label>
                      <textarea
                        className="w-full bg-gray-50/80 backdrop-blur border border-blue-100 rounded-xl px-5 py-3 text-base font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow min-h-[90px]"
                        placeholder="Description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                      />
                    </div>
                    {/* Action Buttons */}
                    <div className="flex flex-wrap justify-end gap-4 mt-2">
                      <button type="button" className="text-blue-400 font-semibold px-6 py-2 rounded-xl hover:bg-blue-50 transition" onClick={() => setShowModal(false)}>Cancel</button>
                      <button
                        type="button"
                        className="bg-gradient-to-r from-blue-500 to-blue-300 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-400 transition disabled:opacity-60"
                        disabled={uploading}
                        onClick={handleUpload}
                      >
                        {uploading ? "Uploading..." : "Upload this file"}
                      </button>
                    </div>
                  </form>
                  {uploadError && <div className="text-red-500 text-sm mt-2">{uploadError}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Notes List */}
        {loading ? (
          <div className="text-center text-gray-400 text-lg">Loading notes...</div>
        ) : error ? (
          <div className="text-center text-red-500 text-lg">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNotes.length === 0 ? (
              <div className="col-span-3 text-center text-gray-400 text-lg">No notes found for the selected filter.</div>
            ) : (
              filteredNotes.map(note => (
                <div key={note.id} className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow flex flex-col border border-gray-100">
                  <div className="font-bold text-lg text-blue-800 mb-1">{note.title}</div>
                  <div className="text-gray-600 mb-2">{note.description}</div>
                  <div className="flex gap-4 mb-4">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">{note.className}</span>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">{note.subjectName}</span>
                  </div>
                  {/* Download and Delete buttons in one row */}
                  <div className="flex gap-3 mt-auto">
                    <a
                      href={note.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-600 transition text-center"
                    >
                      Download
                    </a>
                    <button
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-semibold shadow hover:bg-red-200 transition text-center border border-red-200"
                      style={{ color: '#d9534f' }}
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete the note: ${note.title}?`)) {
                          try {
                            const { deleteDoc } = await import("firebase/firestore");
                            await deleteDoc(doc(db, "contents", note.id));
                            setNotes(notes => notes.filter(n => n.id !== note.id));
                          } catch (e) {
                            alert("Failed to delete note.");
                          }
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
} 