import { createClient } from 'redis';

const getRedisUrl = () => process.env.REDIS_URL || 'redis://localhost:6379';
const getNamespace = () => process.env.EVENT_NAMESPACE || 'student-portal';

let publisher = null;
let subscriber = null;
let isPublisherReady = false;
let isSubscriberReady = false;
let connectionPromise = null;
const activeSubscriptions = new Map();

const isDisabled = () => process.env.DISABLE_EVENT_BUS === 'true';

const ensureConnections = async () => {
    if (isDisabled()) {
        return false;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = (async () => {
        try {
            if (!publisher) {
                publisher = createClient({ url: getRedisUrl() });
                publisher.on('error', (err) => {
                    console.error('[EventBus] Publisher error:', err.message);
                    isPublisherReady = false;
                });
                publisher.on('end', () => {
                    console.warn('[EventBus] Publisher disconnected');
                    isPublisherReady = false;
                });
            }

            if (!subscriber) {
                subscriber = createClient({ url: getRedisUrl() });
                subscriber.on('error', (err) => {
                    console.error('[EventBus] Subscriber error:', err.message);
                    isSubscriberReady = false;
                });
                subscriber.on('end', () => {
                    console.warn('[EventBus] Subscriber disconnected');
                    isSubscriberReady = false;
                });
            }

            if (!isPublisherReady) {
                await publisher.connect();
                isPublisherReady = true;
                console.log('[EventBus] Publisher connected');
            }

            if (!isSubscriberReady) {
                await subscriber.connect();
                isSubscriberReady = true;
                console.log('[EventBus] Subscriber connected');
            }

            return true;
        } catch (error) {
            connectionPromise = null;
            throw error;
        }
    })();

    return connectionPromise;
};

export const EVENTS = Object.freeze({
    STUDENT_ENROLLED: 'STUDENT_ENROLLED',
    RESULT_PUBLISHED: 'RESULT_PUBLISHED',
    SEND_EMAIL: 'SEND_EMAIL'
});

export const publishEvent = async (eventName, payload = {}) => {
    if (isDisabled()) return { success: false, reason: 'disabled' };
    if (!eventName || typeof eventName !== 'string') {
        throw new Error('eventName must be a non-empty string');
    }

    try {
        const connected = await ensureConnections();
        if (!connected) return { success: false, reason: 'disabled' };

        const channel = `${getNamespace()}:${eventName}`;
        await publisher.publish(channel, JSON.stringify({
            event: eventName,
            payload,
            timestamp: new Date().toISOString()
        }));
        return { success: true };
    } catch (error) {
        console.error(`[EventBus] Failed to publish ${eventName}:`, error.message);
        return { success: false, error: error.message };
    }
};

export const subscribeEvent = async (eventName, handler) => {
    if (typeof handler !== 'function') {
        throw new Error('Event handler must be a function');
    }
    if (!eventName || typeof eventName !== 'string') {
        throw new Error('eventName must be a non-empty string');
    }

    const connected = await ensureConnections();
    if (!connected) return () => {};

    const channel = `${getNamespace()}:${eventName}`;

    await subscriber.subscribe(channel, (message) => {
        try {
            const envelope = JSON.parse(message);
            handler(envelope.payload, envelope);
        } catch (error) {
            console.error(`[EventBus] Failed to process ${eventName}:`, error.message);
        }
    });

    const unsubscribeKey = `${channel}:${Date.now()}`;
    activeSubscriptions.set(unsubscribeKey, { eventName, channel });

    console.log(`[EventBus] Subscribed to ${channel}`);

    return async () => {
        try {
            await subscriber.unsubscribe(channel);
            activeSubscriptions.delete(unsubscribeKey);
            console.log(`[EventBus] Unsubscribed from ${channel}`);
        } catch (error) {
            console.error(`[EventBus] Failed to unsubscribe:`, error.message);
        }
    };
};

export const getActiveSubscriptions = () => {
    return Array.from(activeSubscriptions.values());
};

export const shutdownEventBus = async () => {
    connectionPromise = null;

    if (publisher?.isOpen) {
        await publisher.disconnect();
        isPublisherReady = false;
    }
    if (subscriber?.isOpen) {
        await subscriber.disconnect();
        isSubscriberReady = false;
    }
    activeSubscriptions.clear();
};

export default {
    EVENTS,
    publishEvent,
    subscribeEvent,
    getActiveSubscriptions,
    shutdownEventBus
};
