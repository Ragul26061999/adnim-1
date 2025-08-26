import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { fetchSingleQuestionByCriteria } from './SenseAIPickDialog';
import { db } from '../../../lib/firebaseClient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { DocumentReference } from 'firebase/firestore';

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
  classID?: string;
  subjectID?: string;
  chapterID?: string;
  lessonID?: string;
}

interface SenseAIPickResultsDialogProps {
  open: boolean;
  onClose: () => void;
  questions: Question[];
  testId?: DocumentReference;
  onRefreshTest?: () => Promise<void>;
}

const QUESTIONS_PER_PAGE = 10;

function renderWithLatex(text: string) {
  if (/^\$.*\$$/.test(text?.trim() || '')) {
    return <div className="text-left"><BlockMath math={text.replace(/\$/g, '')} /></div>;
  }
  const parts = (text || '').split(/(\$[^$]+\$)/g);
  return parts.map((part, i) =>
    /^\$.*\$$/.test(part)
      ? <span className="text-left inline-block align-middle" key={i}><InlineMath math={part.replace(/\$/g, '')} /></span>
      : <span key={i}>{part}</span>
  );
}

function getTagColor(type: string, value: string) {
  if (type === 'difficulty') {
    if (value.toLowerCase() === 'easy') return 'bg-green-100 text-green-800';
    if (value.toLowerCase() === 'medium') return 'bg-yellow-100 text-yellow-800';
    if (value.toLowerCase() === 'hard') return 'bg-red-100 text-red-800';
  }
  if (type === 'bloom') {
    if (value.toLowerCase().includes('remember')) return 'bg-blue-100 text-blue-800';
    if (value.toLowerCase().includes('understand')) return 'bg-purple-100 text-purple-800';
    if (value.toLowerCase().includes('apply')) return 'bg-pink-100 text-pink-800';
    if (value.toLowerCase().includes('analyze')) return 'bg-orange-100 text-orange-800';
    if (value.toLowerCase().includes('evaluate')) return 'bg-teal-100 text-teal-800';
    if (value.toLowerCase().includes('create')) return 'bg-indigo-100 text-indigo-800';
  }
  return 'bg-gray-100 text-gray-800';
}

