const winston = require('winston');

module.exports = winston.createLogger({
    level: 'warn',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});