const axios = require('axios');
async function run() {
    try {
        const res = await axios.get('https://h85MclLE5sxF9yrP4G-i9z-p01uow1fK2Q-O6qXXE--ZgqfT01pINz1E28N1mPZtdXQxOIQcsqo7fA7yGf39H54Z6Q1nOfHtoE7nO6K4zWcI5U8pUaX8V5H5-k2cZ-c3.m3u8?t=-735-738&s=16&e=14400&f=39105050&id=162&v=1&h=162&g=162&i=false');
        console.log(res.data);
    } catch(e) { console.log(e.message); }
}
run();
