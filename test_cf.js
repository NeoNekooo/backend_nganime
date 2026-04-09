const axios = require('axios');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function testUrl(url) {
    try {
        console.log(`[TEST] Memanggil: ${url}`);
        const response = await axios.get(url, { headers: stealthHeaders, timeout: 10000 });
        console.log(`[SUCCESS] ${url} - Status: ${response.status}`);
        const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
        console.log(`          Title: ${titleMatch ? titleMatch[1] : 'No Title'}`);
    } catch (e) {
        console.log(`[FAILED] ${url} - Error: ${e.response ? e.response.status : e.message}`);
    }
}

async function run() {
    await testUrl('https://samehadaku.care/');
    await testUrl('https://v2.samehadaku.how/');
    await testUrl('https://kuramanime.com/');
    await testUrl('https://kuramanime.pro/');
    await testUrl('https://kuramanime.vip/');
}

run();
