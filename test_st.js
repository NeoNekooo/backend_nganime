const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'Accept': 'text/html,application/xhtml+xml,application/xml',
};

async function crack() {
    const url = 'https://otakudesu.blog/episode/mitnyr-episode-1-sub-indo/';
    console.log(`[VIDEO] Mencari Link (Manual Cracker) untuk: ${url}`);
    
    const episodeRes = await axios.get(url, { headers: stealthHeaders, timeout: 10000 });
    const $ = cheerio.load(episodeRes.data);
    
    const mirrors = [];
    $('.mirrorstream ul li a').each((i, el) => {
        const dataBase64 = $(el).attr('data-content');
        const provider = $(el).text().trim().toLowerCase();
        if (dataBase64) mirrors.push({ provider, dataBase64 });
    });

    const prioritas = ['odfiles', 'odfile', 'desudrive', 'desustream', 'desu'];
    let selectedMirror = mirrors.find(m => prioritas.some(p => m.provider.includes(p)));
    if (!selectedMirror) selectedMirror = mirrors.find(m => !m.provider.includes('mega')) || mirrors[0];

    console.log(`[VIDEO] Terpilih Mirror: ${selectedMirror.provider}`);
    const decoded = JSON.parse(Buffer.from(selectedMirror.dataBase64, 'base64').toString('ascii'));
    
    const nonceRes = await axios.post('https://otakudesu.blog/wp-admin/admin-ajax.php', qs.stringify({action: 'aa1208d27f29ca340c92c66d1926f13f'}), {
        headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000
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
        headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000
    });
    
    const payloadData = iframeRes.data.data;
    const iframeHtml = Buffer.from(payloadData, 'base64').toString('ascii');
    const iframeSrc = cheerio.load(iframeHtml)('iframe').attr('src');
    
    console.log(`[VIDEO] FINAL EMBED SRC: ${iframeSrc}`);

    if (iframeSrc && !iframeSrc.includes('mega.nz')) {
         console.log(`[VIDEO] Unpacking HTML Player dari: ${iframeSrc}`);
         const embedRes = await axios.get(iframeSrc, { headers: stealthHeaders, timeout: 10000 });
         let embedHtml = embedRes.data;
         
         const packedRegex = /eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/s;
         const packedMatch = embedHtml.match(packedRegex);
         if (packedMatch) {
             console.log("[VIDEO] Packed JS found.");
             const pMatch = packedMatch[0].match(/return p}\('(.*?)',\s*(\d+),\s*(\d+),\s*'([^']+)'\.split/s);
             if (pMatch) {
                 let p = pMatch[1], a = parseInt(pMatch[2]), c = parseInt(pMatch[3]), k = pMatch[4].split('|');
                 let e = (c) => (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
                 while(c--) if(k[c]) p = p.replace(new RegExp('\\b'+e(c)+'\\b','g'), k[c]);
                 embedHtml = p;
                 console.log("[VIDEO] Unpacked! Length:", embedHtml.length);
             } else {
                 console.log("[VIDEO] pMatch failed on packed JS.");
             }
         } else {
             console.log("[VIDEO] No Packed JS found.");
         }

         const mediaMatch = embedHtml.match(/(https:\/\/[^\s\'\"]+\.(?:m3u8|mp4)[^\s\'\"]*)/i);
         if (mediaMatch) {
             console.log(`[VIDEO] Ketemu M3U8/MP4 Asli: ${mediaMatch[1]}`);
         } else {
             console.log(`[VIDEO] Gagal ekstrak m3u8 dari embed HTML.`);
         }
    }
}
crack();
