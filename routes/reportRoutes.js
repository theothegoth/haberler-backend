const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReportStats,
  getReportById,
  updateReportStatus,
  deleteReport,
  createReportValidation,
  updateReportStatusValidation
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

// User endpoints - require authentication
router.post('/', authenticate, createReportValidation, createReport);

// Admin endpoints - require authentication (add admin check middleware later if needed)
router.get('/', authenticate, getReports);
router.get('/stats', authenticate, getReportStats);
router.get('/:reportId', authenticate, getReportById);
router.patch('/:reportId/status', authenticate, updateReportStatusValidation, updateReportStatus);
router.delete('/:reportId', authenticate, deleteReport);

module.exports = router;
