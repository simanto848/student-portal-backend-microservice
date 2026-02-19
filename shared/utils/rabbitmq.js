import amqp from 'amqplib';

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.channel = null;
        // Retry connection parameters
        this.retryInterval = 5000;
        this.maxRetries = 20;
        this.connectingPromise = null;
    }

    async connect(url = process.env.RABBITMQ_URL || 'amqp://localhost:5672') {
        if (this.connection) return; // Already connected

        if (this.connectingPromise) return this.connectingPromise;

        this.connectingPromise = (async () => {
            let retries = 0;
            while (retries < this.maxRetries) {
                try {
                    console.log(`Attempting to connect to RabbitMQ at ${url} (Attempt ${retries + 1}/${this.maxRetries})...`);
                    this.connection = await amqp.connect(url);
                    this.channel = await this.connection.createChannel();

                    console.log('Successfully connected to RabbitMQ');

                    this.connection.on('error', (err) => {
                        console.error('RabbitMQ connection error', err);
                        this.handleDisconnect(url);
                    });

                    this.connection.on('close', () => {
                        console.warn('RabbitMQ connection closed');
                        this.handleDisconnect(url);
                    });

                    return;
                } catch (error) {
                    console.error('Failed to connect to RabbitMQ:', error.message);
                    retries++;
                    if (retries >= this.maxRetries) {
                        throw new Error('Max RabbitMQ connection retries reached');
                    }
                    await new Promise(resolve => setTimeout(resolve, this.retryInterval));
                }
            }
        })();

        try {
            await this.connectingPromise;
        } catch (error) {
            console.error('RabbitMQ connection failed permanently:', error);
            throw error;
        } finally {
            this.connectingPromise = null;
        }
    }

    handleDisconnect(url) {
        this.connection = null;
        this.channel = null;
        this.retryConnection(url);
    }

    async retryConnection(url) {
        setTimeout(async () => {
            try {
                await this.connect(url);
            } catch (e) {
                console.error("Reconnection failed:", e);
            }
        }, this.retryInterval);
    }

    async publishToQueue(queue, message) {
        if (!this.channel) {
            await this.connect();
        }
        try {
            await this.channel.assertQueue(queue, { durable: true });
            this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
                persistent: true
            });
            console.log(`Sent message to ${queue}`);
        } catch (error) {
            console.error(`Error publishing to queue ${queue}:`, error);
            throw error;
        }
    }

    async subscribeToQueue(queue, callback) {
        if (!this.channel) {
            await this.connect();
        }
        try {
            await this.channel.assertQueue(queue, { durable: true });
            this.channel.consume(queue, (msg) => {
                if (msg !== null) {
                    const content = JSON.parse(msg.content.toString());
                    callback(content);
                    this.channel.ack(msg);
                }
            });
            console.log(`Subscribed to ${queue}`);
        } catch (error) {
            console.error(`Error subscribing to queue ${queue}:`, error);
            throw error;
        }
    }
}

export default new RabbitMQ();
