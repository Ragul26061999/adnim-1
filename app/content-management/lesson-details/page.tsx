"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ContentSidebar from "../components/ContentSidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStickyNote,
  faLightbulb,
  faBook,
  faBrain,
  faClone,
  faQuestionCircle,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { db } from '../../../lib/firebaseClient';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

const cardData = [
  {
    title: "Short Notes",
    icon: faStickyNote,
    color: "from-blue-200 to-blue-100",
    iconColor: "text-blue-400",
    activeTextColor: "text-blue-400",
  },
  {
    title: "Concept Summary",
    icon: faLightbulb,
    color: "from-yellow-200 to-yellow-100",
    iconColor: "text-yellow-400",
    activeTextColor: "text-yellow-400",
  },
  {
    title: "View Glossary",
    icon: faBook,
    color: "from-green-200 to-green-100",
    iconColor: "text-green-400",
    activeTextColor: "text-green-400",
  },
  {
    title: "View Mnemonics",
    icon: faBrain,
    color: "from-purple-200 to-purple-100",
    iconColor: "text-purple-400",
    activeTextColor: "text-purple-400",
  },
  {
    title: "Flash Cards",
    icon: faClone,
    color: "from-pink-200 to-pink-100",
    iconColor: "text-pink-400",
    activeTextColor: "text-pink-400",
  },
  {
    title: "Question Bank",
    icon: faQuestionCircle,
    color: "from-orange-200 to-orange-100",
    iconColor: "text-orange-400",
    activeTextColor: "text-orange-400",
  },
];

