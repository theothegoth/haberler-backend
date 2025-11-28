DELETE FROM notifications WHERE user_id = (SELECT id FROM users WHERE username = 'Theodorich');
