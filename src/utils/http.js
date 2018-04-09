const axios = require('axios');

async function get(url) {
    const response = await axios.get(url);
    if (response.status !== 200) {
        throw new Error('Expected HTTP Status Code 200, got ' + response.status + ' instead');
    }
    return {
        status: response.status,
        data: response.data
    };
}

module.exports = { get };