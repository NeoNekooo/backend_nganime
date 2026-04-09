const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'Accept': 'text/html,application/xhtml+xml,application/xml',
};

async function crackFull() {
    try {
        const url = 'https://otakudesu.blog/episode/mitnyr-episode-1-sub-indo/';
        const episodeRes = await axios.get(url, { headers: stealthHeaders });
        const $ = cheerio.load(episodeRes.data);
        
        let mirrorData = null;
        let mirrorProvider = null;
        // Prioritaskan ODFiles atau sekalian kumpulkan semua
        const mirrors = [];
        $('.mirrorstream ul li a').each((i, el) => {
            const dataBase64 = $(el).attr('data-content');
            const provider = $(el).text().trim();
            if (dataBase64) {
                 mirrors.push({ provider, dataBase64 });
            }
        });
        
        // Pilih ODFiles atau opsi terbaik (hindari mega)
        const bestMirror = mirrors.find(m => m.provider.toLowerCase().includes('odfile') || m.provider.toLowerCase().includes('desu')) || mirrors[0];
        console.log("Selected Mirror:", bestMirror.provider);

        const decoded = JSON.parse(Buffer.from(bestMirror.dataBase64, 'base64').toString('ascii'));

        const nonceRes = await axios.post('https://otakudesu.blog/wp-admin/admin-ajax.php', qs.stringify({action: 'aa1208d27f29ca340c92c66d1926f13f'}), {
            headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const nonce = nonceRes.data.data;

        const iframeReq = {
            q: decoded.q,
            i: decoded.i.toString(),
            id: decoded.id.toString(),
            action: "2a3505c93b0035d3f455df82bf976b84",
            nonce: nonce,
        };
        const iframeRes = await axios.post('https://otakudesu.blog/wp-admin/admin-ajax.php', qs.stringify(iframeReq), {
            headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const payloadData = iframeRes.data.data;
        const iframeHtml = Buffer.from(payloadData, 'base64').toString('ascii');
        const iframeSrc = cheerio.load(iframeHtml)('iframe').attr('src');
        console.log("IFRAME SRC:", iframeSrc);

        // SEKARANG KITA EKSTRAK MP4 DARI DESUSTREAM
        if (iframeSrc && !iframeSrc.includes('mega.nz')) {
            console.log("Fetching Desustream embed...");
            const embedRes = await axios.get(iframeSrc, { headers: stealthHeaders });
            // console.log(embedRes.data.substring(0, 100)); // Cek HTML
            const fileMatch = embedRes.data.match(/(?:'|")file(?:'|")\s*:\s*(?:'|")(.+?)(?:'|")/i) || embedRes.data.match(/\[{'file':'(.+?)','type/i);
            if (fileMatch) {
               console.log("REAL MP4:", fileMatch[1]);
            } else {
               console.log("No file match found!");
            }
        }

    } catch(e) {
        console.log("Error:", e.message);
    }
}
crackFull();