// Helper to extract <body> content from a full HTML document string
function extractBody(html: string): string {
  if (typeof window !== 'undefined') {
    const doc = document.implementation.createHTMLDocument('');
    doc.documentElement.innerHTML = html;
    return doc.body.innerHTML;
  }
  // Fallback: try to extract manually
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

export default function LessonDetails() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lessonId");
  const [activeIdx, setActiveIdx] = useState(0);
  const [cardAnim, setCardAnim] = useState<'in' | 'out'>('in');
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  // Modal state for all card types
  const [modalType, setModalType] = useState<null | 'shortNotes' | 'conceptSummary' | 'glossary' | 'menmonics'>(null);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [DOMPurify, setDOMPurify] = useState<any>(null);
  const [showQBankModal, setShowQBankModal] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerChecked, setAnswerChecked] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [optionAnim, setOptionAnim] = useState<{[key:number]:string}>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('dompurify').then((mod) => {
        let purifyInstance = null;
        if (typeof (mod as any).default === 'function') {
          purifyInstance = (mod as any).default(window);
        } else if (typeof (mod as any) === 'function') {
          purifyInstance = (mod as any)(window);
        } else if ((mod as any).createDOMPurify && typeof (mod as any).createDOMPurify === 'function') {
          purifyInstance = (mod as any).createDOMPurify(window);
        }
        setDOMPurify(purifyInstance);
      });
    }
  }, []);

  // Helper to get index with wrap-around
  const getIdx = (offset: number) => (activeIdx + offset + cardData.length) % cardData.length;

  // Card stack settings
  const CARD_SIZE = "w-[28rem] h-[28rem] max-w-full max-h-[80vh]"; // main card size
  const BEHIND_SIZE = "w-[24rem] h-[24rem] max-w-full max-h-[70vh]";
  const FAR_BEHIND_SIZE = "w-[20rem] h-[20rem] max-w-full max-h-[60vh]";

  // Animation duration (ms)
  const ANIM_DURATION = 320;

  const animateTo = (newIdx: number) => {
    setCardAnim('out');
    setPendingIdx(newIdx);
    setTimeout(() => {
      setActiveIdx(newIdx);
      setCardAnim('in');
      setPendingIdx(null);
    }, ANIM_DURATION);
  };

  const goPrev = () => animateTo(activeIdx > 0 ? activeIdx - 1 : cardData.length - 1);
  const goNext = () => animateTo(activeIdx < cardData.length - 1 ? activeIdx + 1 : 0);

  // For animation, show either the current or pending card
  const animIdx = pendingIdx !== null ? pendingIdx : activeIdx;
  const animDirection = pendingIdx !== null ? (pendingIdx > activeIdx || (pendingIdx === 0 && activeIdx === cardData.length - 1) ? 1 : -1) : 0;

  // Generalized handler for opening modal for any card type
  const handleOpenModal = async (type: 'shortNotes' | 'conceptSummary' | 'glossary' | 'menmonics') => {
    if (!lessonId) return;
    setModalType(type);
    setLoadingModal(true);
    setModalError(null);
    setModalContent(null);
    try {
      let collectionName = '';
      let fieldName = '';
      switch (type) {
        case 'shortNotes':
          collectionName = 'shortNotes';
          fieldName = 'notes';
          break;
        case 'conceptSummary':
          collectionName = 'conceptSummary';
          fieldName = 'explanation';
          break;
        case 'glossary':
          collectionName = 'glossary';
          fieldName = 'content';
          break;
        case 'menmonics':
          collectionName = 'menmonics';
          fieldName = 'concent';
          break;
      }
      const lessonRef = doc(db, 'lessons', lessonId);
      const q = query(collection(db, collectionName), where('lessonID', '==', lessonRef));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setModalContent(data[fieldName] || 'No content found for this lesson.');
      } else {
        setModalContent(null);
        setModalError('No content found for this lesson.');
      }
    } catch (e) {
      setModalError('Failed to fetch content.');
      console.error('DEBUG: error fetching modal content', e);
    } finally {
      setLoadingModal(false);
    }
  };

  // Helper to render question with LaTeX and text
  function renderQuestionWithLatex(q: string) {
    // If the whole question is LaTeX
    if (/^\$.*\$$/.test(q.trim())) {
      return <BlockMath math={q.replace(/\$/g, '')} />;
    }
    // Otherwise, split and render text and LaTeX
    const parts = q.split(/(\$[^$]+\$)/g);
    return parts.map((part, i) =>
      /^\$.*\$$/.test(part)
        ? <InlineMath key={i} math={part.replace(/\$/g, '')} />
        : <span key={i}>{part}</span>
    );
  }

  // Helper to render option with LaTeX and text
  function renderOptionWithLatex(opt: string) {
    if (/^\$.*\$$/.test(opt.trim())) {
      return <InlineMath math={opt.replace(/\$/g, '')} />;
    }
    const parts = opt.split(/(\$[^$]+\$)/g);
    return parts.map((part, i) =>
      /^\$.*\$$/.test(part)
        ? <InlineMath key={i} math={part.replace(/\$/g, '')} />
        : <span key={i}>{part}</span>
    );
  }

  function handleSelectOption(idx:number) {
    if (answerChecked) return;
    setSelectedOption(idx);
  }

  // Fetch questions from Firestore when modal opens
  const fetchQuestions = useCallback(async () => {
    if (!lessonId) return;
    setLoadingQuestions(true);
    setQuestionsError(null);
    try {
      const lessonRef = doc(db, 'lessons', lessonId);
      const q = query(collection(db, 'questionCollection'), where('lessonID', '==', lessonRef));
      const snap = await getDocs(q);
      const mapped = snap.docs.map((docSnap): {
        id: string;
        question: string;
        options: { key: string; text: string }[];
        correct: string;
        explanation: string;
        solution: string;
        sillyOption?: string;
        sillyReason?: string;
        conceptualOption?: string;
        conceptualReason?: string;
        minorOption?: string;
        minorReason?: string;
        image: string | null;
      } => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          question: d.questionText,
          options: [
            { key: 'optionA', text: d.optionA },
            { key: 'optionB', text: d.optionB },
            { key: 'optionC', text: d.optionC },
            { key: 'optionD', text: d.optionD },
          ],
          correct: d.correct?.trim(),
          explanation: d.explanation,
          solution: d.solution,
          sillyOption: d.sillyOption,
          sillyReason: d.sillyReason,
          conceptualOption: d.conceptualOption,
          conceptualReason: d.conceptualReason,
          minorOption: d.minorOption,
          minorReason: d.minorReason,
          image: d.qlmg || null,
        };
      });
      setQuestions(mapped);
      setCurrentQIdx(0);
      setSelectedOption(null);
      setAnswerChecked(false);
      setShowExplanation(false);
      setOptionAnim({});
    } catch (e) {
      setQuestionsError('Failed to fetch questions.');
    } finally {
      setLoadingQuestions(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (showQBankModal) {
      fetchQuestions();
    }
  }, [showQBankModal, fetchQuestions]);

  function handleCheckAnswer() {
    if (selectedOption === null) return;
    setAnswerChecked(true);
    const selectedText = questions[currentQIdx].options[selectedOption].text.trim();
    const correctText = questions[currentQIdx].correct.trim();
    const isCorrect = selectedText === correctText;
    const correctIdx = questions[currentQIdx].options.findIndex(
      (opt: { key: string; text: string }) => opt.text.trim() === correctText
    );
    setOptionAnim({
      [selectedOption]: isCorrect ? 'animate-correct' : 'animate-wrong',
      [correctIdx]: !isCorrect ? 'animate-correct' : ''
    });
  }
  function handleNext() {
    setCurrentQIdx((idx) => Math.min(idx + 1, questions.length - 1));
    setSelectedOption(null); setAnswerChecked(false); setShowExplanation(false); setOptionAnim({});
  }
  function handlePrev() {
    setCurrentQIdx((idx) => Math.max(idx - 1, 0));
    setSelectedOption(null); setAnswerChecked(false); setShowExplanation(false); setOptionAnim({});
  }
  function handleShowExplanation() { setShowExplanation(true); }

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <ContentSidebar />
      <main className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-10">
        <div className="relative flex flex-col items-center justify-center w-full mt-8 sm:mt-12 md:mt-16" style={{ minHeight: '28rem' }}>
          {/* Left Arrow */}
          <button
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white/70 hover:bg-white/90 rounded-full p-2 shadow border border-gray-200"
            aria-label="Previous"
            disabled={cardAnim === 'out'}
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-2xl text-gray-400" />
          </button>
          {/* Card Stack - shifted left */}
          <div className="relative flex items-center justify-center w-full h-[28rem] select-none" style={{ left: '-3rem' }}>
            {/* Far previous card (2 before) */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${FAR_BEHIND_SIZE} bg-gradient-to-br ${cardData[getIdx(-2)].color} rounded-3xl shadow-md p-4 flex flex-col items-center justify-center glass-card z-0 opacity-30 scale-90 pointer-events-none`}
              style={{
                transform: 'translate(-50%, -50%) rotate(-16deg) scale(0.85)',
                filter: 'blur(2px)',
                backdropFilter: 'blur(6px)',
              }}
            ></div>
            {/* Previous card (1 before) - closer to main card, with full card content */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${BEHIND_SIZE} bg-gradient-to-br ${cardData[getIdx(-1)].color} rounded-3xl shadow-lg p-6 flex flex-col items-center justify-center glass-card z-10 opacity-60 pointer-events-none transition-all duration-300`}
              style={{
                transform: 'translate(-54%, -50%) rotate(-10deg) scale(0.95)',
                filter: 'blur(1px)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-full bg-white/60 shadow">
                <FontAwesomeIcon icon={cardData[getIdx(-1)].icon} className={`text-5xl ${cardData[getIdx(-1)].iconColor}`} />
              </div>
              <div className="text-2xl font-bold text-gray-800 text-center mb-2 drop-shadow">{cardData[getIdx(-1)].title}</div>
              <div className="text-gray-500 text-center text-base">Click to view</div>
            </div>
            {/* Next card (1 after) - closer to main card, with full card content */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${BEHIND_SIZE} bg-gradient-to-br ${cardData[getIdx(1)].color} rounded-3xl shadow-lg p-6 flex flex-col items-center justify-center glass-card z-10 opacity-60 pointer-events-none transition-all duration-300`}
              style={{
                transform: 'translate(-46%, -50%) rotate(10deg) scale(0.95)',
                filter: 'blur(1px)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-full bg-white/60 shadow">
                <FontAwesomeIcon icon={cardData[getIdx(1)].icon} className={`text-5xl ${cardData[getIdx(1)].iconColor}`} />
              </div>
              <div className="text-2xl font-bold text-gray-800 text-center mb-2 drop-shadow">{cardData[getIdx(1)].title}</div>
              <div className="text-gray-500 text-center text-base">Click to view</div>
            </div>
            {/* Far next card (2 after) */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${FAR_BEHIND_SIZE} bg-gradient-to-br ${cardData[getIdx(2)].color} rounded-3xl shadow-md p-4 flex flex-col items-center justify-center glass-card z-0 opacity-30 scale-90 pointer-events-none`}
              style={{
                transform: 'translate(-50%, -50%) rotate(16deg) scale(0.85)',
                filter: 'blur(2px)',
                backdropFilter: 'blur(6px)',
              }}
            ></div>
            {/* Main card with animation - slightly left aligned */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-[60%] -translate-y-1/2 ${CARD_SIZE} bg-gradient-to-br ${cardData[animIdx].color} rounded-3xl shadow-2xl p-10 flex flex-col items-center justify-center glass-card z-20 transition-all duration-300
                ${cardAnim === 'in' ? 'opacity-100 scale-100 translate-x-0' : `opacity-0 scale-90 translate-x-${animDirection > 0 ? '[60px]' : '[-60px]'}`}`}
              onClick={
                animIdx === 0 ? () => handleOpenModal('shortNotes') :
                animIdx === 1 ? () => handleOpenModal('conceptSummary') :
                animIdx === 2 ? () => handleOpenModal('glossary') :
                animIdx === 3 ? () => handleOpenModal('menmonics') :
                animIdx === 5 ? () => setShowQBankModal(true) :
                undefined
              }
              role={animIdx >= 0 && animIdx <= 5 ? 'button' : undefined}
              tabIndex={animIdx >= 0 && animIdx <= 5 ? 0 : -1}
              aria-label={
                animIdx === 0 ? 'View Short Notes' :
                animIdx === 1 ? 'View Concept Summary' :
                animIdx === 2 ? 'View Glossary' :
                animIdx === 3 ? 'View Mnemonics' :
                animIdx === 5 ? 'View Question Bank' :
                undefined
              }
              style={{
                ...((cardAnim === 'in') ? {} : { pointerEvents: 'none' }),
                backdropFilter: 'blur(16px)',
                transition: `all ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1)`
              }}
            >
              <div className="mb-8 flex items-center justify-center w-32 h-32 rounded-full bg-white/60 shadow">
                <FontAwesomeIcon icon={cardData[animIdx].icon} className={`text-6xl ${cardData[animIdx].iconColor}`} />
              </div>
              <div className="text-3xl font-bold text-gray-800 text-center mb-3 drop-shadow">{cardData[animIdx].title}</div>
              <div className="text-gray-500 text-center text-lg">Click to view</div>
            </div>
          </div>
          {/* All card titles row below the stack, reduced font size, selectable and clickable */}
          <div className="flex items-center justify-center gap-4 mt-6 select-none">
            {cardData.map((card, idx) => (
              <span
                key={card.title}
                className={`cursor-pointer text-base sm:text-lg md:text-xl font-semibold transition-all duration-300 px-2
                  ${animIdx === idx ? `${card.activeTextColor} font-bold scale-110` : 'text-gray-400 opacity-70'}`}
                onClick={() => animIdx !== idx && cardAnim === 'in' && animateTo(idx)}
                style={{ userSelect: 'text' }}
              >
                {card.title}
              </span>
            ))}
          </div>
          {/* Right Arrow */}
          <button
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-white/70 hover:bg-white/90 rounded-full p-2 shadow border border-gray-200"
            aria-label="Next"
            disabled={cardAnim === 'out'}
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-2xl text-gray-400" />
          </button>
        </div>
        {/* Short Notes Modal */}
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-[98vw] h-[98vh] max-w-none max-h-none flex flex-col relative animate-fadeIn overflow-hidden" style={{ padding: 0 }}>
              <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white/80 z-10">
                <h2 className="text-2xl font-bold text-[#007dc6]">
                  {modalType === 'shortNotes' && 'Short Notes'}
                  {modalType === 'conceptSummary' && 'Concept Summary'}
                  {modalType === 'glossary' && 'Glossary'}
                  {modalType === 'menmonics' && 'Mnemonics'}
                </h2>
                <button
                  className="text-gray-400 hover:text-blue-500 text-2xl font-bold"
                  onClick={() => setModalType(null)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              {loadingModal ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : modalError ? (
                <div className="flex-1 flex items-center justify-center text-red-500 text-center">{modalError}</div>
              ) : (
                <iframe
                  srcDoc={modalContent || ''}
                  title={
                    modalType === 'shortNotes' ? 'Short Notes' :
                    modalType === 'conceptSummary' ? 'Concept Summary' :
                    modalType === 'glossary' ? 'Glossary' :
                    modalType === 'menmonics' ? 'Mnemonics' :
                    'Content'
                  }
                  className="flex-1 w-full h-full border-0"
                  style={{ background: 'white' }}
                />
              )}
            </div>
          </div>
        )}
        {/* Question Bank Practice Modal */}
        {showQBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-[98vw] h-[98vh] max-w-none max-h-none flex flex-col relative animate-fadeIn overflow-hidden" style={{ padding: 0 }}>
              <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white/80 z-10">
                <h2 className="text-2xl font-bold text-[#007dc6]">Practice: Question Bank</h2>
                <button
                  className="text-gray-400 hover:text-blue-500 text-2xl font-bold"
                  onClick={() => setShowQBankModal(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center w-full h-full p-4 bg-gray-50 overflow-y-auto">
                {loadingQuestions ? (
                  <div className="flex-1 flex items-center justify-center text-lg text-gray-400">Loading questions...</div>
                ) : questionsError ? (
                  <div className="flex-1 flex items-center justify-center text-red-500 text-lg">{questionsError}</div>
                ) : questions.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">No questions found for this lesson.</div>
                ) : (
                  <div className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col gap-6 glass-card relative transition-all duration-500 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400">Question {currentQIdx + 1} of {questions.length}</span>
                    </div>
                    {questions[currentQIdx].image && (
                      <img src={questions[currentQIdx].image} alt="Question diagram" className="w-full h-32 object-contain mb-2 rounded-lg border bg-white" />
                    )}
                    <div className="font-semibold text-lg text-gray-800 min-h-[3.5rem]">
                      {renderQuestionWithLatex(questions[currentQIdx].question)}
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                      {questions[currentQIdx].options.map((opt: { key: string; text: string }, i: number) => {
                        const correctText = questions[currentQIdx].correct.trim();
                        const correctIdx = questions[currentQIdx].options.findIndex(
                          (o: { key: string; text: string }) => o.text.trim() === correctText
                        );
                        return (
                          <button
                            key={i}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-base border transition-all duration-300 focus:outline-none
                              ${selectedOption === i ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-100 hover:bg-blue-50'}
                              ${answerChecked && i === correctIdx ? 'bg-green-100 border-green-400 text-green-700' : ''}
                              ${answerChecked && selectedOption === i && i !== correctIdx ? 'bg-red-100 border-red-400 text-red-700' : ''}
                              ${optionAnim[i] || ''}
                            `}
                            onClick={() => handleSelectOption(i)}
                            disabled={answerChecked}
                          >
                            <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                            {renderOptionWithLatex(opt.text)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-6 gap-4">
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                        onClick={handlePrev}
                        disabled={currentQIdx === 0}
                      >Previous</button>
                      <div className="flex gap-2">
                        {!answerChecked && (
                          <button
                            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition"
                            onClick={handleCheckAnswer}
                            disabled={selectedOption === null}
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
                        disabled={currentQIdx === questions.length - 1}
                      >Next</button>
                    </div>
                    {answerChecked && showExplanation && selectedOption !== null && (() => {
                      const selectedText = questions[currentQIdx].options[selectedOption]?.text.trim();
                      const correctText = questions[currentQIdx].correct.trim();
                      const isCorrect = selectedText === correctText;
                      let reasonType = null, reasonText = '';
                      if (questions[currentQIdx].sillyOption && selectedText === questions[currentQIdx].sillyOption.trim()) {
                        reasonType = 'Silly Mistake';
                        reasonText = questions[currentQIdx].sillyReason || '';
                      } else if (questions[currentQIdx].conceptualOption && selectedText === questions[currentQIdx].conceptualOption.trim()) {
                        reasonType = 'Conceptual Mistake';
                        reasonText = questions[currentQIdx].conceptualReason || '';
                      } else if (questions[currentQIdx].minorOption && selectedText === questions[currentQIdx].minorOption.trim()) {
                        reasonType = 'Minor Mistake';
                        reasonText = questions[currentQIdx].minorReason || '';
                      }
                      const correctIdx = questions[currentQIdx].options.findIndex(
                        (opt: { key: string; text: string }) => opt.text.trim() === correctText
                      );
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
                                {String.fromCharCode(65 + correctIdx)}. {renderOptionWithLatex(questions[currentQIdx].options[correctIdx]?.text)}
                              </span>
                            </div>
                          )}
                          {/* Explanation and solution */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/80 rounded-xl p-4 border border-blue-100 shadow">
                              <div className="font-bold text-blue-700 mb-1">Explanation</div>
                              {renderOptionWithLatex(questions[currentQIdx].explanation)}
                            </div>
                            {questions[currentQIdx].solution && (
                              <div className="bg-white/80 rounded-xl p-4 border border-yellow-100 shadow">
                                <div className="font-bold text-yellow-700 mb-1">Solution</div>
                                {renderOptionWithLatex(questions[currentQIdx].solution)}
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
      </main>
    </div>
  );
} 