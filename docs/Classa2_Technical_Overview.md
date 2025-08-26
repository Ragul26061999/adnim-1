# Classa2 Project Technical Overview

## Technologies Used

### Frontend Technologies
1. **Next.js 15.3.2** - React framework with App Router architecture
2. **React 19.0.0** - JavaScript library for building user interfaces
3. **TypeScript 5+** - Strongly typed programming language
4. **Tailwind CSS 4** - Utility-first CSS framework for styling
5. **Headless UI** - Unstyled, accessible UI components
6. **React-PDF, HTML2Canvas, jsPDF** - PDF generation and manipulation libraries
7. **KaTeX** - Math typesetting library for displaying mathematical notation
8. **Recharts** - Composable charting library for data visualization
9. **React Icons** - Icon library for React applications
10. **FontAwesome** - Icon toolkit

### Backend Technologies
1. **Firebase 11.10.0** - Backend-as-a-Service platform
   - **Firebase Authentication** - User authentication and management
   - **Cloud Firestore** - NoSQL document database
   - **Firebase Storage** - Object storage for files
   - **Firebase Functions** - Serverless cloud functions (Node.js)
   - **Firebase Data Connect** - Database integration service
2. **IndexedDB** (via idb-keyval) - Client-side storage for offline support

### Development & Deployment
1. **Vercel** - Hosting and deployment platform for the frontend
2. **Firebase CLI** - Command-line tools for Firebase management
3. **Turbopack** - JavaScript bundler for development

## Data Architecture

### Database Structure
The project uses **Cloud Firestore**, a NoSQL document-based database with the following key collections:

1. **Users Collection**
   - User profiles with authentication details
   - Role-based access (teachers, students, parents)
   - School affiliations

2. **Educational Hierarchy Collections**
   - `schools` - School information
   - `classes` - Class/grade information
   - `subjects` - Subject details linked to classes
   - `chapters` - Topic breakdown within subjects
   - `lessons` - Individual learning units within chapters
   - `questionCollection` - Question bank for assessments

3. **Assessment Collections**
   - `test` - Test definitions and configurations
   - `testResult` - Test results and analytics
   - `studentAnswers` - Individual student responses
   - `markedAnswers` - Evaluated answers with feedback

4. **Learning Resources Collections**
   - `conceptSummary` - Concept explanations
   - `glossary` - Term definitions
   - `mnemonics` - Memory aids
   - `studyGuide` - Study materials
   - `flashCards` - Learning flashcards
   - `shortNotes` - Condensed notes

5. **Diary Management Collections**
   - `homework` - Academic assignments and tasks
   - `remarks` - Personal observations and feedback for students

### Data Relationships
- Hierarchical structure: School → Classes → Subjects → Chapters → Lessons → Questions
- Reference-based relationships using document IDs (e.g., `classId`, `subjectId`)
- Many-to-many relationships through array fields (e.g., classes in subjects)

### Data Security
- Firebase Authentication for user identity
- Firestore Security Rules for access control
- Role-based permissions (teachers, students, parents)
- School-based data isolation
- Time-limited security rules (expiring June 13, 2025)

## System Architecture

### High-Level Architecture
The system follows a serverless, client-heavy architecture with the following components:

1. **Client Layer**
   - Browser/Mobile Web interface
   - Progressive Web App capabilities
   - Offline support via IndexedDB

2. **Frontend Layer (Next.js on Vercel)**
   - Server-Side Rendering (SSR) and Static Site Generation (SSG)
   - React components with TypeScript
   - Direct integration with Firebase services

3. **Backend Services (Firebase on Google Cloud)**
   - Authentication services
   - Database services (Firestore)
   - Storage services
   - Serverless functions (optional)

### Component Architecture
1. **Authentication System**
   - Firebase Auth with email/password and Google OIDC
   - JWT-based authentication
   - AuthGuard component for protected routes

2. **Data Access Layer**
   - Firestore SDK integration
   - Offline persistence with IndexedDB
   - Real-time data synchronization

3. **UI Component System**
   - Tailwind CSS for styling
   - Headless UI for accessible components
   - Custom form components for data entry

4. **Assessment Engine**
   - Question bank management
   - Test creation and administration
   - Result analysis and reporting

5. **Diary Management System**
   - Homework tracking with priorities
   - Student remarks and feedback
   - Parent communication

### Integration Points
1. **Firebase Integration**
   - Client-side SDK integration via `firebaseClient.ts`
   - Server-side admin SDK for privileged operations
   - Security rules for data access control

2. **Future Integrations**
   - SenseAI for AI-assisted question selection
   - Edge Middleware for auth and A/B testing

## Deployment Architecture

### Hosting Infrastructure
1. **Frontend Hosting**
   - Vercel for Next.js application
   - Edge CDN for static assets
   - Automatic scaling and global distribution

2. **Backend Hosting**
   - Firebase project `edueron-a0ce0`
   - Google Cloud infrastructure
   - Serverless architecture

### CI/CD Pipeline
1. **Development Workflow**
   - Git-based version control
   - PR-based development process
   - Vercel preview deployments per PR

2. **Deployment Process**
   - Push to `main` triggers Vercel build
   - Successful build promotes to production URL
   - Firebase resources updated via CLI

### Monitoring and Observability
1. **Performance Monitoring**
   - Vercel Analytics for frontend metrics
   - Firebase Performance Monitoring for backend
   - Web Vitals tracking

2. **Error Tracking**
   - Planned Sentry integration
   - Firebase Crashlytics

3. **Logging**
   - Vercel Log Drains to BigQuery
   - Centralized log management

## Non-Functional Characteristics

1. **Scalability**
   - Automatic scaling on Vercel and Firebase
   - Serverless architecture for variable load

2. **Security**
   - TLS encryption for data in transit
   - AES-256 encryption for data at rest
   - JWT-based authentication
   - Least privilege security rules

3. **Performance**
   - Edge CDN for static assets
   - Incremental Static Regeneration (ISR)
   - Client-side caching with IndexedDB

4. **Compliance**
   - GDPR and COPPA friendly design
   - Data protection measures

## Future Evolution Path

1. **Technical Enhancements**
   - Firebase Cloud Functions for heavier business logic
   - Edge Middleware for auth and A/B testing
   - Potential containerization with AWS ECS/Fargate for custom microservices

2. **Feature Roadmap**
   - SenseAI integration for AI-assisted question selection
   - Enhanced offline capabilities
   - Advanced analytics and reporting
