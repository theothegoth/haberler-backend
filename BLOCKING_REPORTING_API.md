# User Blocking & Reporting API Documentation

## Overview
This document provides complete API documentation for the User Blocking and Content Reporting features.

---

## User Blocking API

Base URL: `/api/blocks`

All blocking endpoints require authentication.

### 1. Block a User
Block another user to hide their content from your feed.

**Endpoint:** `POST /api/blocks/:userId`
**Authentication:** Required
**Parameters:**
- `userId` (URL parameter) - The ID of the user to block

**Response Success (200):**
```json
{
  "message": "Kullanıcı başarıyla engellendi",
  "block": {
    "id": 1,
    "blocker_id": 5,
    "blocked_id": 10,
    "created_at": "2025-01-10T10:30:00.000Z"
  }
}
```

**Response Errors:**
- `400` - Already blocked or trying to block yourself
  ```json
  {
    "error": "Bu kullanıcıyı zaten engellediniz"
  }
  ```
  or
  ```json
  {
    "error": "Kendinizi engelleyemezsiniz"
  }
  ```
- `500` - Server error

### 2. Unblock a User
Remove a user from your blocked list.

**Endpoint:** `DELETE /api/blocks/:userId`
**Authentication:** Required
**Parameters:**
- `userId` (URL parameter) - The ID of the user to unblock

**Response Success (200):**
```json
{
  "message": "Kullanıcının engeli kaldırıldı"
}
```

**Response Errors:**
- `404` - User is not in your blocked list
  ```json
  {
    "error": "Bu kullanıcı engellemedeki kullanıcılar arasında değil"
  }
  ```
- `500` - Server error

### 3. Get Blocked Users List
Retrieve a list of all users you have blocked.

**Endpoint:** `GET /api/blocks/`
**Authentication:** Required
**Parameters:** None

**Response Success (200):**
```json
[
  {
    "id": 1,
    "blocked_id": 10,
    "created_at": "2025-01-10T10:30:00.000Z",
    "username": "blockeduser123",
    "profile_picture": "/uploads/profiles/user123.jpg"
  },
  {
    "id": 2,
    "blocked_id": 15,
    "created_at": "2025-01-09T15:20:00.000Z",
    "username": "anotheruser",
    "profile_picture": null
  }
]
```

**Response Errors:**
- `500` - Server error

### 4. Check if User is Blocked
Check if you have blocked a specific user.

**Endpoint:** `GET /api/blocks/check/:userId`
**Authentication:** Required
**Parameters:**
- `userId` (URL parameter) - The ID of the user to check

**Response Success (200):**
```json
{
  "isBlocked": true
}
```

**Response Errors:**
- `500` - Server error

---

## Content Reporting API

Base URL: `/api/reports`

### 1. Create a Report (User Endpoint)
Report an article or comment for moderation.

**Endpoint:** `POST /api/reports/`
**Authentication:** Required
**Request Body:**
```json
{
  "reportedType": "article",  // or "comment"
  "reportedId": 123,
  "reason": "Spam",  // Max 100 characters
  "description": "This article contains spam links and promotional content."  // Optional, max 1000 characters
}
```

**Response Success (201):**
```json
{
  "message": "Rapor başarıyla gönderildi. İnceleme yapılacaktır.",
  "report": {
    "id": 1,
    "reporter_id": 5,
    "reported_type": "article",
    "reported_id": 123,
    "reason": "Spam",
    "description": "This article contains spam links...",
    "status": "pending",
    "created_at": "2025-01-10T10:30:00.000Z"
  }
}
```

**Response Errors:**
- `400` - Validation error or already reported
  ```json
  {
    "error": "Bu içeriği zaten bildirdiniz"
  }
  ```
  or
  ```json
  {
    "error": "Geçersiz rapor türü"
  }
  ```
- `404` - Reported content not found
  ```json
  {
    "error": "Bildirilen içerik bulunamadı"
  }
  ```
- `500` - Server error

### 2. Get All Reports (Admin Endpoint)
Retrieve all reports with optional status filtering.

**Endpoint:** `GET /api/reports/`
**Authentication:** Required (Admin)
**Query Parameters:**
- `status` (optional) - Filter by status: `pending`, `reviewed`, `action_taken`, `dismissed`
- `limit` (optional, default: 50) - Number of reports to return
- `offset` (optional, default: 0) - Offset for pagination

**Response Success (200):**
```json
[
  {
    "id": 1,
    "reporter_id": 5,
    "reporter_username": "reporter123",
    "reported_type": "article",
    "reported_id": 123,
    "reason": "Spam",
    "description": "Contains spam links",
    "status": "pending",
    "admin_notes": null,
    "reviewed_by": null,
    "reviewer_username": null,
    "reviewed_at": null,
    "created_at": "2025-01-10T10:30:00.000Z",
    "updated_at": "2025-01-10T10:30:00.000Z",
    "content": {
      "id": 123,
      "title": "Article Title",
      "content_preview": "First 500 characters of content...",
      "user_id": 20,
      "author_username": "articleauthor",
      "created_at": "2025-01-09T12:00:00.000Z"
    }
  }
]
```

**Response Errors:**
- `500` - Server error

### 3. Get Report Statistics (Admin Endpoint)
Get count of reports by status.

**Endpoint:** `GET /api/reports/stats`
**Authentication:** Required (Admin)
**Parameters:** None

**Response Success (200):**
```json
{
  "pending": 15,
  "reviewed": 8,
  "action_taken": 12,
  "dismissed": 5
}
```

**Response Errors:**
- `500` - Server error

### 4. Get Single Report (Admin Endpoint)
Get detailed information about a specific report.

**Endpoint:** `GET /api/reports/:reportId`
**Authentication:** Required (Admin)
**Parameters:**
- `reportId` (URL parameter) - The ID of the report