const SenseAIPickResultsDialog: React.FC<SenseAIPickResultsDialogProps> = ({ open, onClose, questions, testId, onRefreshTest }) => {
  const [explanationOpen, setExplanationOpen] = React.useState<string | null>(null);
  const [explanationContent, setExplanationContent] = React.useState<{explanation?: string, solution?: string}>({});
  const [questionList, setQuestionList] = React.useState(questions);
  const [replacingIdx, setReplacingIdx] = React.useState<number | null>(null);
  const [replaceError, setReplaceError] = React.useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [updateMsg, setUpdateMsg] = React.useState<string | null>(null);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [selectedForRemoval, setSelectedForRemoval] = React.useState<string[]>([]);
  const [removeMode, setRemoveMode] = React.useState(false);

  React.useEffect(() => { setQuestionList(questions); }, [questions]);

  const isCorrect = (q: Question, option: string) => option.trim().toLowerCase() === (q.correct || '').trim().toLowerCase();

  // Handler to preview all questions
  const handlePreviewQuestions = () => {
    setPreviewMode(true);
  };

  // Handler to toggle remove mode
  const handleToggleRemoveMode = () => {
    setRemoveMode(!removeMode);
    setSelectedForRemoval([]);
  };

  // Handler to select/deselect questions for removal
  const handleToggleRemovalSelection = (questionId: string) => {
    setSelectedForRemoval(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  // Handler to remove selected questions
  const handleRemoveSelectedQuestions = async () => {
    if (selectedForRemoval.length === 0) {
      setUpdateMsg('Please select questions to remove.');
      return;
    }
    
    setUpdateLoading(true);
    setUpdateMsg(null);
    
    try {
      // Remove selected questions from the list
      const remainingQuestions = questionList.filter(q => !selectedForRemoval.includes(q.id));
      setQuestionList(remainingQuestions);
      setSelectedForRemoval([]);
      setRemoveMode(false);
      setUpdateMsg(`Successfully removed ${selectedForRemoval.length} questions from preview!`);
    } catch (err) {
      setUpdateMsg('Failed to remove questions.');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Handler to replace a question at a given index
  const handleReplaceQuestion = async (idx: number) => {
    setReplaceError(null);
    const q = questionList[idx];
    setReplacingIdx(idx);
    try {
      const newQ = await fetchSingleQuestionByCriteria({
        classId: q.classID || '',
        subjectId: q.subjectID || '',
        chapterId: q.chapterID || '',
        lessonId: q.lessonID || '',
        difficulty: q.difficulty || '',
        excludeId: q.id,
      });
      if (newQ) {
        setQuestionList(prev => prev.map((item, i) => i === idx ? newQ : item));
        setReplaceError(null);
      } else {
        setReplaceError('No replacement question found for this criteria.');
      }
    } catch (err) {
      setReplaceError('Failed to fetch replacement question.');
    } finally {
      setReplacingIdx(null);
    }
  };

  // Handler to update test with current questions (merge with existing)
  const handleUpdateTest = async () => {
    if (!testId) {
      setUpdateMsg('No test ID provided.');
      return;
    }
    setUpdateLoading(true);
    setUpdateMsg(null);
    try {
      // Get current test data to merge with existing questions
      const testDoc = await getDoc(doc(db, 'test', testId.id));
      const currentData = testDoc.data();
      const existingQuestions = currentData?.questions || [];
      
      // Create document references for AI-selected questions
      const newQuestionRefs = questionList.map(q => doc(db, 'questionCollection', q.id));
      
      // Merge existing questions with new questions (avoid duplicates)
      const existingQuestionIds = existingQuestions.map((ref: any) => ref.id || ref.path?.split('/').pop());
      const newQuestionIds = questionList.map(q => q.id);
      
      // Filter out duplicates
      const uniqueNewQuestions = newQuestionRefs.filter((ref, index) => 
        !existingQuestionIds.includes(newQuestionIds[index])
      );
      
      // Combine existing and new questions
      const allQuestions = [...existingQuestions, ...uniqueNewQuestions];
      
      // Update the test document with merged questions
      await updateDoc(doc(db, 'test', testId.id), { questions: allQuestions });
      
      setUpdateMsg(`Successfully added ${uniqueNewQuestions.length} new AI-selected questions!`);
      
      // Refresh test data if callback provided
      if (onRefreshTest) {
        await onRefreshTest();
      }
    } catch (err) {
      setUpdateMsg('Failed to update test.');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Auto-close dialog after success
  React.useEffect(() => {
    if (updateMsg && updateMsg.includes('success')) {
      const timer = setTimeout(() => {
        setUpdateMsg(null);
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [updateMsg, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-[90vw] max-w-[90vw] max-h-[90vh] overflow-y-auto relative animate-fade-in border border-purple-200">
        <button
          className="absolute top-3 right-3 text-purple-300 hover:text-purple-700 text-2xl font-bold z-10"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-2 text-purple-700 flex items-center gap-2">
          SenseAI Picked Questions
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
        {replaceError && (
          <div className="text-center text-red-500 font-semibold mb-4">{replaceError}</div>
        )}
        {questionList.length === 0 ? (
          <div className="text-center text-purple-400 font-semibold py-10">No questions found for the selected criteria.</div>
        ) : (
          <div className="space-y-8 max-h-[75vh] overflow-y-auto">
            {questionList.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-xl shadow p-6 border border-purple-100 text-left relative">
                {/* Remove mode checkbox */}
                {removeMode && (
                  <input
                    type="checkbox"
                    className="absolute top-4 right-4 w-5 h-5 accent-red-600"
                    checked={selectedForRemoval.includes(q.id)}
                    onChange={() => handleToggleRemovalSelection(q.id)}
                  />
                )}
                {/* Replace icon button - only show when not in remove mode */}
                {!removeMode && (
                  <button
                    className="absolute top-4 right-4 text-purple-400 hover:text-purple-700 p-2 rounded-full transition"
                    title="Replace this question"
                    type="button"
                    onClick={() => handleReplaceQuestion(idx)}
                    disabled={replacingIdx === idx}
                  >
                    {replacingIdx === idx ? (
                      <svg className="animate-spin w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0A8.003 8.003 0 016.058 15m12.36 0H15" />
                      </svg>
                    )}
                  </button>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {q.difficulty && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getTagColor('difficulty', q.difficulty)}`}>{q.difficulty}</span>
                  )}
                  {q.bloom && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getTagColor('bloom', q.bloom)}`}>{q.bloom}</span>
                  )}
                </div>
                {/* Question text, always visible and styled */}
                <div className="font-semibold text-lg text-gray-900 mb-2 break-words">
                  {idx + 1}. {renderWithLatex(q.question)}
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  <div className={`flex items-center gap-2 ${isCorrect(q, q.optionA) ? 'bg-green-50 border-2 border-green-400 rounded-lg font-bold' : ''} p-2`}> <span className="font-bold">A.</span> {renderWithLatex(q.optionA)}</div>
                  <div className={`flex items-center gap-2 ${isCorrect(q, q.optionB) ? 'bg-green-50 border-2 border-green-400 rounded-lg font-bold' : ''} p-2`}> <span className="font-bold">B.</span> {renderWithLatex(q.optionB)}</div>
                  <div className={`flex items-center gap-2 ${isCorrect(q, q.optionC) ? 'bg-green-50 border-2 border-green-400 rounded-lg font-bold' : ''} p-2`}> <span className="font-bold">C.</span> {renderWithLatex(q.optionC)}</div>
                  <div className={`flex items-center gap-2 ${isCorrect(q, q.optionD) ? 'bg-green-50 border-2 border-green-400 rounded-lg font-bold' : ''} p-2`}> <span className="font-bold">D.</span> {renderWithLatex(q.optionD)}</div>
                </div>
                <button
                  className="mt-2 px-4 py-2 rounded-lg bg-purple-100 text-purple-800 font-semibold shadow hover:bg-purple-200 transition text-sm"
                  onClick={() => { setExplanationOpen(q.id); setExplanationContent({explanation: q.explanation, solution: q.solution}); }}
                >
                  Show Explanation
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Explanation Dialog */}
        {explanationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-fade-in">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setExplanationOpen(null)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-4 text-purple-700">Explanation & Solution</h2>
              {explanationContent.explanation && (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Explanation:</div>
                  <div className="bg-gray-50 rounded p-3 text-gray-900">
                    {renderWithLatex(explanationContent.explanation)}
                  </div>
                </div>
              )}
              {explanationContent.solution && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Solution:</div>
                  <div className="bg-gray-50 rounded p-3 text-gray-900">
                    {renderWithLatex(explanationContent.solution)}
                  </div>
                </div>
              )}
              {!(explanationContent.explanation || explanationContent.solution) && (
                <div className="text-gray-400">No explanation or solution available.</div>
              )}
            </div>
          </div>
        )}
        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8">
          <div className="flex items-center gap-4">
            <button
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition text-lg"
              onClick={handlePreviewQuestions}
              disabled={questionList.length === 0}
            >
              Preview All Questions
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-bold shadow-lg transition text-lg ${
                removeMode 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
              onClick={handleToggleRemoveMode}
            >
              {removeMode ? 'Cancel Remove' : 'Remove Questions'}
            </button>
            {removeMode && selectedForRemoval.length > 0 && (
              <button
                className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 transition text-lg flex items-center justify-center"
                onClick={handleRemoveSelectedQuestions}
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                ) : null}
                Remove Selected ({selectedForRemoval.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium">
              {questionList.length} question{questionList.length !== 1 ? 's' : ''} in preview
            </span>
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg flex items-center justify-center"
              onClick={handleUpdateTest}
              disabled={updateLoading}
            >
              {updateLoading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
              ) : null}
              Update Test with These Questions
            </button>
          </div>
        </div>
        {updateMsg && (
          <div className={`text-center mt-4 font-semibold ${updateMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{updateMsg}</div>
        )}
        
        {/* Preview Dialog */}
        <PreviewQuestionsDialog
          open={previewMode}
          onClose={() => setPreviewMode(false)}
          questions={questionList}
          title={`Preview All Questions (${questionList.length})`}
        />
      </div>
    </div>
  );
};

// Preview Dialog Component
const PreviewQuestionsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  questions: Question[];
  title: string;
}> = ({ open, onClose, questions, title }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const QUESTIONS_PER_PAGE = 5;

  if (!open) return null;

  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const paginatedQuestions = questions.slice((currentPage - 1) * QUESTIONS_PER_PAGE, currentPage * QUESTIONS_PER_PAGE);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto relative animate-fade-in border border-purple-200">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-purple-700 mb-6">{title}</h2>
        {questions.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No questions to preview.</div>
        ) : (
          <>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              {paginatedQuestions.map((q, idx) => {
                const isCorrect = (option: string) => option.trim().toLowerCase() === (q.correct || '').trim().toLowerCase();
                return (
                  <div key={q.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {q.difficulty && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getTagColor('difficulty', q.difficulty)}`}>{q.difficulty}</span>
                      )}
                      {q.bloom && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getTagColor('bloom', q.bloom)}`}>{q.bloom}</span>
                      )}
                    </div>
                    <div className="font-semibold text-lg text-gray-900 mb-3">
                      {(currentPage - 1) * QUESTIONS_PER_PAGE + idx + 1}. {renderWithLatex(q.question)}
                    </div>
                    <div className="flex flex-col gap-2 mb-4">
                      <div className={`flex items-center gap-2 ${isCorrect(q.optionA) ? 'bg-green-50 border-2 border-green-400 rounded-lg font-bold' : ''} p-2`}>
                        <span className="font-bold">A.</span> {renderWithLatex(q.optionA)}
                      </div>
                      <div className={`flex items-center gap-2 ${isCorrect(q.optionB) ? 'bg-green-50 border-2 border-green-400 rounded-lg font-bold' : ''} p-2`}>
                        <span className="font-bold">B.</span> {renderWithLatex(q.optionB)}
                      </div>
                      <div className={`flex items-center gap-2 ${isCorrect(q.optionC) ? 'bg-green-50 border-2 border-green-400 rounded-lg font-bold' : ''} p-2`}>
                        <span className="font-bold">C.</span> {renderWithLatex(q.optionC)}
                      </div>
                      <div className={`flex items-center gap-2 ${isCorrect(q.optionD) ? 'bg-green-50 border-2 border-green-400 rounded-lg font-bold' : ''} p-2`}>
                        <span className="font-bold">D.</span> {renderWithLatex(q.optionD)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >Previous</button>
                <span className="text-gray-700 font-semibold">Page {currentPage} of {totalPages}</span>
                <button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >Next</button>
              </div>
            )}
            <div className="flex justify-center mt-6">
              <button
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 transition text-lg"
                onClick={onClose}
              >
                Close Preview
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SenseAIPickResultsDialog; 