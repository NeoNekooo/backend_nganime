const axios = require('axios');
const cheerio = require('cheerio');

async function extractVidHide(url) {
    try {
        console.log("Fetching Vidhide:", url);
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = res.data;
        
        let packed = html.match(/eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/);
        if (packed) {
            console.log("Found packed JS!");
            // Unpack using a standard JS un-packer or regex trick.
            // But since it's JS, we can just run a tiny regex on the payload.
            // Vidhide usually has direct links starting with https://.*\.mp4
            const mp4Match = html.match(/(https:\/\/[^'"]+\.mp4[^'"]*)/i) || [];
            console.log("Possible MP4s directly in HTML:", mp4Match.slice(0, 2));

            // To properly unpack, we could evaluate it if we inject a dummy environment, 
            // but let's try direct regexing for packed payload words.
            const kMatches = packed[0].match(/split\('\|'\)\)\)(.*)/);
            console.log("Words length:", packed[0].length);
        } else {
            console.log("No packed JS found.");
            console.log(html.substring(0, 500));
        }
    } catch(e) {
        console.log(e.message);
    }
}
extractVidHide('https://odvidhide.com/embed/l51wv1gtmpcw');
