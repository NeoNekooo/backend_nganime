const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/html,application/xhtml+xml,application/xml',
};

async function crackVideo(url) {
    try {
        console.log("Fetching: " + url);
        const episodeRes = await axios.get(url, { headers: stealthHeaders });
        const $ = cheerio.load(episodeRes.data);
        
        let mirrorData = null;
        $('.mirrorstream ul li a').each((i, el) => {
            const dataBase64 = $(el).attr('data-content');
            if (dataBase64) mirrorData = dataBase64;
        });

        if (!mirrorData) {
            console.log("Failed to find mirror base64"); return;
        }
        
        const decoded = JSON.parse(Buffer.from(mirrorData, 'base64').toString('ascii'));
        console.log("Decoded id:", decoded.id, "q:", decoded.q);

        const nonceRes = await axios.post('https://otakudesu.blog/wp-admin/admin-ajax.php', qs.stringify({action: 'aa1208d27f29ca340c92c66d1926f13f'}), {
            headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const nonce = nonceRes.data.data;
        console.log("Nonce:", nonce);

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
        console.log("FINAL EMBED:", iframeSrc);
        
    } catch(e) {
        console.error("Error:", e.message);
    }
}
crackVideo('https://otakudesu.blog/episode/ypkks-episode-13-sub-indo/');
