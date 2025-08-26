import React, { useState } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebaseClient';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

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

interface TestPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  questions: Question[];
  testId: string;
  onRefreshTest?: () => Promise<void>;
}

function renderWithLatex(text: string) {
  if (!text) return '';
  
  // If the whole string is LaTeX (wrapped in $...$)
  if (/^\$.*\$$/.test(text?.trim() || '')) {
    return <div className="text-left"><BlockMath math={text.replace(/\$/g, '')} /></div>;
  }
  
  // Otherwise, split and render text and LaTeX
  const parts = (text || '').split(/(\$[^$]+\$)/g);
  return parts.map((part, i) =>
    /^\$.*\$$/.test(part)
      ? <span className="text-left inline-block align-middle" key={i}><InlineMath math={part.replace(/\$/g, '')} /></span>
      : <span key={i}>{part}</span>
  );
}

function getTagColor(type: string, value: string) {
  if (type === 'difficulty') {
    switch (value.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  if (type === 'bloom') {
    switch (value.toLowerCase()) {
      case 'remember': return 'bg-blue-100 text-blue-800';
      case 'understand': return 'bg-green-100 text-green-800';
      case 'apply': return 'bg-yellow-100 text-yellow-800';
      case 'analyze': return 'bg-orange-100 text-orange-800';
      case 'evaluate': return 'bg-purple-100 text-purple-800';
      case 'create': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  return 'bg-gray-100 text-gray-800';
}

const TestPreviewDialog: React.FC<TestPreviewDialogProps> = ({ 
  open, 
  onClose, 
  questions, 
  testId, 
  onRefreshTest 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [replacingQuestion, setReplacingQuestion] = useState<string | null>(null);
  const QUESTIONS_PER_PAGE = 3;

  if (!open) return null;

  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const paginatedQuestions = questions.slice((currentPage - 1) * QUESTIONS_PER_PAGE, currentPage * QUESTIONS_PER_PAGE);

  const isCorrect = (option: string, correct: string) => 
    option.trim().toLowerCase() === correct.trim().toLowerCase();

  // Handler to remove a question from the test
  const handleRemoveQuestion = async (questionId: string) => {
    if (!testId) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      // Get current test data
      const testDoc = await getDoc(doc(db, 'test', testId));
      if (testDoc.exists()) {
        const testData = testDoc.data();
        const existingQuestions = testData.questions || [];
        
        // Remove the specific question
        const updatedQuestions = existingQuestions.filter((qRef: any) => {
          const refId = qRef.id || qRef.path?.split('/').pop();
          return refId !== questionId;
        });
        
        // Update the test document
        await updateDoc(doc(db, 'test', testId), { questions: updatedQuestions });
        
        setMessage(`Question removed successfully!`);
        
        // Refresh test data if callback provided
        if (onRefreshTest) {
          await onRefreshTest();
        }
        
        // Close dialog after success
        setTimeout(() => {
          setMessage(null);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Error removing question:', err);
      setMessage('Failed to remove question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler to swap a question with another from the same class/subject
  const handleSwapQuestion = async (questionId: string) => {
    setReplacingQuestion(questionId);
    // This would open a dialog to select a replacement question
    // For now, we'll just show a message
    setMessage('Swap functionality coming soon!');
    setTimeout(() => {
      setReplacingQuestion(null);
      setMessage(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto relative animate-fade-in border border-green-200">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Test Questions Preview</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg font-semibold ${
            message.includes('success') ? 'bg-green-100 text-green-700' : 
            message.includes('Failed') ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {questions.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No questions in this test</p>
            <p className="text-sm">Add questions using the "Select Questions" button</p>
          </div>
        ) : (
          <>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              {paginatedQuestions.map((q, idx) => (
                <div key={q.id} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-sm relative group">
                  {/* Question Actions */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      onClick={() => handleRemoveQuestion(q.id)}
                      disabled={loading}
                      title="Remove question"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                      onClick={() => handleSwapQuestion(q.id)}
                      disabled={loading || replacingQuestion === q.id}
                      title="Swap question"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  </div>

                  {/* Question Number */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-sm">
                        {(currentPage - 1) * QUESTIONS_PER_PAGE + idx + 1}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {q.difficulty && (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTagColor('difficulty', q.difficulty)}`}>
                          {q.difficulty}
                        </span>
                      )}
                      {q.bloom && (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTagColor('bloom', q.bloom)}`}>
                          {q.bloom}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="font-semibold text-lg text-gray-900 mb-4 leading-relaxed">
                    {renderWithLatex(q.question)}
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {[
                      { key: 'A', text: q.optionA },
                      { key: 'B', text: q.optionB },
                      { key: 'C', text: q.optionC },
                      { key: 'D', text: q.optionD }
                    ].map((option) => (
                      <div
                        key={option.key}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isCorrect(option.text, q.correct || '')
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-bold text-sm mt-0.5">{option.key}.</span>
                          <span className="flex-1">{renderWithLatex(option.text)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Explanation Button */}
                  {(q.explanation || q.solution) && (
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                      View Explanation
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="text-gray-700 font-semibold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-center mt-6">
              <button
                className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition text-lg"
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

export default TestPreviewDialog; 