**Response Success (200):**
```json
{
  "id": 1,
  "reporter_id": 5,
  "reporter_username": "reporter123",
  "reporter_email": "reporter@example.com",
  "reported_type": "comment",
  "reported_id": 456,
  "reason": "Inappropriate Content",
  "description": "Comment contains offensive language",
  "status": "pending",
  "admin_notes": null,
  "reviewed_by": null,
  "reviewer_username": null,
  "reviewed_at": null,
  "created_at": "2025-01-10T10:30:00.000Z",
  "updated_at": "2025-01-10T10:30:00.000Z",
  "content": {
    "id": 456,
    "content": "The actual comment text here",
    "user_id": 30,
    "author_username": "commenter",
    "news_id": 17,
    "created_at": "2025-01-10T09:00:00.000Z"
  }
}
```

**Response Errors:**
- `404` - Report not found
  ```json
  {
    "error": "Rapor bulunamadı"
  }
  ```
- `500` - Server error

### 5. Update Report Status (Admin Endpoint)
Update the status of a report and add admin notes.

**Endpoint:** `PATCH /api/reports/:reportId/status`
**Authentication:** Required (Admin)
**Parameters:**
- `reportId` (URL parameter) - The ID of the report

**Request Body:**
```json
{
  "status": "action_taken",  // One of: pending, reviewed, action_taken, dismissed
  "adminNotes": "Content removed and user warned."  // Optional, max 1000 characters
}
```

**Response Success (200):**
```json
{
  "message": "Rapor durumu güncellendi",
  "report": {
    "id": 1,
    "reporter_id": 5,
    "reported_type": "article",
    "reported_id": 123,
    "reason": "Spam",
    "description": "Contains spam links",
    "status": "action_taken",
    "admin_notes": "Content removed and user warned.",
    "reviewed_by": 1,
    "reviewed_at": "2025-01-10T14:30:00.000Z",
    "created_at": "2025-01-10T10:30:00.000Z",
    "updated_at": "2025-01-10T14:30:00.000Z"
  }
}
```

**Response Errors:**
- `400` - Validation error
  ```json
  {
    "error": "Geçersiz durum değeri"
  }
  ```
- `404` - Report not found
- `500` - Server error

### 6. Delete Report (Admin Endpoint)
Permanently delete a report.

**Endpoint:** `DELETE /api/reports/:reportId`
**Authentication:** Required (Admin)
**Parameters:**
- `reportId` (URL parameter) - The ID of the report

**Response Success (200):**
```json
{
  "message": "Rapor silindi"
}
```

**Response Errors:**
- `404` - Report not found
  ```json
  {
    "error": "Rapor bulunamadı"
  }
  ```
- `500` - Server error

---

## Common Report Reasons (Suggested)

For the `reason` field in reports, here are suggested values:
- "Spam"
- "Inappropriate Content"
- "Harassment"
- "Misinformation"
- "Copyright Violation"
- "Hate Speech"
- "Violence"
- "Other"

---

## Report Status Values

- `pending` - Report submitted, awaiting admin review
- `reviewed` - Admin has reviewed but no action taken yet
- `action_taken` - Admin took action (content removed, user warned, etc.)
- `dismissed` - Report was reviewed and dismissed as invalid

---

## Error Responses

All endpoints may return these common errors:

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error message in Turkish"
}
```

---

## Rate Limiting

All API endpoints are rate-limited:
- General API endpoints: Uses `apiLimiter` middleware
- Auth endpoints: Uses `authLimiter` middleware

---

## Authentication

All endpoints (except login/register) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The token is automatically included by the `apiClient` axios instance on the frontend.

---

## Content Filtering Behavior

When a user blocks another user:
1. **News Feed:** Blocked user's articles won't appear in your personalized feed
2. **Public News:** Blocked user's articles won't appear in the public news listing (when authenticated)
3. **Comments:** Blocked user's comments and replies won't be visible
4. **Notifications:** You won't receive notifications from blocked users

---

## Frontend Integration Examples

### Block a User
```javascript
import apiClient from './api';

const blockUser = async (userId) => {
  try {
    const response = await apiClient.post(`/blocks/${userId}`);
    console.log(response.data.message); // Success message
  } catch (error) {
    console.error(error.response?.data?.error);
  }
};
```

### Report Content
```javascript
import apiClient from './api';

const reportArticle = async (articleId, reason, description) => {
  try {
    const response = await apiClient.post('/reports', {
      reportedType: 'article',
      reportedId: articleId,
      reason: reason,
      description: description
    });
    alert(response.data.message);
  } catch (error) {
    alert(error.response?.data?.error || 'Error submitting report');
  }
};
```

### Get Blocked Users
```javascript
import apiClient from './api';

const getBlockedUsers = async () => {
  try {
    const response = await apiClient.get('/blocks');
    return response.data; // Array of blocked users
  } catch (error) {
    console.error(error);
    return [];
  }
};
```

---

## Database Schema

### blocked_users Table
```sql
CREATE TABLE blocked_users (
  id SERIAL PRIMARY KEY,
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);
```

### reports Table
```sql
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_type VARCHAR(20) NOT NULL CHECK (reported_type IN ('article', 'comment')),
  reported_id INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  admin_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Next Steps for Full Implementation

1. **Complete content filtering** - Update UserNews and Comment models (see BLOCKING_CONTENT_FILTER_IMPLEMENTATION.md)
2. **Create frontend UI** - Add block/report buttons to articles, comments, and user profiles
3. **Create admin dashboard** - Build interface for reviewing and managing reports
4. **Add notifications** - Notify users when their content is reported/actioned
5. **Add analytics** - Track blocking and reporting trends
