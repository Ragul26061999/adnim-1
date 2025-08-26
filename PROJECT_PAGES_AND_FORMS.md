# Project Pages and Forms Overview

This document provides a detailed list of all completed pages and forms in each module of the project, based on the current file structure.

---

## 1. Assessment Question Bank

**Pages & Forms:**

- `assessments/create-test.tsx`  
  _Form: Create Test_
- `assessments/manage-test/[id]/page.tsx`  
  _Page: Manage Single Test (likely includes edit form)_
- `assessments/manage-tests/page.tsx`  
  _Page: Manage All Tests_
- `assessments/mock-create-test/page.tsx`  
  _Form: Mock Create Test_
- `assessments/page.tsx`  
  _Page: Assessments Overview_
- `components/SelectQuestionsDialog.tsx`  
  _Component: Select Questions Dialog (likely a form)_
- `components/SenseAIPickDialog.tsx`  
  _Component: AI Question Picker Dialog (likely a form)_
- `components/SenseAIPickResultsDialog.tsx`  
  _Component: AI Pick Results Dialog_
- `dashboard/page.tsx`  
  _Page: Assessment Dashboard_
- `page.tsx`  
  _Page: Assessment Question Bank Home_
- `pyq/neet/page.tsx`  
  _Page: NEET Previous Year Questions (may include search/filter forms)_
- `pyq/page.tsx`  
  _Page: Previous Year Questions Overview_
- `question-bank/page.tsx`  
  _Page: Question Bank_
- `questionbank/view-edueron-questions/page.tsx`  
  _Page: View Edueron Questions_
- `results/page.tsx`  
  _Page: Results Overview_
- `results/view/[studentId]/page.tsx`  
  _Page: View Results for Student_
- `results/view/page.tsx`  
  _Page: View All Results_

---

## 2. Content Management

**Pages & Forms:**

- `edueron-content/page.tsx`  
  _Page: Edueron Content_
- `lesson-details/page.tsx`  
  _Page: Lesson Details_
- `lesson-list/page.tsx`  
  _Page: Lesson List_
- `manage-school-content/notes-management/page.tsx`  
  _Page: Notes Management (likely includes a form)_
- `manage-school-content/page.tsx`  
  _Page: Manage School Content_
- `page.tsx`  
  _Page: Content Management Home_
- `components/ContentSidebar.tsx`  
  _Component: Content Sidebar_

---

## 3. Dashboard

**Pages:**

- `dashboard/page.tsx`  
  _Page: Dashboard_
- `dashboard-glass/page.tsx`  
  _Page: Dashboard Glass (alternative dashboard UI)_

---

## 4. ClassaScreen

**Pages:**

- `classaScreen/page.tsx`  
  _Page: ClassaScreen_

---

## 5. Authentication

**Pages & Forms:**

- `login/page.tsx`  
  _Page: Login (includes login form)_
- `components/AuthGuard.tsx`  
  _Component: Auth Guard (route protection)_
- `components/Header.tsx`  
  _Component: Header_
- `components/Sidebar.tsx`  
  _Component: Sidebar_

---

## 6. Archive

**Pages:**

- `archive/app_classaScreen/page.tsx`  
  _Page: Archived ClassaScreen_

---

## 7. Root Pages

**Pages:**

- `app/page.tsx`  
  _Page: App Home_

---

# Summary Table

| Module                   | Page/Component Path                             | Type        | Description/Notes       |
| ------------------------ | ----------------------------------------------- | ----------- | ----------------------- |
| Assessment Question Bank | assessments/create-test.tsx                     | Form        | Create Test             |
|                          | assessments/manage-test/[id]/page.tsx           | Page/Form   | Manage/Edit Single Test |
|                          | assessments/manage-tests/page.tsx               | Page        | Manage All Tests        |
|                          | assessments/mock-create-test/page.tsx           | Form        | Mock Create Test        |
|                          | assessments/page.tsx                            | Page        | Assessments Overview    |
|                          | components/SelectQuestionsDialog.tsx            | Dialog/Form | Select Questions        |
|                          | components/SenseAIPickDialog.tsx                | Dialog/Form | AI Question Picker      |
|                          | components/SenseAIPickResultsDialog.tsx         | Dialog      | AI Pick Results         |
|                          | dashboard/page.tsx                              | Page        | Assessment Dashboard    |
|                          | page.tsx                                        | Page        | Assessment Home         |
|                          | pyq/neet/page.tsx                               | Page        | NEET PYQ                |
|                          | pyq/page.tsx                                    | Page        | PYQ Overview            |
|                          | question-bank/page.tsx                          | Page        | Question Bank           |
|                          | questionbank/view-edueron-questions/page.tsx    | Page        | View Edueron Questions  |
|                          | results/page.tsx                                | Page        | Results Overview        |
|                          | results/view/[studentId]/page.tsx               | Page        | Student Results         |
|                          | results/view/page.tsx                           | Page        | All Results             |
| Content Management       | edueron-content/page.tsx                        | Page        | Edueron Content         |
|                          | lesson-details/page.tsx                         | Page        | Lesson Details          |
|                          | lesson-list/page.tsx                            | Page        | Lesson List             |
|                          | manage-school-content/notes-management/page.tsx | Page/Form   | Notes Management        |
|                          | manage-school-content/page.tsx                  | Page        | Manage School Content   |
|                          | page.tsx                                        | Page        | Content Management Home |
| Dashboard                | dashboard/page.tsx                              | Page        | Dashboard               |
|                          | dashboard-glass/page.tsx                        | Page        | Dashboard Glass         |
| ClassaScreen             | classaScreen/page.tsx                           | Page        | ClassaScreen            |
| Authentication           | login/page.tsx                                  | Page/Form   | Login                   |
| Archive                  | archive/app_classaScreen/page.tsx               | Page        | Archived ClassaScreen   |
| Root                     | app/page.tsx                                    | Page        | App Home                |

---

**Notes:**

- **Forms** are present in: assessment creation, mock test creation, manage test (edit), notes management, and login.
- **Dialog components** (SelectQuestionsDialog, SenseAIPickDialog) likely contain forms for user input.
- **Some pages** (like results, dashboards, and overviews) are likely display-only, but may have search/filter forms.
