const BlockedUser = require('../models/BlockedUser');

const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    // Prevent blocking yourself
    if (parseInt(userId) === blockerId) {
      return res.status(400).json({ error: 'Kendinizi engelleyemezsiniz' });
    }

    const block = await BlockedUser.block(blockerId, userId);

    if (!block) {
      return res.status(400).json({ error: 'Bu kullanıcıyı zaten engellediniz' });
    }

    res.json({ message: 'Kullanıcı başarıyla engellendi', block });
  } catch (error) {
    console.error('Block user error:', error);
    if (error.message === 'Cannot block yourself') {
      return res.status(400).json({ error: 'Kendinizi engelleyemezsiniz' });
    }
    res.status(500).json({ error: 'Kullanıcı engellenirken bir hata oluştu' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    const success = await BlockedUser.unblock(blockerId, userId);

    if (!success) {
      return res.status(404).json({ error: 'Bu kullanıcı engellemedeki kullanıcılar arasında değil' });
    }

    res.json({ message: 'Kullanıcının engeli kaldırıldı' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Engel kaldırılırken bir hata oluştu' });
  }
};

const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.userId;

    const blockedUsers = await BlockedUser.getBlockedUsers(userId);

    res.json(blockedUsers);
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: 'Engellenen kullanıcılar yüklenirken bir hata oluştu' });
  }
};

const checkIfBlocked = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    const isBlocked = await BlockedUser.isBlocked(blockerId, userId);

    res.json({ isBlocked });
  } catch (error) {
    console.error('Check if blocked error:', error);
    res.status(500).json({ error: 'Engel durumu kontrol edilirken bir hata oluştu' });
  }
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkIfBlocked
};
