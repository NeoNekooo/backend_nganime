const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function checkAjaxAction(url) {
    try {
        const response = await axios.get(url, { headers: stealthHeaders });
        const html = response.data;
        const actionMatch = html.match(/action\s*:\s*["']([^"']+)["']/);
        const nonceMatch = html.match(/nonce\s*:\s*["']([^"']+)["']/);
        console.log("Action:", actionMatch ? actionMatch[1] : "None");
        console.log("Nonce:", nonceMatch ? nonceMatch[1] : "None");
        
        // Coba lihat ada form atau data script tambahan
        console.log("Match action strings:");
        const matches = html.match(/[a-zA-Z0-9]{30,}/g);
        if (matches) {
           console.log(matches.slice(0, 5));
        }

        const dataContent = cheerio.load(html)('.mirrorstream ul li a').first().attr('data-content');
        console.log("Data Content:", dataContent);

        // Jika ketemu action dan nonce, kirim post
        if (actionMatch && dataContent) {
            const payload = `action=${actionMatch[1]}&nonce=${nonceMatch ? nonceMatch[1] : ''}&data=${encodeURIComponent(dataContent)}`;
            console.log("Payload:", payload);
        }

    } catch(e) {
        console.log(e.message);
    }
}
checkAjaxAction('https://otakudesu.blog/episode/ypkks-episode-13-sub-indo/');
