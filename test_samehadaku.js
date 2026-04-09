const axios = require('axios');
const cheerio = require('cheerio');

const stealthHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function checkSamehadaku() {
    try {
        const response = await axios.get('https://samehadaku.care/', { headers: stealthHeaders });
        const $ = cheerio.load(response.data);
        console.log("Title: ", $('title').text());
        
        let ongoingFound = 0;
        // See if we can find any anime links
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/anime/')) ongoingFound++;
        });
        console.log(`Found ${ongoingFound} anime links on homepage`);
        
        // Try scraping the latest episode container
        const eps = [];
        $('.post-show ul li, .venser li, .widget_senkomu li').each((i, el) => {
             const title = $(el).find('h2.entry-title, .lftinfo h2, .dtla h2').text().trim() || $(el).find('.judul-anime span').text().trim();
             if (title) eps.push(title);
        });
        console.log("Episodes found:", eps.length);
        if (eps.length > 0) console.log("Example:", eps[0]);
        
    } catch(e) {
        console.log("Error:", e.message);
    }
}
checkSamehadaku();
