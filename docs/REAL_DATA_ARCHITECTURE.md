# Real Data Architecture Document

This document provides a structured overview of the real data architecture for the project, using actual Firestore data and relationships. It covers the main entities, their fields, types, example values, and how they relate to each other.

---

## 1. Users

**Collection:** `users`

| Field        | Type      | Example Value / Reference               | Notes               |
| ------------ | --------- | --------------------------------------- | ------------------- |
| uid          | string    | `1hZln1UGhkWsrdMxtZFoPxSpZf93`          | User ID             |
| email        | string    | `sp@edueron.com`                        |                     |
| display_name | string    | `SP Admin`                              |                     |
| role         | string    | `provider` / `student`                  | User role           |
| schoolId     | ref       | `school/3IfMKX4UXEnHl81bLE3T`           | Reference to school |
| mainBranchID | ref       | `school/3IfMKX4UXEnHl81bLE3T`           | Reference to school |
| providerID   | ref       | `resourceProvider/SkI7VO0Pv7WsuEcUGpGu` |                     |
| created_time | timestamp | `2024-09-10T12:13:58.013Z`              |                     |

---

## 2. Schools

**Collection:** `school`

| Field        | Type      | Example Value / Reference            | Notes |
| ------------ | --------- | ------------------------------------ | ----- |
| name         | string    | `Scholars Path`                      |       |
| address      | string    | `Coimbatore`                         |       |
| mainAdmin    | ref       | `users/1hZln1UGhkWsrdMxtZFoPxSpZf93` |       |
| sp           | boolean   | `true`                               |       |
| contact      | string    | `9876512345`                         |       |
| createdTime  | timestamp | `2024-05-15T06:41:00Z`               |       |
| isBranch     | boolean   | `true`                               |       |
| branchAdmin  | ref       | `users/TQyMK21ZtXMcuBqXQ6DT`         |       |
| mainBranchID | ref       | `school/hicas_cbe`                   |       |

---

## 3. Classes

**Collection:** `classes`

| Field        | Type      | Example Value / Reference               | Notes |
| ------------ | --------- | --------------------------------------- | ----- |
| name         | string    | `Class 12`                              |       |
| createdTime  | timestamp | `2025-02-27T13:02:45.912Z`              |       |
| schoolId     | ref       | `school/hicas_cbe`                      |       |
| providerID   | ref       | `resourceProvider/SkI7VO0Pv7WsuEcUGpGu` |       |
| mainBranchID | ref       | `school/3IfMKX4UXEnHl81bLE3T`           |       |
| sp           | boolean   | `true`                                  |       |

---

## 4. Students

**Collection:** `students`

| Field       | Type      | Example Value / Reference                        | Notes |
| ----------- | --------- | ------------------------------------------------ | ----- |
| name        | string    | `Aarav Sharma`                                   |       |
| email       | string    | `aarav.sharma@email.com`                         |       |
| phone       | string    | `+91 9876543210`                                 |       |
| rollNumber  | string    | `001`                                            |       |
| schoolId    | ref       | `school/3IfMKX4UXEnHl81bLE3T`                    |       |
| classId     | ref       | `classes/FIXRDU2JLhh4Asoy4HGd`                   |       |
| parentName  | string    | `Rajesh Sharma`                                  |       |
| parentPhone | string    | `+91 9876543211`                                 |       |
| parentEmail | string    | `rajesh.sharma@email.com`                        |       |
| dateOfBirth | timestamp | `2008-05-15T00:00:00Z`                           |       |
| address     | string    | `123 Main Street, Coimbatore, Tamil Nadu 641001` |       |
| createdAt   | timestamp | `2025-07-15T18:12:14.011Z`                       |       |
| updatedAt   | timestamp | `2025-07-15T18:12:14.011Z`                       |       |

---

## 5. Teachers

**Collection:** `teachers`

| Field     | Type       | Example Value / Reference         | Notes |
| --------- | ---------- | --------------------------------- | ----- |
| name      | string     | `Dr. Kavitha Nair`                |       |
| email     | string     | `kavitha.nair@school.com`         |       |
| teacherId | string     | `T007`                            |       |
| schoolId  | ref        | `school/3IfMKX4UXEnHl81bLE3T`     |       |
| classes   | array(ref) | `[classes/FIXRDU2JLhh4Asoy4HGd]`  |       |
| subjects  | array(ref) | `[subjects/cN9KIElJtqaoZJD8sAG7]` |       |
| createdAt | timestamp  | `2025-07-15T18:19:45.245Z`        |       |
| updatedAt | timestamp  | `2025-07-15T18:19:45.245Z`        |       |

---

