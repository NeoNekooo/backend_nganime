const fs = require('fs');

const html = fs.readFileSync('samehadaku_home.html', 'utf-8');

// just print the first 2000 chars of body
const bodyIdx = html.indexOf('<body');
if (bodyIdx > -1) {
    fs.writeFileSync('test_body.html', html.substring(bodyIdx, bodyIdx + 5000));
} else {
    fs.writeFileSync('test_body.html', html.substring(0, 5000));
}
