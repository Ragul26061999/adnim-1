import React, { useEffect, useState } from 'react';
import { db } from '../../../lib/firebaseClient';
import { collection, query, where, getDocs, doc, Query, DocumentReference } from 'firebase/firestore';
import SenseAIPickResultsDialog from './SenseAIPickResultsDialog';

interface FilterEntity {
  id: string;
  name: string;
}

interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct?: string;
  explanation?: string;
  solution?: string;
  difficulty?: string;
  bloom?: string;
}

interface SenseAIPickDialogProps {
  open: boolean;
  onClose: () => void;
  onSenseAIPick: (selected: string[]) => void;
  classId?: string;
  testId?: DocumentReference;
  onRefreshTest?: () => Promise<void>;
}

const difficulties = ['easy', 'medium', 'hard'];
const bloomFields = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
];

const SenseAIPickDialog: React.FC<SenseAIPickDialogProps> = ({ open, onClose, onSenseAIPick, classId, testId, onRefreshTest }) => {
  const [easy, setEasy] = useState(0);
  const [medium, setMedium] = useState(0);
  const [hard, setHard] = useState(0);
  const [bloom, setBloom] = useState<{ [key: string]: number }>({});
  const [classes, setClasses] = useState<FilterEntity[]>([]);
  const [subjects, setSubjects] = useState<FilterEntity[]>([]);
  const [chapters, setChapters] = useState<FilterEntity[]>([]);
  const [lessons, setLessons] = useState<FilterEntity[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(classId || '');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(1);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedBlooms, setSelectedBlooms] = useState<string[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsQuestions, setResultsQuestions] = useState<Question[]>([]);
  const [fetching, setFetching] = useState(false);

  // Fetch classes (only sp: true)
  useEffect(() => {
    async function fetchClasses() {
      const q = query(collection(db, 'classes'), where('sp', '==', true));
      const snap = await getDocs(q);
      setClasses(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || '' })));
    }
    if (open && !classId) fetchClasses();
  }, [open, classId]);

  // Fetch subjects (using DocumentReference for classID)
  useEffect(() => {
    if (!selectedClass) { setSubjects([]); setSelectedSubject(''); return; }
    async function fetchSubjects() {
      const classRef = doc(db, 'classes', selectedClass);
      const q = query(collection(db, 'subjects'), where('classID', '==', classRef));
      const snap = await getDocs(q);
      setSubjects(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || '' })));
    }
    fetchSubjects();
  }, [selectedClass]);

  // Fetch chapters
  useEffect(() => {
    if (!selectedSubject) { setChapters([]); setSelectedChapter(''); return; }
    async function fetchChapters() {
      const q = query(collection(db, 'chapters'), where('subjectID', '==', doc(db, 'subjects', selectedSubject)));
      const snap = await getDocs(q);
      setChapters(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || '' })));
    }
    fetchChapters();
  }, [selectedSubject]);

  // Fetch lessons
  useEffect(() => {
    if (!selectedChapter) { setLessons([]); setSelectedLesson(''); return; }
    async function fetchLessons() {
      const q = query(collection(db, 'lessons'), where('chapterID', '==', doc(db, 'chapters', selectedChapter)));
      const snap = await getDocs(q);
      setLessons(snap.docs.map(doc => ({ id: doc.id, name: doc.data().title || doc.data().name || '' })));
    }
    fetchLessons();
  }, [selectedChapter]);

  // Handle difficulty changes
  const handleDifficultyChange = (diff: string) => {
    setSelectedDifficulties(prev => prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]);
  };

  // Handle bloom field changes
  const handleBloomChange = (bloom: string) => {
    setSelectedBlooms(prev => prev.includes(bloom) ? prev.filter(b => b !== bloom) : [...prev, bloom]);
  };

  // Validation
  const validate = () => {
    if (!count || count < 1) return 'Total count is required.';
    if (!selectedSubject) return 'Subject is required.';
    if (easy + medium + hard > count) return 'Sum of easy, medium, hard cannot exceed total.';
    const bloomSum = Object.values(bloom).reduce((a, b) => a + (b || 0), 0);
    if (bloomSum > count) return 'Sum of bloom fields cannot exceed total.';
    return '';
  };

  // Fetch questions by criteria
  async function fetchQuestionsByCriteria({ classId, subjectId, chapterId, lessonId, easy, medium, hard }: {
    classId: string;
    subjectId: string;
    chapterId: string;
    lessonId: string;
    easy: number;
    medium: number;
    hard: number;
  }): Promise<Question[]> {
    let q = query(collection(db, 'questionCollection'));
    if (lessonId) q = query(q, where('lessonID', '==', doc(db, 'lessons', lessonId)));
    else if (chapterId) q = query(q, where('chapterID', '==', doc(db, 'chapters', chapterId)));
    else if (subjectId) q = query(q, where('subjectID', '==', doc(db, 'subjects', subjectId)));
    if (classId) q = query(q, where('classID', '==', doc(db, 'classes', classId)));
    const snap = await getDocs(q);
    const pool: Question[] = snap.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        ...d,
        id: docSnap.id,
        question: d.questionText || d.question || '',
        optionA: d.optionA || '',
        optionB: d.optionB || '',
        optionC: d.optionC || '',
        optionD: d.optionD || '',
        correct: d.correct || '',
        explanation: d.explanation || '',
        solution: d.solution || '',
        difficulty: d.difficulty || '',
        bloom: d.bloom || '',
      };
    });
    function pickRandom<T>(arr: T[], n: number): T[] { return arr.sort(() => Math.random() - 0.5).slice(0, n); }
    const easyQs = pickRandom(pool.filter(q => (q.difficulty || '').toLowerCase() === 'easy'), easy);
    const mediumQs = pickRandom(pool.filter(q => (q.difficulty || '').toLowerCase() === 'medium'), medium);
    const hardQs = pickRandom(pool.filter(q => (q.difficulty || '').toLowerCase() === 'hard'), hard);
    return [...easyQs, ...mediumQs, ...hardQs];
  }

  const handleSenseAIPick = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setFetching(true);
    try {
      const questions = await fetchQuestionsByCriteria({
        classId: selectedClass,
        subjectId: selectedSubject,
        chapterId: selectedChapter,
        lessonId: selectedLesson,
        easy,
        medium,
        hard
      });
      setResultsQuestions(questions);
      setResultsOpen(true);
    } catch (err) {
      setError('Failed to fetch questions.');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  // Live counters
  const difficultySum = easy + medium + hard;
  const bloomSum = Object.values(bloom).reduce((a, b) => a + (b || 0), 0);
  const difficultyOver = difficultySum > count;
  const bloomOver = bloomSum > count;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-100/40 backdrop-blur-sm">
      {fetching && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-200/40 z-50">
          <div className="bg-white rounded-full p-6 shadow-lg flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-blue-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-blue-700 font-semibold">Fetching questions...</span>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-lg w-full relative animate-fade-in border border-blue-200">
        <button
          className="absolute top-3 right-3 text-blue-300 hover:text-blue-700 text-2xl font-bold z-10"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-2 text-blue-700 px-8 pt-8 flex items-center gap-2">
          SenseAI Pick
          {/* Debug icon for testId */}
          {testId && (
            <button
              className="p-1 ml-2 text-blue-400 hover:text-blue-700 rounded-full border border-blue-100 bg-white"
              title="Debug: Log testId DocumentReference"
              onClick={() => console.log('testId DocumentReference:', testId)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0A9 9 0 11 3 12a9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </h2>
        <form className="flex flex-col gap-5 max-h-[80vh] overflow-y-auto px-8 pb-8" onSubmit={handleSenseAIPick}>
          <div>
            <label className="block text-blue-700 font-semibold mb-1">Class <span className="text-red-500">*</span></label>
            <select className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-base font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); setSelectedLesson(''); }} required>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-blue-700 font-semibold mb-1">Subject <span className="text-red-500">*</span></label>
            <select className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-base font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} required>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-blue-700 font-semibold mb-1">Chapter</label>
            <select className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-base font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm" value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)}>
              <option value="">Select Chapter</option>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-blue-700 font-semibold mb-1">Lesson</label>
            <select className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-base font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm" value={selectedLesson} onChange={e => setSelectedLesson(e.target.value)}>
              <option value="">Select Lesson</option>
              {lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-blue-700 font-semibold mb-1">Total Questions <span className="text-red-500">*</span></label>
            <input type="number" className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-base font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm" value={count} onChange={e => setCount(Number(e.target.value))} min={1} required />
          </div>
          <div>
            <label className="block text-blue-700 font-semibold mb-1">Difficulty Distribution</label>
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex flex-col items-center">
                <input type="number" min={0} className="w-20 bg-blue-50 border border-blue-100 rounded-xl px-2 py-2 text-base font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm" value={easy} onChange={e => setEasy(Number(e.target.value))} placeholder="Easy" />
                <span className="text-blue-700 text-xs mt-1">Easy</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{easy}</span>
              </div>
              <div className="flex flex-col items-center">
                <input type="number" min={0} className="w-20 bg-blue-50 border border-blue-100 rounded-xl px-2 py-2 text-base font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm" value={medium} onChange={e => setMedium(Number(e.target.value))} placeholder="Medium" />
                <span className="text-blue-700 text-xs mt-1">Medium</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{medium}</span>
              </div>
              <div className="flex flex-col items-center">
                <input type="number" min={0} className="w-20 bg-blue-50 border border-blue-100 rounded-xl px-2 py-2 text-base font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm" value={hard} onChange={e => setHard(Number(e.target.value))} placeholder="Hard" />
                <span className="text-blue-700 text-xs mt-1">Hard</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{hard}</span>
              </div>
            </div>
            <span className={`block mt-2 font-bold text-base ${difficultyOver ? 'text-red-500' : 'text-blue-700'}`}>Total: {difficultySum}</span>
            {difficultyOver && <div className="text-red-500 text-xs mt-1 font-semibold">Sum of Easy, Medium, Hard exceeds Total Questions!</div>}
          </div>
          {error && <div className="text-red-500 text-center font-semibold mt-2">{error}</div>}
          <button type="submit" className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-600 transition text-lg flex items-center justify-center" disabled={loading}>
            {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span> : null}
            SenseAI Pick
          </button>
        </form>
      </div>
      <SenseAIPickResultsDialog
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        questions={resultsQuestions}
        testId={testId}
        onRefreshTest={onRefreshTest}
      />
    </div>
  );
};

