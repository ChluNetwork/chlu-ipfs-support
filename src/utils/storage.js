const path = require('path');
const fs = require('fs');
const env = require('./env');

function getDefaultDirectory() {
    if (env.isNode()) {
        return path.join(process.env.HOME || '.', '.chlu');
    } else {
        return '';
    }
}

async function load(directory = getDefaultDirectory(), type) {
    if (env.isNode()) {
        const file = path.join(directory, type + '.json');
        if (!fs.existsSync(file)) return {};
        return await new Promise((fullfill, reject) => {
            fs.readFile(path.join(directory, type + '.json'), (err, result) => {
                if (err) reject(err);
                try {
                    const data = JSON.parse(result.toString());
                    fullfill(data);
                } catch(err) {
                    reject(err);
                }
            });
        });
    } else {
        const string = localStorage.getItem('chlu-' + type + '-data') || '{}';
        return JSON.parse(string);
    }
}

async function save(directory = getDefaultDirectory(), data, type) {
    const string = JSON.stringify(data);
    if (env.isNode()) {
        if (!fs.existsSync(directory)) fs.mkdirSync(directory);
        const file = path.join(directory, type + '.json');
        await new Promise((fullfill, reject) => {
            fs.writeFile(file, string, err => err ? reject(err) : fullfill());
        });
    } else {
        localStorage.setItem('chlu-' + type + '-data', string);
    }
}

module.exports = { save, load, getDefaultDirectory };