# Assessment System Documentation

## Overview

The assessment system is a comprehensive module for creating, managing, and analyzing tests and assessments. It's located in the `/assessment-question-bank` directory and provides a complete workflow from test creation to result analysis.

## 🏗️ System Architecture

### Main Components:

1. **Dashboard** (`/assessment-question-bank/dashboard`)

   - Central hub with navigation to all assessment features
   - Overview cards for Assessments, Question Bank, and Results

2. **Assessment Management** (`/assessment-question-bank/assessments`)

   - Create Assessment
   - Manage Assessments
   - View Completed Assessments

3. **Question Bank** (`/assessment-question-bank/question-bank`)

   - Organize and manage questions
   - Filter by class, subject, chapter, lesson
   - Support for Edueron questions and school-specific questions

4. **Results & Analytics** (`/assessment-question-bank/results`)

   - View test results
   - Download reports
   - Performance analytics

5. **Previous Year Questions (PYQ)** (`/assessment-question-bank/pyq`)
   - NEET PYQ practice
   - JEE PYQ practice
   - PDF generation capabilities

## 📊 Database Structure

### Core Collections:

#### 1. `test` Collection

```javascript
{
  id: "auto-generated",
  name: "Test Name",
  totalQuestions: 15,
  createdBy: DocumentReference, // Reference to users collection
  classId: DocumentReference,   // Reference to classes collection
  start: Timestamp,            // Test start time
  end: Timestamp,              // Test end time
  online: boolean,             // Published status
  userID: [DocumentReference], // Array of user references (for selective students)
  subjectID: DocumentReference, // Reference to subjects collection
  questions: [DocumentReference], // Array of question references
  completed: boolean,          // Test completion status
  wholeClass: boolean,        // Whether assigned to whole class
  schoolID: DocumentReference, // Reference to school collection
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 2. `testResult` Collection

```javascript
{
  id: "auto-generated",
  studentID: DocumentReference,    // Reference to users collection
  testID: DocumentReference,       // Reference to test collection
  timeTaken: number,              // Time taken in milliseconds
  totalMark: number,              // Total marks scored
  totalQuestion: number,          // Total questions in test
  accuracy: number,               // Accuracy percentage
  wrongAnswer: [DocumentReference], // Array of wrong question references
  attempted: number,              // Number of questions attempted
  correctAnswer: [DocumentReference], // Array of correct question references
  skippedAnswer: [DocumentReference], // Array of skipped question references
  completed: boolean,             // Whether test was completed
  endTime: Timestamp,            // When test was completed
  startTime: Timestamp           // When test was started
}
```

#### 3. `questionCollection` Collection

```javascript
{
  id: "auto-generated",
  question: "Question text",
  optionA: "Option A text",
  optionB: "Option B text",
  optionC: "Option C text",
  optionD: "Option D text",
  correct: "Correct answer",
  explanation: "Explanation text",
  solution: "Solution text",
  difficulty: "easy|medium|hard",
  bloom: "Bloom's taxonomy level",
  schoolID: DocumentReference,    // Reference to school collection
  sp: boolean,                   // Whether it's an Edueron question
  previous: boolean,             // Whether it's a previous year question
  year: number,                  // Year for PYQ
  actNo: number,                 // Question number
  classId: DocumentReference,    // Reference to classes collection
  subjectId: DocumentReference,  // Reference to subjects collection
  chapterId: DocumentReference,  // Reference to chapters collection
  lessonId: DocumentReference    // Reference to lessons collection
}
```

## 🎯 Key Features

### 1. Test Creation

- **Custom Tests**: Create tests with custom questions
- **NEET Mock Tests**: Specialized NEET exam preparation
- **JEE Mock Tests**: Specialized JEE exam preparation
- **PYQ Tests**: Previous year question tests
- **Student Assignment**: Assign to whole class or selective students
- **Time Management**: Set start and end times
- **Question Selection**: Choose from question bank or AI-generated questions

### 2. Question Management

- **Question Bank**: Comprehensive question repository
- **Filtering**: By class, subject, chapter, lesson, difficulty
- **Question Types**: Multiple choice with LaTeX support
- **Metadata**: Difficulty levels, Bloom's taxonomy, explanations
- **School-specific**: Questions can be school-specific or Edueron-wide

### 3. Test Administration

- **Status Management**: Draft, published, ongoing, finished
- **PDF Generation**: Download test papers as PDF
- **LaTeX Support**: Mathematical expressions and formulas
- **Question Preview**: Preview questions with explanations

### 4. Results & Analytics

- **Performance Tracking**: Time taken, accuracy, scores
- **Detailed Analysis**: Correct/wrong/skipped answers
- **Comparative Reports**: Student and class performance
- **Export Capabilities**: Download results and reports

### 5. PYQ System

- **Year-wise Organization**: Questions organized by year
- **Practice Mode**: Interactive practice with explanations
- **PDF Export**: Generate question papers for offline use
- **NEET/JEE Specific**: Specialized for competitive exams

## 🔧 Technical Implementation

### Frontend Technologies:

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling and responsive design
- **FontAwesome**: Icons and UI elements
- **React KaTeX**: LaTeX rendering for mathematical expressions
- **html2pdf.js**: PDF generation capabilities

### Backend Services:

- **Firebase Firestore**: NoSQL database
- **Firebase Authentication**: User management
- **Firebase Storage**: File storage for attachments
- **Firebase Security Rules**: Access control

### Key Components:

#### Sidebar Navigation

```typescript
const navItems = [
  {
    name: "Dashboard",
    icon: faChartBar,
    href: "/assessment-question-bank/dashboard",
  },
  {
    name: "Question Bank",
    icon: faBook,
    href: "/assessment-question-bank/question-bank",
  },
  {
    name: "Assessments",
    icon: faTasks,
    href: "/assessment-question-bank/assessments",
  },
  {
    name: "Results",
    icon: faChartBar,
    href: "/assessment-question-bank/results",
  },
];
```

#### Question Selection Dialog

- Advanced filtering by class, subject, chapter, lesson
- LaTeX rendering for mathematical expressions
- Difficulty and Bloom's taxonomy tagging
- Bulk selection capabilities

#### Test Management Interface

- CRUD operations for tests
- Status management (draft, published, ongoing, finished)
- PDF generation with LaTeX support
- Student assignment management

## 📈 Workflow

### 1. Test Creation Workflow:

1. Navigate to Assessments → Create Assessment
2. Select test type (Custom, NEET Mock, JEE Mock, PYQ)
3. Fill test details (name, time, class, students)
4. Select questions from question bank or use AI
5. Publish test for students

### 2. Question Management Workflow:

1. Navigate to Question Bank
2. Filter questions by criteria
3. Add/edit questions with metadata
4. Organize by class, subject, chapter, lesson

### 3. Results Analysis Workflow:

1. Navigate to Results
2. View completed tests
3. Analyze individual and class performance
4. Download reports and analytics

## 🔐 Security & Permissions

### Firestore Security Rules:

```javascript
match /test/{document} {
  allow create: if true;
  allow read: if true;
  allow write: if true;
  allow delete: if false;
}

