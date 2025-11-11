const Report = require('../models/Report');
const { body, validationResult } = require('express-validator');

const createReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { reportedType, reportedId, reason, description } = req.body;
    const reporterId = req.user.userId;

    // Verify the reported content exists
    const content = await Report.getReportedContent(reportedType, reportedId);
    if (!content) {
      return res.status(404).json({ error: 'Bildirilen içerik bulunamadı' });
    }

    const report = await Report.create(reporterId, reportedType, reportedId, reason, description);

    res.status(201).json({
      message: 'Rapor başarıyla gönderildi. İnceleme yapılacaktır.',
      report
    });
  } catch (error) {
    console.error('Create report error:', error);
    if (error.message === 'You have already reported this content') {
      return res.status(400).json({ error: 'Bu içeriği zaten bildirdiniz' });
    }
    res.status(500).json({ error: 'Rapor gönderilirken bir hata oluştu' });
  }
};

const getReports = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const reports = await Report.getAll(status, parseInt(limit), parseInt(offset));

    // Get content details for each report
    const reportsWithContent = await Promise.all(
      reports.map(async (report) => {
        const content = await Report.getReportedContent(report.reported_type, report.reported_id);
        return {
          ...report,
          content
        };
      })
    );

    res.json(reportsWithContent);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Raporlar yüklenirken bir hata oluştu' });
  }
};

const getReportStats = async (req, res) => {
  try {
    const stats = await Report.getCountByStatus();
    res.json(stats);
  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({ error: 'Rapor istatistikleri yüklenirken bir hata oluştu' });
  }
};

const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.getById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    // Get content details
    const content = await Report.getReportedContent(report.reported_type, report.reported_id);

    res.json({
      ...report,
      content
    });
  } catch (error) {
    console.error('Get report by ID error:', error);
    res.status(500).json({ error: 'Rapor yüklenirken bir hata oluştu' });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    const reviewedBy = req.user.userId;

    const updatedReport = await Report.updateStatus(reportId, status, reviewedBy, adminNotes);

    if (!updatedReport) {
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    res.json({
      message: 'Rapor durumu güncellendi',
      report: updatedReport
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({ error: 'Rapor güncellenirken bir hata oluştu' });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const deletedReport = await Report.delete(reportId);

    if (!deletedReport) {
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    res.json({ message: 'Rapor silindi' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Rapor silinirken bir hata oluştu' });
  }
};

const createReportValidation = [
  body('reportedType')
    .isIn(['article', 'comment', 'user'])
    .withMessage('Geçersiz rapor türü'),
  body('reportedId')
    .isInt()
    .withMessage('Geçerli bir içerik ID\'si gereklidir'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rapor nedeni gereklidir')
    .isLength({ max: 100 })
    .withMessage('Rapor nedeni en fazla 100 karakter olmalıdır'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Açıklama en fazla 1000 karakter olmalıdır')
];

const updateReportStatusValidation = [
  body('status')
    .isIn(['pending', 'reviewed', 'action_taken', 'dismissed'])
    .withMessage('Geçersiz durum değeri'),
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Yönetici notları en fazla 1000 karakter olmalıdır')
];

module.exports = {
  createReport,
  getReports,
  getReportStats,
  getReportById,
  updateReportStatus,
  deleteReport,
  createReportValidation,
  updateReportStatusValidation
};
