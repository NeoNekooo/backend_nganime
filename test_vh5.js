const axios = require('axios');
const fs = require('fs');

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

async function extractExt() {
    let html = fs.readFileSync('vh.txt', 'utf8');
    let packedRegex = /eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/;
    let packedMatch = html.match(packedRegex);
    if (packedMatch) {
         const unpackedStr = unpack(packedMatch[0]);
         fs.writeFileSync('vh_unpacked.txt', unpackedStr);

         const linkMatch = unpackedStr.match(/(https:\/\/[^\s\'\"]+\.(?:m3u8|mp4)[^\s\'\"]*)/i);
         console.log("MATCH:", linkMatch ? linkMatch[1] : "NONE");
    }
}
extractExt();
