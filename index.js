require('dotenv').config();
const express = require('express');
const cors = require('cors');
const youtubeRoutes = require('./routes/youtubeRoutes');
const { updateVideoCache } = require('./services/youtubeService'); // <-- Burada ekledik
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/youtube', youtubeRoutes);

// Cron job: 15 dakikada bir video cache güncelle
cron.schedule('*/15 * * * *', async () => {
  try {
    await updateVideoCache('TR'); // <-- Doğrudan servis fonksiyonu çağrılıyor
    console.log('✅ Otomatik video cache güncellendi.');
  } catch (error) {
    console.error('❌ Otomatik video cache güncellenirken hata:', error.message);
  }
});

app.listen(port, () => {
  console.log(`Backend çalışıyor: http://localhost:${port}`);
});
