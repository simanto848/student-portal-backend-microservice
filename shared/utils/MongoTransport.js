import Transport from 'winston-transport';

class MongoTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.model = opts.model;
    }

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        if (!this.model) {
            return callback();
        }

        const { level, message, service, timestamp, ...meta } = info;

        this.model.create({
            level,
            message,
            service: service || 'USER', // Default to USER if not provided
            timestamp: timestamp || new Date(),
            meta
        }).then(() => {
            callback();
        }).catch(err => {
            console.error("Error saving log to MongoDB:", err);
            callback();
        });
    }
}

export default MongoTransport;
