const axios = require('axios');
const fs = require('fs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function run() {
    try {
        const response = await axios.get('https://samehadaku.care/', { headers: stealthHeaders });
        fs.writeFileSync('samehadaku_home.html', response.data, 'utf-8');
        console.log("Written HTML to samehadaku_home.html");
    } catch(e) {
        console.log("Error:", e.message);
    }
}
run();
