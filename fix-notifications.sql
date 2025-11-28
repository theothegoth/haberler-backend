-- Delete notifications for articles that no longer exist
DELETE FROM notifications 
WHERE entity_type = 'news' 
AND entity_id NOT IN (SELECT id FROM user_news);

-- Delete notifications from users that no longer exist (if any remained)
DELETE FROM notifications 
WHERE actor_id IS NOT NULL 
AND actor_id NOT IN (SELECT id FROM users);

-- Mark all notifications as read for admin to reset state
UPDATE notifications 
SET is_read = true 
WHERE user_id = (SELECT id FROM users WHERE username = 'admin');

