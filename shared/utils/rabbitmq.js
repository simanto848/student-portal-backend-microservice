import amqp from 'amqplib';

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.channel = null;
        // Retry connection parameters
        this.retryInterval = 5000;
        this.maxRetries = 20;
    }

    async connect(url = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672') {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                console.log(`Attempting to connect to RabbitMQ at ${url} (Attempt ${retries + 1}/${this.maxRetries})...`);
                this.connection = await amqp.connect(url);
                this.channel = await this.connection.createChannel();

                console.log('Successfully connected to RabbitMQ');

                this.connection.on('error', (err) => {
                    console.error('RabbitMQ connection error', err);
                    this.channel = null;
                    this.connection = null;
                    this.retryConnection(url);
                });

                this.connection.on('close', () => {
                    console.warn('RabbitMQ connection closed');
                    this.channel = null;
                    this.connection = null;
                    this.retryConnection(url);
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
    }

    async retryConnection(url) {
        if (this.connection) {
            try {
                // Clean up existing closed/errored connection if possible
                this.connection.close().catch(() => { });
            } catch (e) { /* ignore */ }
        }
        await this.connect(url);
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
