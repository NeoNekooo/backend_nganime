const axios = require('axios');

async function testAllOrigins() {
    try {
        const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://v2.samehadaku.how/');
        console.log("Fetching: " + url);
        const res = await axios.get(url, { timeout: 10000 });
        let title = "No Title";
        if (res.data && typeof res.data === 'string') {
            const match = res.data.match(/<title>(.*?)<\/title>/);
            if (match) title = match[1];
        }
        console.log("Title via AllOrigins:", title);
    } catch (e) {
        console.log("Error:", e.message);
    }
}
testAllOrigins();
