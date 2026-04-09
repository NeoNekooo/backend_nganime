const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('http://localhost:4000/api/episode/player?url=https://otakudesu.blog/episode/mitnyr-episode-1-sub-indo/');
        console.log(res.data);
    } catch(e) {
        console.log(e.response ? e.response.data : e.message);
    }
}
test();