match /testResult/{document} {
  allow create: if true;
  allow read: if true;
  allow write: if true;
  allow delete: if false;
}
```

### Access Control:

- School-based data isolation
- Role-based permissions (teachers, students, admins)
- User authentication required for sensitive operations

## 🚀 Advanced Features

### 1. AI Integration

- **SenseAI Pick Dialog**: AI-powered question selection
- **Smart Question Recommendations**: Based on difficulty and topic
- **Automated Test Generation**: AI creates balanced tests

### 2. PDF Generation

- **LaTeX Support**: Mathematical expressions in PDFs
- **Watermarking**: Security features for question papers
- **Custom Styling**: Professional formatting for exams

### 3. Analytics & Reporting

- **Performance Metrics**: Accuracy, time analysis, progress tracking
- **Comparative Analysis**: Student vs class performance
- **Trend Analysis**: Performance over time

## 📁 File Structure

```
app/assessment-question-bank/
├── dashboard/
│   └── page.tsx                 # Main dashboard
├── assessments/
│   ├── page.tsx                 # Assessment management hub
│   ├── create-test.tsx          # Basic test creation
│   ├── manage-tests/
│   │   └── page.tsx            # Test management interface
│   └── mock-create-test/
│       └── page.tsx            # Advanced test creation
├── components/
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── SelectQuestionsDialog.tsx # Question selection dialog
│   ├── SenseAIPickDialog.tsx   # AI question picker
│   └── SenseAIPickResultsDialog.tsx # AI results display
├── question-bank/
│   └── page.tsx                # Question bank management
├── results/
│   ├── page.tsx                # Results dashboard
│   └── view/
│       └── [studentId]/
│           └── page.tsx        # Individual student results
├── pyq/
│   ├── page.tsx                # PYQ dashboard
│   └── neet/
│       ├── page.tsx            # NEET PYQ interface
│       ├── PDFDownloadButton.tsx # PDF download component
│       ├── QuestionPaperPDF.tsx # PDF generation
│       └── latexToDataUrl.ts   # LaTeX to image conversion
└── page.tsx                    # Root redirect
```

## 🎨 UI/UX Features

### Design System:

- **Glass Morphism**: Modern glass-like UI elements
- **Responsive Design**: Mobile-first approach
- **Color Coding**: Status-based color schemes
- **Loading States**: Smooth loading animations
- **Error Handling**: User-friendly error messages

### Interactive Elements:

- **Modal Dialogs**: For question selection and configuration
- **Real-time Updates**: Live status changes
- **Drag & Drop**: For question reordering
- **Search & Filter**: Advanced filtering capabilities

## 📊 Data Analytics

### Performance Metrics:

- **Test Completion Rate**: Percentage of students who completed tests
- **Average Score**: Mean performance across tests
- **Time Analysis**: Average time taken per question
- **Difficulty Analysis**: Performance by question difficulty
- **Progress Tracking**: Student improvement over time

### Reporting Features:

- **Individual Reports**: Student-specific performance
- **Class Reports**: Aggregate class performance
- **Comparative Analysis**: Student vs class averages
- **Trend Analysis**: Performance over multiple tests
- **Export Options**: PDF, CSV, Excel formats

## 🔄 Integration Points

### With Other Systems:

- **User Management**: Integration with Firebase Auth
- **School Management**: Links to school, class, subject data
- **Learning Management**: Connection to lessons and chapters
- **Content Management**: Integration with educational content

### External Services:

- **Firebase Services**: Authentication, Firestore, Storage
- **PDF Generation**: html2pdf.js for document creation
- **LaTeX Rendering**: KaTeX for mathematical expressions
- **AI Services**: Integration with SenseAI for question selection

## 🚀 Future Enhancements

### Planned Features:

- **Real-time Collaboration**: Live test taking with proctoring
- **Advanced Analytics**: Machine learning-based insights
- **Mobile App**: Native mobile application
- **Offline Support**: Offline test taking capabilities
- **Video Integration**: Video-based questions
- **Adaptive Testing**: Dynamic question difficulty adjustment

### Technical Improvements:

- **Performance Optimization**: Faster loading and response times
- **Scalability**: Support for larger datasets
- **Security Enhancements**: Advanced security measures
- **API Development**: RESTful API for external integrations

## 📝 Best Practices

### Development Guidelines:

- **Type Safety**: Use TypeScript for all components
- **Component Reusability**: Create reusable UI components
- **Error Handling**: Implement comprehensive error handling
- **Testing**: Write unit and integration tests
- **Documentation**: Maintain up-to-date documentation

### Database Design:

- **Normalization**: Proper data normalization
- **Indexing**: Optimize query performance
- **Security**: Implement proper access controls
- **Backup**: Regular data backup procedures

## 🛠️ Maintenance

### Regular Tasks:

- **Data Cleanup**: Remove outdated test data
- **Performance Monitoring**: Monitor system performance
- **Security Updates**: Regular security patches
- **User Training**: Regular user training sessions
- **Feature Updates**: Continuous feature improvements

### Troubleshooting:

- **Common Issues**: Document common problems and solutions
- **Support System**: Establish support channels
- **Monitoring**: Implement system monitoring
- **Logging**: Comprehensive logging for debugging

---

_This documentation provides a comprehensive overview of the assessment system. For specific implementation details, refer to the individual component files in the codebase._