## 6. Subjects

**Collection:** `subjects`

| Field        | Type       | Example Value / Reference               | Notes |
| ------------ | ---------- | --------------------------------------- | ----- |
| name         | string     | `Biology - Class 11th`                  |       |
| schoolId     | ref        | `school/hicas_cbe`                      |       |
| assClass     | array(ref) | `[classes/sV0kgl5IjkRv8nfgk1Pm]`        |       |
| image        | string     | (URL)                                   |       |
| description  | string     | `''`                                    |       |
| mainBranchID | ref        | `school/3IfMKX4UXEnHl81bLE3T`           |       |
| providerID   | ref        | `resourceProvider/SkI7VO0Pv7WsuEcUGpGu` |       |
| majorSubID   | ref        | `majorSubject/6l8J70RnDonLQ8Ff3o6i`     |       |
| classID      | ref        | `classes/Zk79ZZmTcT74cuJTKuQb`          |       |
| order        | number     | `5`                                     |       |
| createdBy    | ref        | `users/5KK3TnpijKO2t33vnHtBO5o65dA3`    |       |
| createdAt    | timestamp  | `2025-07-16T05:06:01.950Z`              |       |

---

## 7. Lessons

**Collection:** `lessons`

| Field       | Type      | Example Value / Reference              | Notes |
| ----------- | --------- | -------------------------------------- | ----- |
| title       | string    | `Wave and Frequency`                   |       |
| description | string    | `Lesson about different type of sound` |       |
| createdAt   | timestamp | `2024-06-06T16:32:25.572Z`             |       |
| classID     | ref       | `classes/Tpta0PsE1sBUXWwEK3Qd`         |       |
| createdBy   | ref       | `users/uVZrm6sXKFfmod1REKWZtoTNCZg1`   |       |
| chapterID   | ref       | `chapters/MsQ1mhdgJgqOwIqvkG8d`        |       |
| schoolID    | ref       | `school/DX9L0YuogAeLtIxmYBmB`          |       |
| video       | string    | (URL)                                  |       |
| subjectID   | ref       | `subjects/2MnnyKtZxhd5Ec0n5G0d`        |       |
| image       | string    | (URL)                                  |       |
| keyConcept  | string    | `''`                                   |       |
| number      | string    | `7.1`                                  |       |
| icon        | string    | (URL)                                  |       |
| order       | number    | `1`                                    |       |

---

## 8. Assignments

**Collection:** `assignments`

| Field          | Type      | Example Value / Reference            | Notes |
| -------------- | --------- | ------------------------------------ | ----- |
| title          | string    | `testing 2`                          |       |
| description    | string    | `this is for testing`                |       |
| class          | string    | `sV0kgl5IjkRv8nfgk1Pm`               |       |
| section        | string    | `''`                                 |       |
| subject        | string    | `0zWtgoA1GjydVCughBL6`               |       |
| chapter        | string    | `''`                                 |       |
| lesson         | string    | `''`                                 |       |
| startDate      | string    | `2025-07-11`                         |       |
| endDate        | string    | `2025-07-17`                         |       |
| attachments    | array     | `[URL]`                              |       |
| createdAt      | timestamp | `2025-07-10T06:38:30.392Z`           |       |
| classId        | ref       | `classes/sV0kgl5IjkRv8nfgk1Pm`       |       |
| subjectId      | ref       | `subjects/0zWtgoA1GjydVCughBL6`      |       |
| chapterId      | ref       | `chapters/gZUMBRo1TKIousyQlWQt`      |       |
| lessonId       | ref       | `lessons/3J1qLs2SxzmKnrCPd2nz`       |       |
| attachmentUrl  | string    | `null`                               |       |
| attachmentName | string    | `null`                               |       |
| schoolId       | ref       | `school/hicas_cbe`                   |       |
| createdBy      | ref       | `users/5KK3TnpijKO2t33vnHtBO5o65dA3` |       |
| topic          | string    | `Biology Lesson - 1 Revision 2`      |       |
| updatedAt      | timestamp | `2025-07-16T05:08:09.195Z`           |       |

---

## 9. Tests

**Collection:** `test`

| Field          | Type       | Example Value / Reference              | Notes |
| -------------- | ---------- | -------------------------------------- | ----- |
| name           | string     | `test 3`                               |       |
| totalQuestions | number     | `15`                                   |       |
| createdBy      | ref        | `users/5wbCg81V9CRHF5VdyQMYKzyTcHV2`   |       |
| chapterID      | ref        | `chapters/T6pToxn5lVfaXClAN1m8`        |       |
| start          | timestamp  | `2025-04-12T08:34:31.895Z`             |       |
| lessonId       | ref        | `lessons/xuUyrshWzMPKlirah1nW`         |       |
| online         | boolean    | `true`                                 |       |
| userID         | array(ref) | `[users/5wbCg81V9CRHF5VdyQMYKzyTcHV2]` |       |
| subjectID      | ref        | `subjects/FZdcRbyhW6siXNR0CoDC`        |       |
| questions      | array      | `[null]` or array of question refs     |       |
| completed      | boolean    | `true`                                 |       |

