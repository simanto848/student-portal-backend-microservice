import amqp from 'amqplib';

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.retryInterval = 5000;
        this.maxRetries = 20;
        this.isReconnecting = false;
        this.isShuttingDown = false;
        this.currentUrl = null;
        this.prefetchCount = 10;
    }

    async connect(url = process.env.RABBITMQ_URL || 'amqp://localhost:5672') {
        if (this.isShuttingDown) {
            throw new Error('RabbitMQ is shutting down');
        }

        this.currentUrl = url;
        let retries = 0;

        while (retries < this.maxRetries) {
            try {
                console.log(`[RabbitMQ] Connecting to ${url} (Attempt ${retries + 1}/${this.maxRetries})...`);

                this.connection = await amqp.connect(url);
                this.channel = await this.connection.createChannel();

                await this.channel.prefetch(this.prefetchCount);

                console.log('[RabbitMQ] Successfully connected');

                this.connection.on('error', (err) => {
                    console.error('[RabbitMQ] Connection error:', err.message);
                    this._handleDisconnect();
                });

                this.connection.on('close', () => {
                    console.warn('[RabbitMQ] Connection closed');
                    this._handleDisconnect();
                });

                this.channel.on('error', (err) => {
                    console.error('[RabbitMQ] Channel error:', err.message);
                    this._handleDisconnect();
                });

                return { connection: this.connection, channel: this.channel };
            } catch (error) {
                console.error('[RabbitMQ] Connection failed:', error.message);
                retries++;

                this._clearState();

                if (retries >= this.maxRetries) {
                    throw new Error(`[RabbitMQ] Max retries (${this.maxRetries}) reached`);
                }

                await new Promise(resolve => setTimeout(resolve, this.retryInterval));
            }
        }
    }

    _clearState() {
        this.connection = null;
        this.channel = null;
    }

    async _handleDisconnect() {
        if (this.isReconnecting || this.isShuttingDown) {
            return;
        }

        this.isReconnecting = true;
        this._clearState();

        try {
            await this.connect(this.currentUrl);
        } catch (error) {
            console.error('[RabbitMQ] Reconnection failed:', error.message);
        } finally {
            this.isReconnecting = false;
        }
    }

    async publishToQueue(queue, message, options = {}) {
        if (!queue || typeof queue !== 'string') {
            throw new Error('Queue name must be a non-empty string');
        }

        if (!this.channel) {
            await this.connect();
        }

        try {
            await this.channel.assertQueue(queue, { durable: true });

            const success = this.channel.sendToQueue(
                queue,
                Buffer.from(JSON.stringify(message)),
                {
                    persistent: true,
                    ...options
                }
            );

            if (!success) {
                console.warn(`[RabbitMQ] Channel write buffer full for queue ${queue}`);
            }

            return { success: true, queue };
        } catch (error) {
            console.error(`[RabbitMQ] Error publishing to queue ${queue}:`, error.message);
            throw error;
        }
    }

    async subscribeToQueue(queue, callback, options = {}) {
        if (!queue || typeof queue !== 'string') {
            throw new Error('Queue name must be a non-empty string');
        }

        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.channel) {
            await this.connect();
        }

        try {
            await this.channel.assertQueue(queue, { durable: true });

            const { noAck = false } = options;

            await this.channel.consume(queue, async (msg) => {
                if (msg === null) {
                    return;
                }

                try {
                    const content = JSON.parse(msg.content.toString());
                    await callback(content, msg);

                    if (!noAck) {
                        this.channel.ack(msg);
                    }
                } catch (error) {
                    console.error(`[RabbitMQ] Error processing message from ${queue}:`, error.message);

                    if (!noAck) {
                        const requeue = options.requeueOnFailure !== false;
                        this.channel.nack(msg, false, requeue);
                    }
                }
            }, { noAck });

            console.log(`[RabbitMQ] Subscribed to queue: ${queue}`);
            return { success: true, queue };
        } catch (error) {
            console.error(`[RabbitMQ] Error subscribing to queue ${queue}:`, error.message);
            throw error;
        }
    }

    async publishToExchange(exchange, routingKey, message, options = {}) {
        if (!exchange || typeof exchange !== 'string') {
            throw new Error('Exchange name must be a non-empty string');
        }

        if (!this.channel) {
            await this.connect();
        }

        try {
            await this.channel.assertExchange(exchange, options.type || 'direct', { durable: true });

            const success = this.channel.publish(
                exchange,
                routingKey || '',
                Buffer.from(JSON.stringify(message)),
                { persistent: true, ...options }
            );

            return { success: true, exchange, routingKey };
        } catch (error) {
            console.error(`[RabbitMQ] Error publishing to exchange ${exchange}:`, error.message);
            throw error;
        }
    }

    async bindQueueToExchange(queue, exchange, routingKey = '') {
        if (!this.channel) {
            await this.connect();
        }

        try {
            await this.channel.assertQueue(queue, { durable: true });
            await this.channel.assertExchange(exchange, 'direct', { durable: true });
            await this.channel.bindQueue(queue, exchange, routingKey);

            console.log(`[RabbitMQ] Bound queue ${queue} to exchange ${exchange}`);
            return { success: true };
        } catch (error) {
            console.error(`[RabbitMQ] Error binding queue to exchange:`, error.message);
            throw error;
        }
    }

    setPrefetch(count) {
        this.prefetchCount = count;
        if (this.channel) {
            this.channel.prefetch(count);
        }
    }

    async close() {
        this.isShuttingDown = true;

        try {
            if (this.channel) {
                await this.channel.close().catch(() => {});
            }
            if (this.connection) {
                await this.connection.close().catch(() => {});
            }
            console.log('[RabbitMQ] Connection closed gracefully');
        } catch (error) {
            console.error('[RabbitMQ] Error during shutdown:', error.message);
        } finally {
            this._clearState();
            this.isShuttingDown = false;
        }
    }

    isConnected() {
        return this.connection !== null && this.channel !== null;
    }
}

const instance = new RabbitMQ();

export default instance;

export { RabbitMQ };
