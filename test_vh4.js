const axios = require('axios');
function unpack(packedStr) {
    const pMatch = packedStr.match(/return p}\('(.*?)',\s*(\d+),\s*(\d+),\s*'([^']+)'\.split/);
    if (!pMatch) return packedStr;
    let p = pMatch[1];
    let a = parseInt(pMatch[2]);
    let c = parseInt(pMatch[3]);
    let k = pMatch[4].split('|');

    function e(c) {
        return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
    }

    while(c--) {
        if(k[c]) {
            p = p.replace(new RegExp('\\b'+e(c)+'\\b','g'), k[c]);
        }
    }
    return p;
}

async function extractUrl(url) {
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        let html = res.data;
        let packedRegex = /eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/;
        let packedMatch = html.match(packedRegex);
        if (packedMatch) {
            html = unpack(packedMatch[0]);
        }
        
        const fileMatch = html.match(/file\s*:\s*[\"\'](http[^\"\']+?\.(?:mp4|m3u8)[^\"\']*)[\"\']/i)
                       || html.match(/src\s*:\s*[\"\'](http[^\"\']+?\.(?:mp4|m3u8)[^\"\']*)[\"\']/i);
        if (fileMatch) {
            console.log("FINAL URL=", fileMatch[1]);
        } else {
             console.log("NO MEDIA EXTRACTED");
        }
    } catch(e) {
        console.log("err:", e.message);
    }
}
extractUrl('https://odvidhide.com/embed/l51wv1gtmpcw');
