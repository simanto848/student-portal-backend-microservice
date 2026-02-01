
/**
 * Middleware to track API usage statistics
 * @param {string} serviceName - Name of the service
 * @param {object} ApiMetricModel - Mongoose model for ApiMetric (injected)
 */
const apiStats = (serviceName, ApiMetricModel) => {
    return (req, res, next) => {
        if (!ApiMetricModel) {
            console.error("ApiMetricModel not provided to apiStats middleware");
            return next();
        }
        const start = Date.now();

        // Hook into response finish event
        res.on("finish", async () => {
            const duration = Date.now() - start;

            // Skip logging for OPTIONS requests or health checks to reduce noise
            if (req.method === "OPTIONS" || req.path.includes("/health")) {
                return;
            }

            try {
                // Determine path pattern (simplified)
                // In a real app, you might want to normalize IDs (e.g., /users/123 -> /users/:id)
                // For now, we'll store the raw path or a simple reduction could be applied

                await ApiMetricModel.create({
                    path: req.baseUrl + req.path,
                    method: req.method,
                    service: serviceName,
                    statusCode: res.statusCode,
                    duration: duration
                });
            } catch (error) {
                // Fail silently to not impact request processing
                console.error("Failed to save API metric:", error.message);
            }
        });

        next();
    };
};

export default apiStats;
