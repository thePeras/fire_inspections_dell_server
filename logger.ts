import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `[${timestamp}] [${level.toUpperCase()}]: ${message} `;
        if (Object.keys(metadata).length > 0) {
            msg += JSON.stringify(metadata);
        }
        return msg;
    })
);

const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // 1. Write all logs with level 'error' and below to 'error.log'
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error'
        }),
        // 2. Write all logs with level 'info' and below to 'combined.log'
        new winston.transports.File({
            filename: path.join('logs', 'combined.log')
        }),
        // 3. Also output to the console with colors
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        })
    ],
});

export default logger;