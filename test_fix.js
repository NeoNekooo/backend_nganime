const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'Accept': 'text/html,application/xhtml+xml,application/xml',
};

async function checkFix() {
    try {
        const url = 'https://otakudesu.blog/episode/mitnyr-episode-1-sub-indo/';
        const episodeRes = await axios.get(url, { headers: stealthHeaders });
        const $ = cheerio.load(episodeRes.data);
        
        const mirrors = [];
        $('.mirrorstream ul li a').each((i, el) => {
            const dataBase64 = $(el).attr('data-content');
            const provider = $(el).text().trim();
            if (dataBase64) mirrors.push({ provider, dataBase64 });
        });
        
        const bestMirror = mirrors.find(m => m.provider.toLowerCase().includes('odfile') || m.provider.toLowerCase().includes('desudrive')) || mirrors[0];
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
        
        const iframeSrc = cheerio.load(Buffer.from(iframeRes.data.data, 'base64').toString('ascii'))('iframe').attr('src');
        console.log("IFRAME SRC:", iframeSrc);

        if (iframeSrc && iframeSrc.includes('desustream.com')) {
            const embedRes = await axios.get(iframeSrc, { headers: stealthHeaders });
            const pageData = embedRes.data;
            const fileMatch = pageData.match(/['"]file['"]\s*:\s*['"](.*?)['"]/i) || pageData.match(/<source[^>]+src=['"](.*?)['"]/i);
            console.log("Extracted stream:", fileMatch ? fileMatch[1] : "NOT FOUND");
        }
    } catch(e) {
        console.log(e.message);
    }
}
checkFix();
