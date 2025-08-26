"use client";
import React, { useEffect, useState } from "react";
import ContentSidebar from "../../components/ContentSidebar";
import { db } from "../../../../lib/firebaseClient";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth } from "../../../../components/firebase";

export default function VideoManagement() {
  // State declarations
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Upload form state (placeholder)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  // Subjects for main page filter
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  // Subjects for upload modal filter
  const [uploadSubjects, setUploadSubjects] = useState<any[]>([]);
  const [loadingUploadSubjects, setLoadingUploadSubjects] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  // Uploading state for modal
  const [uploading, setUploading] = useState(false);
  // Filter state
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  // Client-only render guard
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  // Fetch classes for the logged-in user's school (on mount)
  useEffect(() => {
    async function fetchClasses() {
      setLoadingClasses(true);
      try {
        const user = auth.currentUser;
        if (!user) return;
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

  // Fetch videos for the user's school
  useEffect(() => {
    async function fetchVideos() {
      setLoading(true);
      setError(null);
      try {
        const user = auth.currentUser;
        if (!user) return;
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const schoolID = userSnap.exists() ? userSnap.data().schoolId : null;
        if (!schoolID) return;
        // Fetch videos (contents where video == true and schoolID matches)
        const q = query(
          collection(db, "contents"),
          where("video", "==", true),
          where("schoolID", "==", schoolID)
        );
        const snap = await getDocs(q);
        const videosData = await Promise.all(
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
              videoUrl: d.url || "#"
            };
          })
        );
        setVideos(videosData);
      } catch (e) {
        setError("Failed to fetch videos.");
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  // Filtered videos
  const filteredVideos = videos.filter((video: any) => {
    if (filterClass && video.className !== (classes.find((c: any) => c.id === filterClass)?.name || "")) return false;
    if (filterSubject && video.subjectName !== (subjects.find((s: any) => s.id === filterSubject)?.name || "")) return false;
    return true;
  });

  // Prevent hydration mismatch: only render after client mount
  if (!hasMounted) return null;

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <ContentSidebar />
      <main className="flex-1 bg-gray-50 p-10">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">Video Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Videos Count */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow flex flex-col items-center border border-gray-100">
            <div className="text-4xl font-bold text-blue-700 mb-2">{loading ? "-" : filteredVideos.length}</div>
            <div className="text-gray-600">Total Videos Uploaded</div>
          </div>
          {/* Upload New Video */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow flex flex-col items-center border border-gray-100">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow hover:bg-blue-700 transition text-lg mb-2" onClick={() => setShowModal(true)}>Upload New Video</button>
            <div className="text-gray-600">Upload video lectures for your classes.</div>
          </div>
        </div>
        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <select
            value={filterClass}
            onChange={e => {
              setFilterClass(e.target.value);
              setFilterSubject("");
            }}
            className="border rounded px-3 py-2"
            disabled={loadingClasses}
          >
            <option value="">All Classes</option>
            {classes.map((cls: any) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          {filterClass && (
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="border rounded px-3 py-2"
              disabled={loadingSubjects}
            >
              <option value="">All Subjects</option>
              {subjects.length === 0 && <option disabled>No subjects found for this class</option>}
              {subjects.map((sub: any) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          )}
        </div>
        {/* Videos List */}
        <div>
          {loading ? (
            <div className="text-center text-gray-500">Loading videos...</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center text-gray-500">No videos found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredVideos.map((video: any) => (
                <div key={video.id} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3 border border-gray-100">
                  <div className="font-bold text-blue-700 text-lg">{video.title}</div>
                  <div className="text-gray-600">{video.description}</div>
                  <div className="text-gray-500 text-sm">Class: <span className="font-medium">{video.className}</span></div>
                  <div className="text-gray-500 text-sm">Subject: <span className="font-medium">{video.subjectName}</span></div>
                  <div>
                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View/Download Video</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                type="button"
                aria-label="Close"
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none z-30"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex flex-col items-center justify-center z-20">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <div className="text-blue-700 font-semibold">Uploading...</div>
                </div>
              )}
              <div className="text-xl font-bold mb-4">Upload New Video</div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!title || !description || !selectedClass || !selectedSubject || (!file && !youtubeUrl)) {
                    alert("Please fill all required fields and either upload a video file or provide a YouTube URL.");
                    return;
                  }
                  setUploading(true);
                  try {
                    const user = auth.currentUser;
                    if (!user) throw new Error("User not logged in");
                    const userSnap = await getDoc(doc(db, "users", user.uid));
                    if (!userSnap.exists()) throw new Error("User doc not found");
                    const schoolID = userSnap.data().schoolId;
                    let url = youtubeUrl;
                    
                    if (file) {
                      const storageMod = await import("firebase/storage");
                      const { ref, uploadBytes, getDownloadURL } = storageMod;
                      const storageRef = ref(
                        (await import("../../../../components/firebase")).storage,
                        `videos/${user.uid}/${Date.now()}_${file.name}`
                      );
                      await uploadBytes(storageRef, file);
                      url = await getDownloadURL(storageRef);
                    }
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
                      video: true
                    });
                    setShowModal(false);
                    setTitle("");
                    setDescription("");
                    setSelectedClass("");
                    setSelectedSubject("");
                    setFile(null);
                    setYoutubeUrl("");
                    // Refetch videos
                    setLoading(true);
                    const q = query(
                      collection(db, "contents"),
                      where("video", "==", true),
                      where("schoolID", "==", schoolID)
                    );
                    const snap = await getDocs(q);
                    const videosData = await Promise.all(
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
                          videoUrl: d.url || "#"
                        };
                      })
                    );
                    setVideos(videosData);
                    setLoading(false);
                  } catch (err: any) {
                    alert(err.message || "Upload failed");
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Class</label>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={selectedClass}
                    onChange={e => {
                      setSelectedClass(e.target.value);
                      setSelectedSubject("");
                    }}
                    disabled={loadingClasses}
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Subject</label>
                  {selectedClass && (
                    <select
                      className="border rounded px-3 py-2 w-full"
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
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
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Title</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Description</label>
                  <textarea
                    className="border rounded px-3 py-2 w-full"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Video Upload</label>
                  <div className="mb-2">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={e => setFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                      required={!youtubeUrl}
                    />
                  </div>
                  <div className="text-center text-gray-500 text-sm mb-2">OR</div>
                  <div>
                    <label className="block text-gray-700 mb-1">YouTube URL</label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setYoutubeUrl(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      required={!file}
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter a valid YouTube URL</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded font-semibold hover:bg-gray-300 transition"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
