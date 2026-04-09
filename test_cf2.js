const axios = require('axios');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function testUrl(url) {
    try {
        const response = await axios.get(url, { headers: stealthHeaders, timeout: 5000, maxRedirects: 0, validateStatus: () => true });
        let status = response.status;
        let title = "No Title";
        if (response.data && typeof response.data === 'string') {
            const match = response.data.match(/<title>(.*?)<\/title>/);
            if (match) title = match[1];
        }
        return { url, status, title };
    } catch (e) {
        return { url, status: e.code || e.message, title: 'Error' };
    }
}

async function run() {
    const urls = [
        'https://otakudesu.blog/',
        'https://otakudesu.cloud/',
        'https://v2.samehadaku.how/',
        'https://samehadaku.care/',
        'https://kuramanime.net/',
        'https://kuramanime.run/',
        'https://anoboy.icu/',
        'https://anoboy.cam/'
    ];
    const results = [];
    for (const u of urls) {
        results.push(await testUrl(u));
    }
    console.log(JSON.stringify(results, null, 2));
}

run();
