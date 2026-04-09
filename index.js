const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const { Odesus } = require('odesus');

const app = express();
const port = process.env.PORT || 4000;
const otakudesu = new Odesus();
const baseUrl = 'https://otakudesu.blog';

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

app.use(cors());
app.use(express.json());

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': baseUrl,
    'Connection': 'keep-alive'
};

// Helper: Scrape List Anime
async function scrapeOtakuList(url, cacheKey) {
    const saved = cache.get(cacheKey);
    if (saved) return saved;

    try {
        console.log(`[OTAKU] Memanggil: ${url}`);
        const response = await axios.get(url, { headers: stealthHeaders, timeout: 10000 });
        const $ = cheerio.load(response.data);
        const animeList = [];

        $('.venz ul li').each((i, el) => {
            const anchor = $(el).find('a').first();
            const title = $(el).find('.jdlflm').text().trim();
            const image = $(el).find('img').attr('src');
            const href = anchor.attr('href');
            const status = $(el).find('.epz').text().trim();

            if (title && href) {
                animeList.push({ name: title, image: image, url: href, status: status });
            }
        });

        if (animeList.length > 0) {
            cache.set(cacheKey, animeList);
            return animeList;
        }
        return [];
    } catch (e) {
        console.error('Error Scrape:', e.message);
        return [];
    }
}

// Helper: Extract Video Link dari Link.Desustream (Base64)
function decodeDesuLink(url) {
    try {
        if (url.includes('id=')) {
            const base64Part = url.split('id=')[1];
            const decoded = Buffer.from(base64Part, 'base64').toString('ascii');
            return decoded;
        }
    } catch (e) {
        return null;
    }
    return null;
}

// --- ENDPOINTS ---

app.get('/api/ongoing', async (req, res) => {
    const data = await scrapeOtakuList(`${baseUrl}/ongoing-anime/`, 'ongoing_otaku');
    res.json({ status: "success", data: data });
});

