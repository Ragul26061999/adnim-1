import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { db } from '../../../lib/firebaseClient';
import { doc, DocumentReference } from 'firebase/firestore';
import SelectQuestionsDialog from './SelectQuestionsDialog';
import SenseAIPickDialog from './SenseAIPickDialog';

interface QuestionSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdate: (selected: string[]) => void;
  initialSelected?: string[];
  schoolId?: string | null;
  testId?: DocumentReference;
  onRefreshTest?: () => Promise<void>;
}

type SelectionMode = 'school' | 'edueron' | 'senseai' | null;

const QuestionSelectionDialog: React.FC<QuestionSelectionDialogProps> = ({
  open,
  onClose,
  onUpdate,
  initialSelected = [],
  schoolId,
  testId,
  onRefreshTest
}) => {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(initialSelected);

  const handleModeSelect = (mode: SelectionMode) => {
    setSelectionMode(mode);
  };

  const handleQuestionsUpdate = (questions: string[]) => {
    setSelectedQuestions(questions);
    onUpdate(questions);
  };

  const handleClose = () => {
    setSelectionMode(null);
    onClose();
  };

  const renderModeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Select Question Source
        </h3>
        <p className="text-gray-600">
          Choose how you want to select questions for your test
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* School Questions Option */}
        <div 
          className="relative p-6 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
          onClick={() => handleModeSelect('school')}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              School Questions
            </h4>
            <p className="text-sm text-gray-600">
              Select from your school's question bank
            </p>
          </div>
        </div>

        {/* Edueron Questions Option */}
        <div 
          className="relative p-6 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 hover:shadow-md transition-all duration-200"
          onClick={() => handleModeSelect('edueron')}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Edueron Questions
            </h4>
            <p className="text-sm text-gray-600">
              Access Edueron's comprehensive question database
            </p>
          </div>
        </div>

        {/* SenseAI Pick Option */}
        <div 
          className="relative p-6 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-green-300 hover:shadow-md transition-all duration-200"
          onClick={() => handleModeSelect('senseai')}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              SenseAI Pick
            </h4>
            <p className="text-sm text-gray-600">
              Let AI intelligently select questions based on criteria
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={handleClose}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderSchoolQuestions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          School Questions
        </h3>
        <button
          onClick={() => setSelectionMode(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <SelectQuestionsDialog
        open={true}
        onClose={() => setSelectionMode(null)}
        onUpdate={handleQuestionsUpdate}
        initialSelected={selectedQuestions}
        schoolId={schoolId}
        testId={testId}
        showSchoolQuestions={true}
        onRefreshTest={onRefreshTest}
      />
    </div>
  );

  const renderEdueronQuestions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Edueron Questions
        </h3>
        <button
          onClick={() => setSelectionMode(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <SelectQuestionsDialog
        open={true}
        onClose={() => setSelectionMode(null)}
        onUpdate={handleQuestionsUpdate}
        initialSelected={selectedQuestions}
        schoolId={schoolId}
        testId={testId}
        showSchoolQuestions={false}
        onRefreshTest={onRefreshTest}
      />
    </div>
  );

  const renderSenseAIPick = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          SenseAI Pick
        </h3>
        <button
          onClick={() => setSelectionMode(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <SenseAIPickDialog
        open={true}
        onClose={() => setSelectionMode(null)}
        onSenseAIPick={handleQuestionsUpdate}
        testId={testId}
        onRefreshTest={onRefreshTest}
      />
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-auto p-6">
          {!selectionMode && renderModeSelection()}
          {selectionMode === 'school' && renderSchoolQuestions()}
          {selectionMode === 'edueron' && renderEdueronQuestions()}
          {selectionMode === 'senseai' && renderSenseAIPick()}
        </div>
      </div>
    </Dialog>
  );
};

export default QuestionSelectionDialog; 