const axios = require('axios');

async function get(url) {
    const response = await axios.get(url);
    if (response.status !== 200) {
        throw new Error('Expected HTTP Status Code 200, got ' + response.status + ' instead');
    }
    return {
        status: response.status,
        data: response.data,
        url
    };
}

async function post(url, body) {
    const response = await axios.post(url, body);
    if (response.status !== 200) {
        throw new Error('Expected HTTP Status Code 200, got ' + response.status + ' instead');
    }
    return {
        status: response.status,
        data: response.data,
        request: body,
        url
    };

}

module.exports = { get, post };