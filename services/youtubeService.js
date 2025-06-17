const axios = require('axios');

const classifyChannel = async (req, res) => {
  const { channelId } = req.query;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!channelId) {
    return res.status(400).json({ error: 'channelId parametresi zorunludur.' });
  }

  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`
    );

    const channel = response.data.items[0];

    if (!channel) {
      return res.status(404).json({ error: 'Kanal bulunamadı.' });
    }

    const title = channel.snippet.title;
    const description = (channel.snippet.description || "").toLowerCase();

    // Anahtar kelime analizi
    const keywordMap = {
      gazeteci: ["gazeteci", "köşe yazarı", "muhabir", "siyaset yorumcusu"],
      haber: ["haber", "news", "gündem", "canlı yayın", "breaking"],
    };

    let type = "belirsiz";

    for (const [kategori, kelimeler] of Object.entries(keywordMap)) {
      if (kelimeler.some(kelime => description.includes(kelime))) {
        type = kategori;
        break;
      }
    }

    res.json({
      channelId,
      title,
      type,
      descriptionPreview: description.slice(0, 100)
    });
  } catch (error) {
    console.error("Hata:", error.message);
    res.status(500).json({ error: "YouTube API çağrısı başarısız." });
  }
};

module.exports = { classifyChannel };