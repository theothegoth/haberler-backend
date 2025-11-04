const pool = require('../config/database');

const testArticles = [
  {
    title: "Yapay Zeka Teknolojisi Hızla Gelişiyor",
    content: "Son yıllarda yapay zeka teknolojisi muazzam bir gelişim gösterdi. ChatGPT ve benzeri dil modelleri, insan-bilgisayar etkileşimini tamamen değiştirdi. Artık yapay zeka, kod yazabilir, makale oluşturabilir ve karmaşık problemleri çözebilir. Gelecekte bu teknolojinin daha da yaygınlaşması bekleniyor.",
    category: "technology",
    tags: ["yapay-zeka", "teknoloji", "chatgpt"]
  },
  {
    title: "İstanbul'da Yeni Metro Hattı Açıldı",
    content: "İstanbul'un ulaşım ağına yeni bir metro hattı daha eklendi. Yeni hat, şehrin kuzey bölgelerini merkeze bağlayarak günlük yolculuk sürelerini önemli ölçüde azaltacak. Proje, sürdürülebilir şehir ulaşımı için önemli bir adım olarak değerlendiriliyor.",
    category: "local",
    tags: ["istanbul", "metro", "ulaşım"]
  },
  {
    title: "Dünya Kupası Elemeleri Heyecan Verici Geçiyor",
    content: "2026 Dünya Kupası elemeleri tüm hızıyla devam ediyor. Milli takımlar, kupada yer almak için zorlu maçlara çıkıyor. Taraftarlar, takımlarının performansını büyük bir heyecanla takip ediyor. Eleme gruplarında sürpriz sonuçlar görülüyor.",
    category: "sports",
    tags: ["futbol", "dünya-kupası", "spor"]
  },
  {
    title: "Ekonomide Yeni Tedbirler Açıklandı",
    content: "Hükümet, ekonomik istikrarı sağlamak için yeni tedbirler paketi açıkladı. Paket, enflasyonla mücadele ve büyüme hedeflerine yönelik önemli adımlar içeriyor. Uzmanlar, tedbirlerin etkilerinin önümüzdeki aylarda görüleceğini belirtiyor.",
    category: "economy",
    tags: ["ekonomi", "tedbirler", "enflasyon"]
  },
  {
    title: "Yeni Eğitim Sistemi Tartışılıyor",
    content: "Eğitim sisteminde yapılması planlanan değişiklikler kamuoyunda tartışma yaratıyor. Öğretmenler, veliler ve akademisyenler önerilen değişiklikler hakkında farklı görüşler dile getiriyor. Eğitim Bakanlığı, tüm paydaşların görüşlerini dikkate alacağını açıkladı.",
    category: "education",
    tags: ["eğitim", "sistem", "tartışma"]
  },
  {
    title: "Sanat Galerilerinde Yeni Sergiler",
    content: "İstanbul'un önde gelen sanat galerilerinde yeni sergiler açıldı. Yerli ve yabancı sanatçıların eserleri sanatseverlerle buluşuyor. Modern sanat akımlarından klasik eserlere kadar geniş bir yelpaze sunuluyor. Sergiler büyük ilgi görüyor.",
    category: "culture",
    tags: ["sanat", "sergi", "kültür"]
  },
  {
    title: "Bilim İnsanları Yeni Keşif Yaptı",
    content: "Bilim dünyasında heyecan yaratan bir keşif yapıldı. Araştırmacılar, uzun yıllardır üzerinde çalıştıkları projede önemli bir ilerleme kaydetti. Keşfin, tıp ve biyoloji alanında devrim yaratması bekleniyor. Detaylar önümüzdeki günlerde açıklanacak.",
    category: "science",
    tags: ["bilim", "keşif", "araştırma"]
  },
  {
    title: "Dünyadan Güncel Haberler",
    content: "Dünya genelinde önemli gelişmeler yaşanıyor. Uluslararası toplantılarda önemli kararlar alındı. Küresel sorunlara çözüm arayışları sürüyor. Ülkeler arası işbirliği güçleniyor. Barış ve istikrar için çabalar devam ediyor.",
    category: "world",
    tags: ["dünya", "uluslararası", "güncel"]
  },
  {
    title: "Sağlık Sisteminde Yenilikler",
    content: "Sağlık sisteminde dijital dönüşüm hız kazanıyor. Online randevu ve e-reçete uygulamaları yaygınlaşıyor. Hastalar, sağlık hizmetlerine daha kolay erişebiliyor. Dijitalleşme, sağlık hizmetlerinin kalitesini artırıyor ve bekleme sürelerini azaltıyor.",
    category: "health",
    tags: ["sağlık", "dijital", "yenilik"]
  },
  {
    title: "Teknoloji Şirketleri Yeni Ürünler Tanıttı",
    content: "Dünyaca ünlü teknoloji şirketleri yeni ürünlerini tanıttı. Akıllı telefonlardan laptoplara, tabletlerden giyilebilir teknolojilere kadar birçok yeni cihaz piyasaya sürüldü. Tüketiciler, yeni özellikleri merakla bekliyor.",
    category: "technology",
    tags: ["teknoloji", "ürün", "yenilik"]
  }
];

const addTestArticles = async () => {
  try {
    console.log('Fetching users from database...');

    // Get all users
    const usersResult = await pool.query('SELECT id, username, email FROM users ORDER BY id');
    const users = usersResult.rows;

    if (users.length === 0) {
      console.log('No users found in database.');
      process.exit(0);
    }

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.email})`);
    });

    console.log('\nAdding test articles...');

    let articleCount = 0;
    // Distribute articles among users
    for (let i = 0; i < testArticles.length; i++) {
      const article = testArticles[i];
      const user = users[i % users.length]; // Distribute articles evenly among users

      try {
        const result = await pool.query(
          `INSERT INTO user_news (user_id, title, content, category, image_url, tags, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id`,
          [
            user.id,
            article.title,
            article.content,
            article.category,
            '', // empty image_url
            article.tags
          ]
        );

        console.log(`  ✅ Added article "${article.title}" for user ${user.username}`);
        articleCount++;
      } catch (err) {
        console.error(`  ❌ Failed to add article for ${user.username}:`, err.message);
      }
    }

    console.log(`\n✅ Successfully added ${articleCount} test articles!`);
    console.log('\nYou can now test the follow functionality and news feed.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test articles:', error.message);
    process.exit(1);
  }
};

addTestArticles();
