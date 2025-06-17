require('dotenv').config();
const express = require('express');
const cors = require('cors');
const youtubeRoutes = require('./routes/youtubeRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// YouTube ile ilgili route'lar
app.use('/api/youtube', youtubeRoutes);

app.listen(port, () => {
  console.log(`Backend çalışıyor: http://localhost:${port}`);
});
