const dns = require('dns');
const https = require('https');
const axios = require('axios');

async function testIpResolve() {
    dns.resolve4('kuramanime.net', (err, addresses) => {
        if (err) console.log(err);
        console.log('kuramanime.net addresses:', addresses);
    });

    try {
        // Fetch Cloudflare 1.1.1.1 DoH for kuramanime.net
        const doh = await axios.get('https://cloudflare-dns.com/dns-query?name=kuramanime.net&type=A', {
            headers: { 'accept': 'application/dns-json' }
        });
        const ip = doh.data.Answer[0].data;
        console.log("Real IP Kuramanime:", ip);

        const agent = new https.Agent({
            lookup: (hostname, options, callback) => {
                if (hostname === 'kuramanime.net') {
                    callback(null, ip, 4);
                } else {
                    dns.lookup(hostname, options, callback);
                }
            }
        });

        const res = await axios.get('https://kuramanime.net/', { 
            httpsAgent: agent,
            headers: {
                'Host': 'kuramanime.net',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 5000,
            validateStatus: () => true
        });

        console.log("Status with DoH:", res.status);
        console.log("Body excerpt:", res.data.substring(0, 100));

    } catch (e) {
        console.log("Error DoH:", e.message);
    }
}

testIpResolve();
