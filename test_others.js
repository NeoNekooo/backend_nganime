const axios = require('axios');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/html,application/xhtml+xml,application/xml',
};

async function testUrl(url) {
    try {
        const response = await axios.get(url, { headers: stealthHeaders, timeout: 5000, validateStatus: () => true });
        let title = "No Title";
        if (response.data && typeof response.data === 'string') {
            const match = response.data.match(/<title>(.*?)<\/title>/);
            if (match) title = match[1];
        }
        console.log(`[OK] ${url} -> ${title.substring(0, 40)}`);
    } catch (e) {
        console.log(`[ERR] ${url} -> ${e.code || e.message}`);
    }
}

async function run() {
    await testUrl('https://kusonime.com/');
    await testUrl('https://oploverz.life/');
    await testUrl('https://nontonanimeid.cyou/');
    await testUrl('https://anoboy.show/');
}
run();
