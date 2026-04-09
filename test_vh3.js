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

async function extractVidHide(url) {
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        let html = res.data;
        let packedRegex = /eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/;
        let packedMatch = html.match(packedRegex);
        if (packedMatch) {
            html = unpack(packedMatch[0]);
        }
        
        const fileMatch = html.match(/[\"\']?(?:file|src)[\"\']?\s*:\s*[\"\'](https:\/\/[^\"\']+?\.mp4(?:[^\"\']*)?)[\"\']/i)
                          || html.match(/file\s*:\s*[\"\'](https:\/\/[^\"\']+?)[\"\']/i);
        if (fileMatch) {
            console.log("FINAL URL=", fileMatch[1]);
        } else {
             console.log("NO MP4 FOUND:");
             console.log(html.substring(0, 500));
        }
    } catch(e) {
        console.log("err:", e.message);
    }
}
extractVidHide('https://odvidhide.com/embed/l51wv1gtmpcw');