app.get('/api/complete', async (req, res) => {
    const data = await scrapeOtakuList(`${baseUrl}/complete-anime/`, 'complete_otaku');
    res.json({ status: "success", data: data });
});

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    try {
        console.log(`[OTAKU] Mencari: ${query}`);
        const response = await axios.get(`${baseUrl}/?s=${query}&post_type=anime`, { headers: stealthHeaders, timeout: 10000 });
        const $ = cheerio.load(response.data);
        const searchResults = [];

        $('.chivsrc li').each((i, el) => {
            const anchor = $(el).find('h2 a');
            const title = anchor.text().trim();
            const href = anchor.attr('href');
            const image = $(el).find('img').attr('src');

            let status = "-";
            $(el).find('.set').each((idx, setEl) => {
                const text = $(setEl).text();
                if (text.includes('Status')) {
                    status = text.replace('Status : ', '').trim();
                } else if (text.includes('Rating') && status === "-") {
                    status = text.replace('Rating : ', '').trim();
                }
            });

            if (title && href) {
                searchResults.push({ name: title, image: image, url: href, status: status });
            }
        });

        res.json({ status: "success", data: searchResults });
    } catch (e) {
        console.error('Error Search:', e.message);
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.get('/api/anime/detail', async (req, res) => {
    const url = req.query.url;
    try {
        console.log(`[DETAIL] Membedah: ${url}`);
        const response = await axios.get(url, { headers: stealthHeaders, timeout: 10000 });
        const $ = cheerio.load(response.data);

        const episodes = [];
        $('.episodelist ul li').each((i, el) => {
            const a = $(el).find('span a').first();
            const title = a.text().trim();
            const href = a.attr('href');
            if (href && title && !title.toLowerCase().includes('batch')) {
                episodes.push({ title: title, url: href });
            }
        });

        res.json({
            status: "success",
            data: {
                name: $('.fotoanime img').attr('title') || $('h1.entry-title').text().trim(),
                image: $('.fotoanime img').attr('src'),
                episodes: episodes
            }
        });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.get('/api/episode/player', async (req, res) => {
    const url = req.query.url;
    try {
        console.log(`[VIDEO] Mencari Link (Manual Cracker) untuk: ${url}`);

        const qs = require('qs');
        const episodeRes = await axios.get(url, { headers: stealthHeaders, timeout: 10000 });
        const $ = cheerio.load(episodeRes.data);

        const mirrors = [];
        $('.mirrorstream ul li a').each((i, el) => {
            const dataBase64 = $(el).attr('data-content');
            const provider = $(el).text().trim().toLowerCase();
            if (dataBase64) mirrors.push({ provider, dataBase64 });
        });

        if (mirrors.length === 0) {
            console.log(`[VIDEO] Gagal menemukan mirror base64 data.`);
            return res.status(404).json({ status: "error", message: "Gagal menemukan mirror." });
        }

        let finalStreamUrl = null;
        let successfulProvider = null;

        // Coba mirror satu per satu, prioritaskan yang BUKAN mega
        mirrors.sort((a, b) => {
            if (a.provider.includes('vidhide') || a.provider.includes('odfile')) return -1;
            if (a.provider.includes('mega')) return 1;
            return 0;
        });

        for (let mirror of mirrors) {
            try {
                if (mirror.provider.includes('mega')) continue; // Skip mega as it's impossible to play in flutter directly

                console.log(`[VIDEO] Mencoba Mirror: ${mirror.provider}`);
                const decoded = JSON.parse(Buffer.from(mirror.dataBase64, 'base64').toString('ascii'));

                const nonceRes = await axios.post('https://otakudesu.blog/wp-admin/admin-ajax.php', qs.stringify({ action: 'aa1208d27f29ca340c92c66d1926f13f' }), { headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 });
                const nonce = nonceRes.data.data;

                const iframeReq = { q: decoded.q, i: decoded.i.toString(), id: decoded.id.toString(), action: "2a3505c93b0035d3f455df82bf976b84", nonce: nonce };
                const iframeRes = await axios.post('https://otakudesu.blog/wp-admin/admin-ajax.php', qs.stringify(iframeReq), { headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 });

                const iframeHtml = Buffer.from(iframeRes.data.data, 'base64').toString('ascii');
                const iframeSrc = cheerio.load(iframeHtml)('iframe').attr('src');
                if (!iframeSrc) continue;

                console.log(`[VIDEO] Embed HTML dari mirror ${mirror.provider}: ${iframeSrc}`);
                const embedRes = await axios.get(iframeSrc, { headers: stealthHeaders, timeout: 10000 });
                let embedHtml = embedRes.data;

                const packedRegex = /eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/s;
                const packedMatch = embedHtml.match(packedRegex);
                if (packedMatch) {
                    const pMatch = packedMatch[0].match(/return p}\('(.*?)',\s*(\d+),\s*(\d+),\s*'([^']+)'\.split/s);
                    if (pMatch) {
                        let p = pMatch[1], a = parseInt(pMatch[2]), c = parseInt(pMatch[3]), k = pMatch[4].split('|');
                        let e = (c) => (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
                        while (c--) if (k[c]) p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
                        embedHtml = p;
                    }
                }

                const mediaMatch = embedHtml.match(/(https:\/\/[^\s\'\"]+\.(?:m3u8|mp4)[^\s\'\"]*)/i);
                if (mediaMatch) {
                    finalStreamUrl = mediaMatch[1];
                    successfulProvider = mirror.provider;
                    console.log(`[VIDEO] BERHASIL! Diperoleh dari ${successfulProvider}: ${finalStreamUrl}`);
                    break;
                }
            } catch (ex) {
                console.log(`[VIDEO] Error di mirror ${mirror.provider}: ${ex.message}`);
                continue;
            }
        }

        if (finalStreamUrl) {
            res.json({ status: "success", stream_url: finalStreamUrl, provider: successfulProvider });
        } else {
            console.log(`[VIDEO] Gagal mendapatkan Direct MP4 / M3U8 dari semua sumber.`);
            res.status(404).json({ status: "error", message: "Video tidak tersedia (Server Mega/Terproteksi). Coba episode lain." });
        }

    } catch (e) {
        console.error(`[VIDEO FAIL] ${e.message}`);
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.listen(port, () => {
    console.log(`
    =========================================
    NGANIME - OTAKUDESU.BLOG (ANTI-KELINCI) 🏠🚀
    Port/Cloud: ${port}
    Status: "Kunci Master" Video Aktif! 🚫🐰
    =========================================
    `);
});
