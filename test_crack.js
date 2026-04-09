const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function crackVideo(url) {
    try {
        console.log("Fetching episode HTML...");
        const episodeRes = await axios.get(url, { headers: stealthHeaders });
        const $ = cheerio.load(episodeRes.data);
        
        let mirrorData = null;
        $('.mirrorstream ul li a').each((i, el) => {
            const dataBase64 = $(el).attr('data-content');
            if (dataBase64) mirrorData = dataBase64;
        });

        if (!mirrorData) {
            console.log("No mirror data found"); return;
        }
        console.log("Found Mirror Base64:", mirrorData);
        
        const decoded = JSON.parse(Buffer.from(mirrorData, 'base64').toString('ascii'));
        console.log("Decoded:", decoded);

        // First we might need the nonce? Odesus says nonce is aa1208d27f29ca340c92c66d1926f13f 
        // Wait, Odesus gets nonce by POSTing action: "aa1208d27f29ca340c92c66d1926f13f"
        console.log("Getting nonce...");
        const nonceRes = await axios.post('https://otakudesu.blog/wp-admin/admin-ajax.php', qs.stringify({action: 'aa1208d27f29ca340c92c66d1926f13f'}), {
            headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const nonce = nonceRes.data.data;
        console.log("Nonce:", nonce);

        console.log("Posting to get iframe...");
        // Then get iframe with action: 2a3505c93b0035d3f455df82bf976b84
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
        console.log("Iframe res data:", iframeRes.data.substring(0, 50));
        
        let iframeHtml = "";
        if (iframeRes.data && iframeRes.data.data) {
             iframeHtml = Buffer.from(iframeRes.data.data, 'base64').toString('ascii');
        } else {
             // Maybe it's just the exact html?
             iframeHtml = iframeRes.data;
        }
        
        console.log("Iframe HTML excerpt:", iframeHtml.substring(0, 50));
        const iframeSrc = cheerio.load(iframeHtml)('iframe').attr('src');
        console.log("FINAL EMBED SRC:", iframeSrc);
        
    } catch(e) {
        console.error("Error:", e.message);
    }
}
crackVideo('https://otakudesu.blog/episode/ypkks-episode-13-sub-indo/');