---

## 10. Test Results

**Collection:** `testResult`

| Field         | Type       | Example Value / Reference                        | Notes |
| ------------- | ---------- | ------------------------------------------------ | ----- |
| studentID     | ref        | `users/3honEmSqPGeh6QOhJ7CrfQbn58g1`             |       |
| testID        | ref        | `test/OugCOyjEzvVKBz8gGIWB`                      |       |
| timeTaken     | number     | `25401`                                          |       |
| totalMark     | number     | `10`                                             |       |
| totalQuestion | number     | `10`                                             |       |
| accuracy      | number     | `NaN`                                            |       |
| wrongAnswer   | array(ref) | `[questionCollection/37Mv9KjlX50Xo2eTp4YC, ...]` |       |
| attempted     | number     | `0`                                              |       |
| correctAnswer | array(ref) | `[questionCollection/0PqSxNbVeIFKgZaP5cbK]`      |       |
| skippedAnswer | array(ref) | `[questionCollection/1vWZIszfBSxmROtbbHfO, ...]` |       |
| completed     | boolean    | `true`                                           |       |
| endTime       | timestamp  | `2025-03-30T18:05:27.552Z`                       |       |

---

## 11. Relationships (Real Data Example)

- **User** → **School**: `users.schoolId` is a reference to a `school` document.
- **Class** → **School**: `classes.schoolId` is a reference to a `school` document.
- **Student** → **Class**: `students.classId` is a reference to a `classes` document.
- **Teacher** → **Class/Subject**: `teachers.classes` and `teachers.subjects` are arrays of references.
- **Assignment** → **Class/Subject/Chapter/Lesson**: Multiple references.
- **TestResult** → **User/Test/Questions**: All as references.

---

## 12. Example Document (User)

```json
{
  "uid": "1hZln1UGhkWsrdMxtZFoPxSpZf93",
  "email": "sp@edueron.com",
  "display_name": "SP Admin",
  "role": "provider",
  "schoolId": "school/3IfMKX4UXEnHl81bLE3T",
  "mainBranchID": "school/3IfMKX4UXEnHl81bLE3T",
  "providerID": "resourceProvider/SkI7VO0Pv7WsuEcUGpGu",
  "created_time": "2024-09-10T12:13:58.013Z"
}
```

---

## 13. Example Document (Assignment)

```json
{
  "title": "testing 2",
  "description": "this is for testing",
  "class": "sV0kgl5IjkRv8nfgk1Pm",
  "subject": "0zWtgoA1GjydVCughBL6",
  "startDate": "2025-07-11",
  "endDate": "2025-07-17",
  "attachments": [
    "https://firebasestorage.googleapis.com/v0/b/edueron-a0ce0.appspot.com/o/assignments%2Frandom_1.png_1752129508995?alt=media&token=e957ec41-158f-410e-84b3-47e38cc35607"
  ],
  "createdAt": "2025-07-10T06:38:30.392Z"
}
```

---

## 14. Example Document (Test Result)

```json
{
  "studentID": "users/3honEmSqPGeh6QOhJ7CrfQbn58g1",
  "testID": "test/OugCOyjEzvVKBz8gGIWB",
  "timeTaken": 25401,
  "totalMark": 10,
  "totalQuestion": 10,
  "accuracy": null,
  "wrongAnswer": [
    "questionCollection/37Mv9KjlX50Xo2eTp4YC",
    "questionCollection/2tjKC1E45jU0g9rbHbok"
  ],
  "attempted": 0,
  "correctAnswer": ["questionCollection/0PqSxNbVeIFKgZaP5cbK"],
  "skippedAnswer": ["questionCollection/1vWZIszfBSxmROtbbHfO"],
  "completed": true,
  "endTime": "2025-03-30T18:05:27.552Z"
}
```

---

## 15. Notes

- **References** are stored as Firestore document paths (e.g., `school/3IfMKX4UXEnHl81bLE3T`).
- **Timestamps** are in ISO format.
- **Arrays** are used for multi-valued fields (e.g., `attachments`, `classes`, `subjects`).
- **Field names** may vary slightly between documents (e.g., `classId` vs `classID`).
