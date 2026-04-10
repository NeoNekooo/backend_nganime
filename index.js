require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const NodeCache = require('node-cache');
const { Odesus } = require('odesus');

const app = express();
const port = process.env.PORT || 4000;
const otakudesu = new Odesus();
const baseUrl = 'https://otakudesu.blog';
const OTAKU_BASE = 'https://otakudesu.asia/';

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// --- MIDDLEWARE KEAMANAN ---
const apiKeyMiddleware = (req, res, next) => {
    const clientKey = req.header('x-api-key');
    const secretKey = process.env.API_KEY || 'nganim-secret-key-2024';

    if (!clientKey || clientKey !== secretKey) {
        console.log(`[AUTH] Akses Ditolak: ${req.ip} mencoba akses tanpa key yang valid.`);
        return res.status(401).json({ 
            status: "error", 
            message: "Unauthorized: API Key tidak valid atau tidak ditemukan." 
        });
    }
    next();
};

app.use(cors());
app.use(express.json());

// --- FIX: URL REWRITER UNTUK HOSTING (DOMAINESIA/PASSENGER) ---
// Beberapa hosting otomatis nambahin /public atau /index.php di depan URL.
// Middleware ini nge-bersihin itu biar route kita tetep cocok.
app.use((req, res, next) => {
    if (req.url.startsWith('/public')) {
        req.url = req.url.replace('/public', '');
    }
    if (req.url.startsWith('/index.php')) {
        req.url = req.url.replace('/index.php', '');
    }
    next();
});

// Terapkan middleware keamanan ke semua route /api
app.use('/api', apiKeyMiddleware);

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
            const title = $(el).find('.jdlflm').text().trim() || $(el).find('h2').text().trim();
            const image = $(el).find('img').attr('src');
            const href = anchor.attr('href');
            let status = $(el).find('.epz').text().trim();
            
            // Fallback status buat list yang beda format
            if (!status) status = $(el).find('.newepisode').text().trim();

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
    const page = req.query.page || 1;
    const url = page > 1 ? `${baseUrl}/ongoing-anime/page/${page}/` : `${baseUrl}/ongoing-anime/`;
    const data = await scrapeOtakuList(url, `ongoing_otaku_p${page}`);
    res.json({ status: "success", data: data });
});

