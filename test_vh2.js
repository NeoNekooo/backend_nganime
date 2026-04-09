const axios = require('axios');

function unpack(packedUrl) {
    const pMatch = packedUrl.match(/}?\('([^']*)',.*?,\d+,.*?'([^']*)'\.split\('\|'\)/);
    if (!pMatch) return;
    
    let p = pMatch[1];
    let dictionary = pMatch[2].split('|');
    let a = dictionary.length;
    
    function e(c) {
        return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
    }
    
    let k = dictionary;
    let c = dictionary.length;
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
        const html = res.data;
        
        let packedRegex = /eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/;
        let packed = html.match(packedRegex);
        if (packed) {
            const unpackedStr = unpack(packed[0]);
            console.log("Unpacked:", unpackedStr.substring(0, 500));
            
            const fileMatch = unpackedStr.match(/(?:'|")file(?:'|")\s*:\s*(?:'|")(.+?)(?:'|")/i);
            if(fileMatch) {
                console.log("FOUND MP4!", fileMatch[1]);
            }
        }
    } catch(e) {
        console.log(e.message);
    }
}
extractVidHide('https://odvidhide.com/embed/l51wv1gtmpcw');
