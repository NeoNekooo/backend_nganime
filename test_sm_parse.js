const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('samehadaku_home.html', 'utf-8');
const $ = cheerio.load(html);

console.log("Title:", $('title').text());

const items = [];
$('li, div[class*="post"], div[class*="anime"], div.episode, div.item').each((i, el) => {
    const title = $(el).find('h2, h3, .title, a[title]').text().trim().replace(/\n/g, ' ');
    const href = $(el).find('a').attr('href');
    const classList = $(el).attr('class');
    if (title && href && href.includes('samehadaku.care') && items.length < 10) {
        items.push({title: title.substring(0, 30), href, classList, tag: el.tagName});
    }
});

fs.writeFileSync('test_sm_parse.json', JSON.stringify(items, null, 2));
