const { Odesus, Util } = require('odesus');
const o = new Odesus();

async function test() {
  try {
    const url = 'https://otakudesu.cloud/episode/sndd-episode-12-sub-indo/';
    const slugInfo = Util.resolveSlug(url);
    if (!slugInfo) throw new Error("Gagal resolve slug");
    
    console.log("Slug ditemukan:", slugInfo);
    const result = await o.getEpisode(slugInfo);
    
    // Test ambil stream url dari mirror pertama
    if (result.mirrors && result.mirrors.length > 0) {
        console.log("Mencoba ekstraksi stream dari mirror:", result.mirrors[0].source);
        const streamUrl = await result.mirrors[0].getStreamUrl();
        console.log("STREAM URL BERHASIL:", streamUrl);
    } else {
        console.log("Tidak ada mirror stream.");
    }
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}

test();
