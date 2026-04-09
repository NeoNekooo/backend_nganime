const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function getAjaxVideo(url) {
    let out = "";
    try {
        out += `Fetch: ${url}\n`;
        const response = await axios.get(url, { headers: stealthHeaders });
        const $ = cheerio.load(response.data);
        
        $('script').each((i, el) => {
            const scriptText = $(el).html();
            if (scriptText && scriptText.includes('action:"')) {
                // Ignore general action
            }
        });

        // Let's grab all scripts that are directly in the HTML
        const scripts = [];
        $('script').each((i, el) => { scripts.push($(el).html()); });
        out += "Script Count: " + scripts.length + "\n";
        
        out += "Mirrors:\n";
        $('.mirrorstream ul li a').each((i, el) => {
            out += $(el).attr('data-content') + "\n";
        });
        
        out += "Iframe: " + $('.responsive-embed-container iframe').attr('src') + "\n";
        
        // Also look at .embed-container or something similar?
        out += "Html excerpt around player:\n";
        out += $('#venkonten').html()?.substring(0, 500) + "\n";
        
    } catch(e) {
        out += e.message;
    }
    fs.writeFileSync('test_ota_out.txt', out, 'utf-8');
    console.log("Done");
}
getAjaxVideo('https://otakudesu.blog/episode/mwtd-episode-1-sub-indo/');
