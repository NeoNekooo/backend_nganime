const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

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

async function scrapeVideo(url) {
    let out = "";
    try {
        const response = await axios.get(url, { headers: stealthHeaders, timeout: 10000 });
        const $ = cheerio.load(response.data);
        const downloadLinks = [];
        $('.download ul li a').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                downloadLinks.push({href, text: $(el).text()});
            }
        });
        
        out += `Found Download Links: ${downloadLinks.length}\n`;
        for(let l of downloadLinks) {
            out += `${l.text} -> ${l.href}\n`;
            if (l.href.includes('link.desustream.com')) {
                out += `   Decoded: ${decodeDesuLink(l.href)}\n`;
            }
        }
    } catch(e) {
         out += e.message;
    }
    fs.writeFileSync('test_pure_out.txt', out, 'utf-8');
}
scrapeVideo('https://otakudesu.blog/episode/ypkks-episode-13-sub-indo/');