app.get('/api/complete', async (req, res) => {
    const page = req.query.page || 1;
    const url = page > 1 ? `${baseUrl}/complete-anime/page/${page}/` : `${baseUrl}/complete-anime/`;
    const data = await scrapeOtakuList(url, `complete_otaku_p${page}`);
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

app.get('/api/animelist', async (req, res) => {
    const cacheKey = 'animelist_otaku';
    const saved = cache.get(cacheKey);
    if (saved) return res.json({ status: "success", data: saved });

    try {
        console.log(`[OTAKU] Memanggil Daftar Abjad...`);
        const response = await axios.get(`${baseUrl}/anime-list/`, { headers: stealthHeaders, timeout: 15000 });
        const $ = cheerio.load(response.data);
        const animeList = [];

        $('#abcontent .bariskelom .barislist ul li a.hodebgst').each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');

            if (title && title !== '#' && href) {
                animeList.push({ name: title, url: href, image: null, status: "A-Z" });
            }
        });

        if (animeList.length > 0) {
            cache.set(cacheKey, animeList, 3600); // Cache lebih lama (1 jam)
            res.json({ status: "success", data: animeList });
        } else {
            res.json({ status: "success", data: [] });
        }
    } catch (e) {
        console.error('Error AnimeList:', e.message);
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.get('/api/schedule', async (req, res) => {
    try {
        console.log(`[JADWAL] Mengambil jadwal rilis terbaru dari ongoing-anime...`);
        const response = await axios.get(`${baseUrl}/ongoing-anime/`, { headers: stealthHeaders, timeout: 10000 });
        const $ = cheerio.load(response.data);
        const scheduleMap = {};

        $('.venz ul li').each((i, el) => {
            const title = $(el).find('h2.jdlflm').text().trim();
            const url = $(el).find('a').attr('href');
            const day = $(el).find('.epztipe').text().trim(); // Contoh: "Senin", "Selasa"
            const episode = $(el).find('.epz').text().trim();

            if (day && title) {
                if (!scheduleMap[day]) {
                    scheduleMap[day] = [];
                }
                scheduleMap[day].push({ name: title, url: url, ep: episode });
            }
        });

        // Ubah Map ke Array sesuai permintaan frontend
        const schedule = Object.keys(scheduleMap).map(day => ({
            day: day,
            animes: scheduleMap[day]
        }));

        console.log(`[JADWAL] Berhasil mengurai ${schedule.length} hari dari Ongoing.`);
        res.json({ status: "success", data: schedule });
    } catch (e) {
        console.error('Error Schedule:', e.message);
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
        $('.episodelist ul').each((i, ul) => {
            $(ul).find('li').each((j, el) => {
                const a = $(el).find('a').first();
                const title = a.text().trim();
                const href = a.attr('href');
                
                if (href && title && !title.toLowerCase().includes('batch')) {
                    episodes.push({ title: title, url: href });
                }
            });
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

// --- 1. AMBIL DAFTAR MIRROR (DENGAN BYPASS) ---
app.get('/api/episode/mirrors', async (req, res) => {
    const { url: episodeUrl } = req.query;
    if (!episodeUrl) return res.status(400).json({ status: 'error', message: 'URL episode wajib ada' });

    try {
        console.log(`[BACKEND] Mengambil Mirror dari: ${episodeUrl}`);
        
        // Tambahkan skip_gate dan Cookie buat nembus Splash Page
        const targetUrl = episodeUrl.includes('?') ? `${episodeUrl}&skip_gate=1` : `${episodeUrl}?skip_gate=1`;

        const response = await axios.get(targetUrl, {
            headers: {
                'Cookie': 'otakudesu_gate=1; skip_gate=1',
                'Referer': OTAKU_BASE,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const mirrors = [];

        // Ambil SEMUA mirror tanpa pilih kasih
        $('.mirrorstream li a').each((i, el) => {
            const dataContent = $(el).attr('data-content');
            const provider = $(el).text().trim().toLowerCase();
            
            // Cari resolusi di parent atau elemen terdekat
            let resolution = 'Unknown';
            const parentText = $(el).closest('ul').contents().not('li').text();
            if (parentText.includes('360p')) resolution = '360p';
            else if (parentText.includes('480p')) resolution = '480p';
            else if (parentText.includes('720p')) resolution = '720p';
            else if (parentText.includes('1080p')) resolution = '1080p';

            if (dataContent) {
                mirrors.push({ 
                    provider: provider, 
                    resolution: resolution,
                    dataBase64: dataContent 
                });
            }
        });

        console.log(`[BACKEND] Total Mirror: ${mirrors.length}. Providers: ${[...new Set(mirrors.map(m => m.provider))].join(', ')}`);
        res.json({ status: 'success', data: mirrors });
    } catch (error) {
        console.error('[BACKEND] Error Mirrors:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- 2. CRACKER PREMIUM (SERVER-SIDE) ---
app.post('/api/episode/crack', async (req, res) => {
    const { dataBase64, provider } = req.body;
    if (!dataBase64) return res.status(400).json({ status: 'error', message: 'Data base64 wajib ada' });

    try {
        console.log(`[CRACKER] Mendapatkan permintaan crack untuk provider: ${provider}`);
        const decoded = JSON.parse(Buffer.from(dataBase64, 'base64').toString('ascii'));
        
        // 1. Ambil Nonce
        const nonceRes = await axios.post(`${baseUrl}/wp-admin/admin-ajax.php`, 
            qs.stringify({ action: 'aa1208d27f29ca340c92c66d1926f13f' }), 
            { headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
        );
        const nonce = nonceRes.data.data;

        // 2. Ambil Iframe
        const iframeReq = { 
            q: decoded.q, 
            i: decoded.i.toString(), 
            id: decoded.id.toString(), 
            action: "2a3505c93b0035d3f455df82bf976b84", 
            nonce: nonce 
        };
        const iframeRes = await axios.post(`${baseUrl}/wp-admin/admin-ajax.php`, 
            qs.stringify(iframeReq), 
            { headers: { ...stealthHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
        );

        const iframeHtml = Buffer.from(iframeRes.data.data, 'base64').toString('ascii');
        let iframeUrl = cheerio.load(iframeHtml)('iframe').attr('src');
        
        // --- FALLBACK: Kalo cara AJAX gagal, coba cari manual di body (khusus anime lawas) ---
        if (!iframeUrl) {
            console.log("[CRACKER] AJAX Gagal, Mencoba teknik Regex Fallback...");
            const regexMatches = body.match(/<iframe.*?src="(.*?)"/);
            if (regexMatches && regexMatches[1]) {
                iframeUrl = regexMatches[1];
            }
        }

        if (!iframeUrl) throw new Error('Gagal mendapatkan URL Iframe.');
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

        // 3. Bongkar Isi Iframe untuk link mentah
        // Gunakan Referer yang tepat untuk menghindari 403 (khusus anime lawas)
        const embedRes = await axios.get(iframeUrl, { 
            headers: { 
                ...stealthHeaders, 
                'Referer': baseUrl 
            }, 
            timeout: 10000 
        });
        let body = embedRes.data;

        // --- EKSTRAKSI UNIVERSAL (MENCARI POLA 'FILE' DI SELURUH SKRIP) ---
        const universalFileRegex = /[{,]\s*["']?file["']?\s*:\s*["'](https?:\/\/[^"']+)["']/i;
        const uniMatch = body.match(universalFileRegex);
        if (uniMatch && uniMatch[1]) {
            console.log(`[CRACKER] UNIVERSAL DETECTED! Link: ${uniMatch[1]}`);
            return res.json({
                status: 'success',
                url: uniMatch[1],
                isEmbed: false,
                embedUrl: iframeUrl,
                cookie: cleanCookie
            });
        }

        // --- EKSTRAKSI KHUSUS FUNGSI WRAPPER (otakudesu, setup, dll) ---
        const wrapperMatch = body.match(/(?:otakudesu|setup|player|sources)\s*\(\s*['"]?(\{.*?\})['"]?\s*\)/s);
        if (wrapperMatch && wrapperMatch[1]) {
            try {
                const cleanJson = wrapperMatch[1].replace(/'/g, '"'); // Fix single quotes
                const jsonData = JSON.parse(cleanJson);
                const fileUrl = jsonData.file || jsonData.src || (jsonData.sources && jsonData.sources[0]?.file);
                if (fileUrl) {
                    console.log(`[CRACKER] WRAPPER DETECTED! Link: ${fileUrl}`);
                    return res.json({
                        status: 'success',
                        url: fileUrl,
                        isEmbed: false,
                        embedUrl: iframeUrl,
                        cookie: cleanCookie
                    });
                }
            } catch (e) {
                console.log("[CRACKER] Gagal bongkar Wrapper JSON.");
            }
        }

        // --- EKSTRAKSI AGRESIF (TAMPALAN BARU) ---
        let cleanCookie = '';
        const rawCookies = embedRes.headers['set-cookie'];
        if (rawCookies) {
            // Gabungkan semua cookie jadi satu string format Header
            cleanCookie = (Array.isArray(rawCookies) ? rawCookies : [rawCookies])
                .map(c => c.split(';')[0])
                .join('; ');
        }

        // Unpacker P.A.C.K.E.R jika ada
        if (body.includes('eval(function(p,a,c,k,e,d)')) {
            const pMatch = body.match(/}\('(.*?)',\s*(\d+),\s*(\d+),\s*'([^']+)'\.split/s);
            if (pMatch) {
                let p = pMatch[1], a = parseInt(pMatch[2]), c = parseInt(pMatch[3]), k = pMatch[4].split('|');
                let e = (c) => (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
                while (c--) if (k[c]) body = body.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
            }
        }

        // --- EKSTRAKSI AGRESIF (TAMPALAN BARU) ---
        const videoPatterns = [
            /(https?:\/\/[^\s\'\"]+\.(?:m3u8|mp4|ts|mkv|avi)[^\s\'\"]*)/i, // Standard files
            /["'](https?:\/\/[^"']+\/playlist\.m3u8[^"']*)["']/, // Playlist pattern
            /file:\s*["'](https?:\/\/[^"']+)["']/, // File object pattern
            /src:\s*["'](https?:\/\/[^"']+)["']/ // Source object pattern
        ];

        let videoUrlFound = null;
        for (const pattern of videoPatterns) {
            const match = body.match(pattern);
            if (match && match[1]) {
                videoUrlFound = match[1];
                break;
            }
        }

        if (videoUrlFound) {
            console.log(`[CRACKER] BERHASIL! Link Video: ${videoUrlFound}`);
            return res.json({
                status: 'success',
                url: videoUrlFound,
                isEmbed: false,
                embedUrl: iframeUrl,
                cookie: cleanCookie
            });
        }

        console.log(`[CRACKER] Gagal nemu link mentah, kirim Iframe.`);
        res.json({
            status: 'success',
            url: iframeUrl,
            isEmbed: true,
            embedUrl: iframeUrl,
            cookie: cleanCookie
        });

    } catch (error) {
        console.error('[CRACKER] Error:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/api/episode/player', async (req, res) => {
    const url = req.query.url;
    try {
        console.log(`[VIDEO] Mencari Link (Manual Cracker) untuk: ${url}`);

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

        // Coba mirror satu per satu, prioritaskan yang audio-nya dikenal lebih jernih (BUKAN vidhide jika ada opsi lain)
        mirrors.sort((a, b) => {
            // Prioritas 1: odstream, filemoon (Biasanya audio lebih jernih)
            const highQuality = ['odstream', 'filemoon', 'filedon'];
            const aIsHQ = highQuality.some(p => a.provider.includes(p));
            const bIsHQ = highQuality.some(p => b.provider.includes(p));

            if (aIsHQ && !bIsHQ) return -1;
            if (!aIsHQ && bIsHQ) return 1;

            // Prioritas Rendah: vidhide (Audio sering kena kompres)
            if (a.provider.includes('vidhide')) return 1;
            if (b.provider.includes('vidhide')) return -1;
            
            // Terakhir: mega (Skip manual di loop bawah)
            if (a.provider.includes('mega')) return 1;
            if (b.provider.includes('mega')) return -1;
            
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