export default SenseAIPickDialog;

export async function fetchSingleQuestionByCriteria({ classId, subjectId, chapterId, lessonId, difficulty, excludeId }: {
  classId: string;
  subjectId: string;
  chapterId: string;
  lessonId: string;
  difficulty: string;
  excludeId?: string;
}): Promise<Question | null> {
  let q = query(collection(db, 'questionCollection'));
  if (lessonId) q = query(q, where('lessonID', '==', doc(db, 'lessons', lessonId)));
  else if (chapterId) q = query(q, where('chapterID', '==', doc(db, 'chapters', chapterId)));
  else if (subjectId) q = query(q, where('subjectID', '==', doc(db, 'subjects', subjectId)));
  if (classId) q = query(q, where('classID', '==', doc(db, 'classes', classId)));
  if (difficulty) q = query(q, where('difficulty', '==', difficulty));
  const snap = await getDocs(q);
  let pool: Question[] = snap.docs.map(docSnap => {
    const d = docSnap.data();
    return {
      ...d,
      id: docSnap.id,
      question: d.questionText || d.question || '',
      optionA: d.optionA || '',
      optionB: d.optionB || '',
      optionC: d.optionC || '',
      optionD: d.optionD || '',
      correct: d.correct || '',
      explanation: d.explanation || '',
      solution: d.solution || '',
      difficulty: d.difficulty || '',
      bloom: d.bloom || '',
    };
  });
  if (excludeId) pool = pool.filter(q => q.id !== excludeId);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
} 