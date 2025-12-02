import { createClient } from 'redis';

const getRedisUrl = () => process.env.REDIS_URL || 'redis://localhost:6379';
const getNamespace = () => process.env.EVENT_NAMESPACE || 'student-portal';

const publisher = createClient({ url: getRedisUrl() });
const subscriber = createClient({ url: getRedisUrl() });

let isPublisherReady = false;
let isSubscriberReady = false;

const ensureConnections = async () => {
    if (process.env.DISABLE_EVENT_BUS === 'true') {
        console.warn('[EventBus] Event Bus is disabled via configuration');
        return;
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
};

publisher.on('error', (err) => {
    if (process.env.DISABLE_EVENT_BUS === 'true') return;
    console.error('[EventBus] Publisher error:', err.message || err);
});
subscriber.on('error', (err) => {
    if (process.env.DISABLE_EVENT_BUS === 'true') return;
    console.error('[EventBus] Subscriber error:', err.message || err);
});

const buildChannelName = (eventName) => `${getNamespace()}:${eventName}`;

export const EVENTS = Object.freeze({
    STUDENT_ENROLLED: 'STUDENT_ENROLLED',
    RESULT_PUBLISHED: 'RESULT_PUBLISHED',
    SEND_EMAIL: 'SEND_EMAIL'
});

export const publishEvent = async (eventName, payload = {}) => {
    try {
        await ensureConnections();
        const channel = buildChannelName(eventName);
        const envelope = {
            event: eventName,
            payload,
            timestamp: new Date().toISOString()
        };
        await publisher.publish(channel, JSON.stringify(envelope));
    } catch (error) {
        console.error(`[EventBus] Failed to publish ${eventName}:`, error.message);
    }
};

export const subscribeEvent = async (eventName, handler) => {
    if (typeof handler !== 'function') {
        throw new Error('Event handler must be a function');
    }

    try {
        await ensureConnections();
        const channel = buildChannelName(eventName);

        await subscriber.subscribe(channel, (message) => {
            try {
                const envelope = JSON.parse(message);
                handler(envelope.payload, envelope);
            } catch (error) {
                console.error(`[EventBus] Failed to process ${eventName} payload:`, error.message);
            }
        });

        console.log(`[EventBus] Subscribed to ${channel}`);
    } catch (error) {
        console.error(`[EventBus] Failed to subscribe to ${eventName}:`, error.message);
    }
};

export const shutdownEventBus = async () => {
    if (isPublisherReady) {
        await publisher.disconnect();
        isPublisherReady = false;
    }
    if (isSubscriberReady) {
        await subscriber.disconnect();
        isSubscriberReady = false;
    }
};

export default {
    EVENTS,
    publishEvent,
    subscribeEvent,
    shutdownEventBus
};
