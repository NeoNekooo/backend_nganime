const { Odesus } = require('odesus');
const otakudesu = new Odesus("https://otakudesu.blog");

async function run() {
    try {
        console.log("Checking episode...");
        const result = await otakudesu.getEpisode({ type: 'episode', slug: 'ypkks-episode-13-sub-indo' });
        console.log("Mirrors:", result ? result.mirrors.length : null);
        if (result && result.mirrors) {
            for (let mirror of result.mirrors) {
                console.log("Fetching stream...");
                let streamUrl = await mirror.getStreamUrl();
                console.log("Url:", streamUrl);
            }
        }
    } catch(e) {
        console.error(e.message);
    }
}
run();
