# Content Filtering for Blocked Users - Implementation Guide

## Overview
This document outlines the changes needed to filter out content from blocked users in the news feed and comments.

## Backend Changes Required

### 1. Update UserNews Model (models/UserNews.js)

#### Method: `getNewsFeed` (lines 43-61)
**Current WHERE clause:**
```sql
WHERE un.user_id = $1
   OR un.user_id IN (
     SELECT followed_id FROM user_follows WHERE follower_id = $1
   )
```

**Updated WHERE clause (add blocking filter):**
```sql
WHERE (un.user_id = $1
   OR un.user_id IN (
     SELECT followed_id FROM user_follows WHERE follower_id = $1
   ))
   AND un.user_id NOT IN (
     SELECT blocked_id FROM blocked_users WHERE blocker_id = $1
   )
```

#### Method: `getAllPublic` (lines 63-75)
This method needs to accept an optional `userId` parameter to filter blocked users.

**Current signature:**
```javascript
static async getAllPublic(limit = 20, offset = 0)
```

**Updated signature:**
```javascript
static async getAllPublic(limit = 20, offset = 0, userId = null)
```

**Updated query (when userId is provided):**
```sql
SELECT un.*, u.username,
       (SELECT COUNT(*)::int FROM news_likes WHERE news_id = un.id) as like_count,
       (SELECT COUNT(*)::int FROM news_comments WHERE news_id = un.id) as comment_count
FROM user_news un
JOIN users u ON un.user_id = u.id
WHERE ($3::int IS NULL OR un.user_id NOT IN (
  SELECT blocked_id FROM blocked_users WHERE blocker_id = $3
))
ORDER BY un.created_at DESC
LIMIT $1 OFFSET $2
```

### 2. Update News Controller (controllers/newsController.js)

#### Method: `getAllNews` (lines 117-126)
Update to pass userId to the model:

```javascript
async getAllNews(req, res) {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user ? req.user.userId : null; // Get user if authenticated
    const news = await UserNews.getAllPublic(parseInt(limit), parseInt(offset), userId);
    res.json(news);
  } catch (error) {
    console.error('Error getting all news:', error);
    res.status(500).json({ error: 'Haberler getirilirken bir hata oluştu' });
  }
}
```

### 3. Update Comment Model (models/Comment.js)

#### Method: `getByNewsId`
Add filtering for comments from blocked users.

Find the main query that retrieves comments and add this to the WHERE clause:
```sql
AND ($2::int IS NULL OR c.user_id NOT IN (
  SELECT blocked_id FROM blocked_users WHERE blocker_id = $2
))
```

Also filter replies from blocked users:
```sql
AND ($2::int IS NULL OR r.user_id NOT IN (
  SELECT blocked_id FROM blocked_users WHERE blocker_id = $2
))
```

## Frontend Changes (Optional - for better UX)

### Add visual indicator for blocked status
In user profile pages or article authors, you can show if a user is blocked.

### Add quick block/unblock buttons
- In article detail page (next to author name)
- In comment sections (next to commenter name)
- In user profile pages

## Testing the Implementation

1. **Test News Feed Filtering:**
   - User A blocks User B
   - User B creates an article
   - User A should NOT see User B's article in their feed

2. **Test Public News Filtering:**
   - User A blocks User B
   - User A views the public news feed
   - User B's articles should NOT appear

3. **Test Comment Filtering:**
   - User A blocks User B
   - User B comments on an article
   - User A should NOT see User B's comments

4. **Test Nested Comment Filtering:**
   - User A blocks User B
   - User B replies to another comment
   - User A should NOT see User B's replies

## Database Query Performance Note

The blocking filter uses `NOT IN` with a subquery. This is efficient for small blocking lists but consider adding an index if users block many people:

```sql
-- Already created in migration 014
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
```

## API Endpoints Reference

- `POST /api/blocks/:userId` - Block a user
- `DELETE /api/blocks/:userId` - Unblock a user
- `GET /api/blocks/` - Get list of blocked users
- `GET /api/blocks/check/:userId` - Check if a user is blocked

## Summary

The blocking system is fully implemented on the backend with database tables, models, controllers, and routes. The only remaining task is to update the SQL queries in the UserNews and Comment models to filter out content from blocked users.

All changes are backward compatible - if a user hasn't blocked anyone, the queries will work exactly as before.
