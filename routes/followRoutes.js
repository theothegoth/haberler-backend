const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Follow/Unfollow
router.post('/:userId', followController.followUser);
router.delete('/:userId', followController.unfollowUser);
router.get('/:userId/check', followController.checkFollowing);

// Get followers and following
router.get('/:userId/followers', followController.getFollowers);
router.get('/:userId/following', followController.getFollowing);
router.get('/:userId/counts', followController.getFollowCounts);

// My followers and following
router.get('/my/followers', followController.getMyFollowers);
router.get('/my/following', followController.getMyFollowing);

// Suggestions
router.get('/suggestions/users', followController.getSuggestedUsers);

module.exports = router;
