"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { db } from '../../../../lib/firebaseClient';
import { collection, query, where, getDocs } from "firebase/firestore";
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import html2pdf from 'html2pdf.js';

const years = Array.from({ length: 2025 - 2014 + 1 }, (_, i) => 2014 + i);

interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: string;
  explanation?: string;
  solution?: string;
}

type OptionLetter = 'A' | 'B' | 'C' | 'D';

// Global CSS for print/PDF and watermark
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .question-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      .question-block {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
    .question-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 6rem;
      color: #00000022;
      font-weight: bold;
      letter-spacing: 0.2em;
      pointer-events: none;
      user-select: none;
      z-index: 0;
      white-space: nowrap;
    }
    @media print {
      .question-watermark {
        color: #00000011;
      }
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
  `;
  document.head.appendChild(style);
}

function isLatex(str: string | undefined): boolean {
  if (!str) return false;
  return /\$.*\$|\\\w+/.test(str);
}

// TypeScript: declare module for html2pdf.js if needed
// declare module 'html2pdf.js';

export default function NeetPYQPage() {
  const [practiceYear, setPracticeYear] = useState<number | null>(null);
  const [viewYear, setViewYear] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerChecked, setAnswerChecked] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [optionAnim, setOptionAnim] = useState<{[key:string]:string}>({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [forceSingleCol, setForceSingleCol] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  // Fetch questions when dialog opens
  useEffect(() => {
    async function fetchQuestions(year: number | null) {
      if (!year) return;
      setLoading(true);
      setQuestions([]);
      setCurrentIdx(0);
      setSelectedOption(null);
      setAnswerChecked(false);
      setShowExplanation(false);
      try {
        const q = query(
          collection(db, "questionCollection"),
          where("previous", "==", true),
          where("year", "==", year)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            question: d.questionText || d.question || "",
            optionA: d.optionA || "",
            optionB: d.optionB || "",
            optionC: d.optionC || "",
            optionD: d.optionD || "",
            correct: d.correct || "",
            explanation: d.explanation || "",
            solution: d.solution || ""
          };
        });
        setQuestions(data);
      } catch {
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }
    if (practiceYear) fetchQuestions(practiceYear);
    if (viewYear) fetchQuestions(viewYear);
  }, [practiceYear, viewYear]);

  // Practice logic
  function handleSelectOption(opt: string) {
    if (answerChecked) return;
    setSelectedOption(opt);
  }
  function handleCheckAnswer() {
    if (!selectedOption) return;
    setAnswerChecked(true);
    const selectedText = questions[currentIdx][`option${selectedOption}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'].trim();
    const correctText = questions[currentIdx].correct.trim();
    const isCorrect = selectedText === correctText;
    const correctOpt = ['A', 'B', 'C', 'D'].find(opt => questions[currentIdx][`option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'].trim() === correctText);
    setOptionAnim({
      [selectedOption]: isCorrect ? 'animate-correct' : 'animate-wrong',
      [correctOpt || '']: !isCorrect ? 'animate-correct' : ''
    });
  }
  function handleNext() {
    setCurrentIdx(idx => Math.min(idx + 1, questions.length - 1));
    setSelectedOption(null); setAnswerChecked(false); setShowExplanation(false); setOptionAnim({});
  }
  function handlePrev() {
    setCurrentIdx(idx => Math.max(idx - 1, 0));
    setSelectedOption(null); setAnswerChecked(false); setShowExplanation(false); setOptionAnim({});
  }
  function handleShowExplanation() { setShowExplanation(true); }

  // Helper to render question with LaTeX and text
  function renderQuestionWithLatex(q: string) {
    if (/^\$.*\$$/.test(q?.trim() || "")) {
      return <BlockMath math={q.replace(/\$/g, '')} />;
    }
    const parts = (q || "").split(/(\$[^$]+\$)/g);
    return parts.map((part, i) =>
      /^\$.*\$$/.test(part)
        ? <InlineMath key={i} math={part.replace(/\$/g, '')} />
        : <span key={i}>{part}</span>
    );
  }
  function renderOptionWithLatex(opt: string) {
    if (/^\$.*\$$/.test(opt?.trim() || "")) {
      return <InlineMath math={opt.replace(/\$/g, '')} />;
    }
    const parts = (opt || "").split(/(\$[^$]+\$)/g);
    return parts.map((part, i) =>
      /^\$.*\$$/.test(part)
        ? <InlineMath key={i} math={part.replace(/\$/g, '')} />
        : <span key={i}>{part}</span>
    );
  }

  const handleDownloadPDF = async () => {
    setPdfExporting(true);
    const element = document.getElementById('question-paper-view');
    if (element) {
      const opt = {
        margin:       [0.5, 0.5, 0.5, 0.5], // top, left, bottom, right in inches
        filename:     `NEET_PYQ_${viewYear}_Question_Paper.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };
      await html2pdf().set(opt).from(element).save();
    }
    setPdfExporting(false);
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#F8F9FB]">
      <Sidebar />
      <main className="flex-1 bg-[#F8F9FB] flex flex-col items-center p-6 md:p-12 xl:p-16">
        <h1 className="text-3xl font-bold text-[#6C63FF] mb-2">NEET PYQ (2014 - 2025)</h1>
        <p className="text-gray-500 mb-10">Practice and view previous year NEET questions by year.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {years.map((year) => (
            <div
              key={year}
              className="flex flex-col md:flex-row items-center justify-between bg-[#F7FAFC] rounded-2xl shadow border border-gray-200 px-6 py-6 transition-all duration-200 group hover:border-[#6C63FF] hover:shadow-lg"
            >
              <div className="flex flex-col items-start mb-4 md:mb-0">
                <div className="text-2xl font-bold text-gray-800 leading-tight">{year}</div>
                <div className="text-xs text-gray-500 mt-1">Previous Year Questions</div>
              </div>
              <div className="flex gap-3">
                <button
                  className="bg-white border border-[#6366F1] text-[#6366F1] px-5 py-2 rounded-lg font-semibold shadow-sm hover:bg-[#6366F1] hover:text-white transition text-sm"
                  onClick={() => { setViewYear(year); setPracticeYear(null); }}
                >
                  View
                </button>
                <button
                  className="bg-white border border-[#10B981] text-[#10B981] px-5 py-2 rounded-lg font-semibold shadow-sm hover:bg-[#10B981] hover:text-white transition text-sm"
                  onClick={() => { setPracticeYear(year); setViewYear(null); }}
                >
                  Practice
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Practice Dialog */}
        {practiceYear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-[98vw] h-[98vh] max-w-none max-h-none flex flex-col relative animate-fadeIn overflow-hidden" style={{ padding: 0 }}>
              <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white/80 z-10">
                <div className="text-2xl font-bold text-[#10B981]">Practice NEET PYQ {practiceYear}</div>
                <button
                  className="text-gray-400 hover:text-blue-500 text-2xl font-bold"
                  onClick={() => setPracticeYear(null)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center w-full h-full p-4 bg-gray-50 overflow-y-auto">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center text-lg text-gray-400">Loading questions...</div>
                ) : questions.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">No questions found for this year.</div>
                ) : (
                  <div className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col gap-6 glass-card relative transition-all duration-500 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400">Question {currentIdx + 1} of {questions.length}</span>
                    </div>
                    <div className="font-semibold text-lg text-gray-800 min-h-[3.5rem]">
                      {renderQuestionWithLatex(questions[currentIdx].question)}
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                      {['A', 'B', 'C', 'D'].map((opt, i) => {
                        const correctText = questions[currentIdx].correct.trim();
                        const correctOpt = ['A', 'B', 'C', 'D'].find(o => questions[currentIdx][`option${o}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'].trim() === correctText);
                        return (
                          <button
                            key={opt}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-base border transition-all duration-300 focus:outline-none
                              ${selectedOption === opt ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-100 hover:bg-blue-50'}
                              ${answerChecked && opt === correctOpt ? 'bg-green-100 border-green-400 text-green-700' : ''}
                              ${answerChecked && selectedOption === opt && opt !== correctOpt ? 'bg-red-100 border-red-400 text-red-700' : ''}
                              ${optionAnim[opt] || ''}
                            `}
                            onClick={() => handleSelectOption(opt)}
                            disabled={answerChecked}
                          >
                            <span className="font-bold mr-2">{opt}.</span>
                            {renderOptionWithLatex(questions[currentIdx][`option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'])}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-6 gap-4">
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                        onClick={handlePrev}
                        disabled={currentIdx === 0}
                      >Previous</button>
                      <div className="flex gap-2">
                        {!answerChecked && (
                          <button
                            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition"
                            onClick={handleCheckAnswer}
                            disabled={!selectedOption}
                          >Check Answer</button>
                        )}
                        {answerChecked && !showExplanation && (
                          <button
                            className="px-6 py-2 rounded-lg bg-yellow-400 text-gray-900 font-bold shadow hover:bg-yellow-500 transition"
                            onClick={handleShowExplanation}
                          >Show Explanation</button>
                        )}
                      </div>
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                        onClick={handleNext}
                        disabled={currentIdx === questions.length - 1}
                      >Next</button>
                    </div>
                    {answerChecked && showExplanation && selectedOption && (() => {
                      const selectedText = questions[currentIdx][`option${selectedOption}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'].trim();
                      const correctText = questions[currentIdx].correct.trim();
                      const isCorrect = selectedText === correctText;
                      let reasonType = null, reasonText = '';
                      // You can add logic for silly/conceptual/minor mistakes if your data supports it
                      const correctOpt = ['A', 'B', 'C', 'D'].find(o => questions[currentIdx][`option${o}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'].trim() === correctText);
                      return (
                        <div className="mt-6 flex flex-col gap-6">
                          {/* Wrong answer feedback */}
                          {!isCorrect && (
                            <div className="rounded-2xl shadow-xl glass-card border border-red-300 bg-red-50/80 p-6 flex items-center gap-4 animate-fadeIn">
                              <span className="text-3xl bg-red-400/90 text-white rounded-full p-3"><svg width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></span>
                              <div>
                                <div className="text-lg font-bold text-red-700 mb-1">Why your answer is wrong</div>
                                <div className="text-gray-700">
                                  {renderOptionWithLatex(reasonText || 'This answer is not correct for this question.')}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Correct answer feedback */}
                          {isCorrect && (
                            <div className="rounded-2xl shadow-xl glass-card border border-green-300 bg-green-50/80 p-6 flex items-center gap-4 animate-fadeIn">
                              <span className="text-3xl bg-green-400/90 text-white rounded-full p-3"><svg width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/></svg></span>
                              <div>
                                <div className="text-lg font-bold text-green-700 mb-1">Great job! Your answer is correct.</div>
                              </div>
                            </div>
                          )}
                          {/* Show correct answer if user was wrong */}
                          {!isCorrect && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow flex items-center gap-3">
                              <span className="text-blue-600 font-bold">Correct Answer:</span>
                              <span className="font-mono bg-white border border-blue-100 rounded px-3 py-1">
                                {correctOpt}. {renderOptionWithLatex(questions[currentIdx][`option${correctOpt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'])}
                              </span>
                            </div>
                          )}
                          {/* Explanation and solution */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/80 rounded-xl p-4 border border-blue-100 shadow">
                              <div className="font-bold text-blue-700 mb-1">Explanation</div>
                              {questions[currentIdx].explanation ? renderOptionWithLatex(questions[currentIdx].explanation) : <span className="italic text-gray-400">No explanation provided.</span>}
                            </div>
                            {questions[currentIdx].solution && (
                              <div className="bg-white/80 rounded-xl p-4 border border-yellow-100 shadow">
                                <div className="font-bold text-yellow-700 mb-1">Solution</div>
                                {renderOptionWithLatex(questions[currentIdx].solution)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              {/* Animations for correct/wrong */}
              <style jsx global>{`
                .animate-correct {
                  animation: correctFlash 0.7s;
                }
                .animate-wrong {
                  animation: wrongShake 0.7s;
                }
                @keyframes correctFlash {
                  0% { box-shadow: 0 0 0 0 #22c55e44; }
                  50% { box-shadow: 0 0 0 8px #22c55e44; }
                  100% { box-shadow: 0 0 0 0 #22c55e00; }
                }
                @keyframes wrongShake {
                  0% { transform: translateX(0); }
                  20% { transform: translateX(-8px); }
                  40% { transform: translateX(8px); }
                  60% { transform: translateX(-8px); }
                  80% { transform: translateX(8px); }
                  100% { transform: translateX(0); }
                }
              `}</style>
            </div>
          </div>
        )}
        {/* View Dialog (Question Paper Look) */}
        {viewYear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-5xl w-full relative animate-fadeIn">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setViewYear(null)}
                aria-label="Close"
              >
                &times;
              </button>
              <div className="flex flex-col items-center border-b border-gray-200 p-6">
                <div className="text-base text-gray-700 font-serif mb-2">NEET PYQ {viewYear} - Question Paper</div>
                <button
                  onClick={handleDownloadPDF}
                  className="mt-2 px-6 py-2 rounded bg-black text-white font-bold shadow hover:bg-gray-800 transition disabled:opacity-60"
                  disabled={pdfExporting}
                >
                  {pdfExporting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Preparing PDF...
                    </span>
                  ) : 'Download as PDF'}
                </button>
              </div>
              <div className="p-2 sm:p-8 overflow-y-auto max-h-[70vh] bg-white relative" id="question-paper-view" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#222' }}>
                <div className="question-watermark">CLASSA</div>
                {loading ? (
                  <div className="text-gray-400 text-center py-10">Loading questions...</div>
                ) : questions.length === 0 ? (
                  <div className="text-gray-400 text-center py-10">No questions found for this year.</div>
                ) : (
                  <div className={`grid ${forceSingleCol ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-x-6 gap-y-4`} style={{ columnGap: '32px', rowGap: '12px', maxHeight: 'none', overflow: 'visible' }}>
                    {questions.map((q, idx) => (
                      <div key={q.id} className="mb-2 break-inside-avoid question-block" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div className="font-serif text-black mb-1 leading-snug text-[13px] sm:text-base"><span className="font-bold">{idx + 1}.</span> {renderQuestionWithLatex(q.question)}</div>
                        <div className="flex flex-col gap-1 mt-1 ml-6">
                          {(['A', 'B', 'C', 'D'] as OptionLetter[]).map((opt: OptionLetter) => {
                            const val = q[`option${opt}` as keyof Question] as string | undefined;
                            return (
                              <div key={opt} className="flex items-start gap-2 text-black font-serif text-[13px] sm:text-base">
                                <span className="font-bold mr-1">({opt})</span> {renderOptionWithLatex(val ?? '')}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {pdfLoading && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg px-8 py-6 flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <div className="text-blue-700 font-semibold">Preparing PDF, please wait...</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 