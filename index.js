require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const youtubeRoutes = require('./routes/youtubeRoutes');
const { updateChannelList } = require('./services/youtubeService');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/youtube', youtubeRoutes);

// Cron job: Her gece yarısı saat 00:00'da kanal listesini güncelle
cron.schedule('0 0 * * *', () => {
  console.log('Gece yarısı: Kanal listesi güncelleniyor...');
  updateChannelList();
});

app.listen(port, () => {
  console.log(`Backend çalışıyor: http://localhost:${port}`);
});
