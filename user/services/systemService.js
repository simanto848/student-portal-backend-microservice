import SystemLog from "../models/SystemLog.js";
import ApiMetric from "../models/ApiMetric.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import academicServiceClient from "../clients/academicServiceClient.js";
import mongoose from "mongoose";
import os from "os";

class SystemService {
    // System Health
    async getHealth() {
        return {
            server: {
                uptime: process.uptime(),
                status: "healthy",
                timestamp: new Date(),
            },
            database: {
                status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
                host: mongoose.connection.host,
            },
            memory: {
                free: os.freemem(),
                total: os.totalmem(),
                usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
            },
            cpu: {
                load: os.loadavg(),
                cores: os.cpus().length,
            },
        };
    }

    // Database Stats
    async getDatabaseStats() {
        const adminDb = mongoose.connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        const opcounters = serverStatus.opcounters;

        // List all databases
        const dbsList = await adminDb.listDatabases();
        const allDatabases = [];

        for (const dbInfo of dbsList.databases) {
            const client = mongoose.connection.getClient();
            const targetDb = client.db(dbInfo.name);
            const dbStatsResult = await targetDb.stats();
            const cols = await targetDb.listCollections().toArray();
            const collectionsDetails = await Promise.all(cols.map(async (col) => {
                const colStats = await targetDb.command({ collStats: col.name });
                return {
                    name: col.name,
                    count: colStats.count,
                    size: (colStats.size / 1024).toFixed(2) + ' KB',
                    storageSize: (colStats.storageSize / 1024).toFixed(2) + ' KB'
                };
            }));

            collectionsDetails.sort((a, b) => b.count - a.count);

            allDatabases.push({
                name: dbInfo.name,
                sizeOnDisk: (dbInfo.sizeOnDisk / (1024 * 1024)).toFixed(2) + ' MB',
                empty: dbInfo.empty,
                collections: collectionsDetails.length,
                objects: dbStatsResult.objects,
                avgObjSize: dbStatsResult.avgObjSize,
                dataSize: (dbStatsResult.dataSize / (1024 * 1024)).toFixed(2) + ' MB',
                storageSize: (dbStatsResult.storageSize / (1024 * 1024)).toFixed(2) + ' MB',
                indexes: dbStatsResult.indexes,
                indexSize: (dbStatsResult.indexSize / (1024 * 1024)).toFixed(2) + ' MB',
                collectionDetails: collectionsDetails
            });
        }

        const dbStats = {
            status: mongoose.connection.readyState === 1 ? "active" : "inactive",
            host: mongoose.connection.host,
            connections: serverStatus.connections.current,
            operations: {
                reads: opcounters.query + opcounters.getmore,
                writes: opcounters.insert,
                updates: opcounters.update,
                deletes: opcounters.delete
            },
            databases: allDatabases,
        };

        const currentDbName = mongoose.connection.name;
        const currentDbData = allDatabases.find(d => d.name === currentDbName) || allDatabases[0];
        if (currentDbData) {
            dbStats.size = currentDbData.storageSize;
            dbStats.collections = currentDbData.collections;
            dbStats.documents = currentDbData.objects;
            dbStats.topCollections = currentDbData.collectionDetails.slice(0, 6);
        }

        // Add Application Counts
        const [studentCount, teacherCount, courseCount] = await Promise.all([
            Student.countDocuments({ isDeleted: false }),
            Teacher.countDocuments({ isDeleted: false }),
            academicServiceClient.getCourseCount(),
        ]);

        dbStats.counts = {
            students: studentCount,
            teachers: teacherCount,
            courses: courseCount ?? 0,
            admins: 1 // Default to 1 for now or fetch if needed
        };

        return dbStats;
    }

    async getLogs(queryOptions) {
        const { service, level, search, limit = 50, page = 1 } = queryOptions;
        const query = {};
        if (service && service !== 'all') {
            query.service = service.toUpperCase();
        }

        if (level && level !== 'all') {
            query.level = level.toLowerCase();
        }

        if (search) {
            query.$or = [
                { message: { $regex: search, $options: 'i' } },
                { user: { $regex: search, $options: 'i' } }
            ];
        }

        const logs = await SystemLog.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        return logs;
    }

    // Alerts
    async getAlerts() {
        const alerts = [];
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const memUsage = ((totalMem - freeMem) / totalMem) * 100;
        const loadAvg = os.loadavg()[0]; // 1 min load average

        if (memUsage > 85) {
            alerts.push({ id: "sys-mem-critical", type: "critical", message: `High Memory Usage: ${memUsage.toFixed(1)}%`, time: "Just now" });
        } else if (memUsage > 70) {
            alerts.push({ id: "sys-mem-warning", type: "warning", message: `Elevated Memory Usage: ${memUsage.toFixed(1)}%`, time: "Just now" });
        }

        if (loadAvg > 2) {
            alerts.push({ id: "sys-load-high", type: "warning", message: `High System Load: ${loadAvg.toFixed(2)}`, time: "Just now" });
        }

        if (mongoose.connection.readyState !== 1) {
            alerts.push({ id: "sys-db-unstable", type: "critical", message: "Database connection unstable", time: "Just now" });
        }

        // Check for recent error logs as alerts
        const recentErrors = await SystemLog.find({
            level: "error",
            timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 mins
        }).limit(5);

        recentErrors.forEach((error) => {
            alerts.push({
                id: `log-${error._id}`,
                type: "critical",
                message: `System Error: ${error.message}`,
                time: new Date(error.timestamp).toLocaleTimeString()
            });
        });

        if (alerts.length === 0) {
            alerts.push({ id: "sys-normal", type: "success", message: "System operating normally", time: "Just now" });
        }

        return alerts;
    }

    // API Stats
    async getApiStats() {
        const totalCalls = await ApiMetric.countDocuments();
        const latencyResult = await ApiMetric.aggregate([
            {
                $group: {
                    _id: null,
                    avgLatency: { $avg: "$duration" }
                }
            }
        ]);
        const avgLatency = latencyResult.length > 0 ? Math.round(latencyResult[0].avgLatency) : 0;

        // Calculate error rate
        const errorCalls = await ApiMetric.countDocuments({ statusCode: { $gte: 400 } });
        const errorRate = totalCalls > 0 ? (errorCalls / totalCalls).toFixed(2) : 0;

        // Top endpoints
        const topEndpoints = await ApiMetric.aggregate([
            {
                $group: {
                    _id: { path: "$path", method: "$method", service: "$service" },
                    calls: { $sum: 1 },
                    avgLatency: { $avg: "$duration" },
                    errorCount: {
                        $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] }
                    },
                    lastCalled: { $max: "$timestamp" }
                }
            },
            { $sort: { calls: -1 } },
            { $limit: 15 },
            {
                $project: {
                    _id: 0,
                    path: "$_id.path",
                    method: "$_id.method",
                    service: "$_id.service",
                    calls: 1,
                    avgLatency: { $round: ["$avgLatency", 0] },
                    errorRate: {
                        $cond: [
                            { $eq: ["$calls", 0] },
                            0,
                            { $divide: ["$errorCount", "$calls"] }
                        ]
                    },
                    lastCalled: 1
                }
            }
        ]);

        const stats = {
            requests: {
                total: totalCalls,
                success: totalCalls - errorCalls,
                error: errorCalls
            },
            latency: {
                avg: avgLatency,
                p95: Math.round(avgLatency * 2.5), // Approximation
                p99: Math.round(avgLatency * 3.5)  // Approximation
            },
            errorRate: parseFloat(errorRate),
            activeServices: 8, // Still hardcoded as we don't have service registry
            totalServices: 8,
            endpoints: topEndpoints,
            updatedAt: new Date().toISOString()
        };

        return stats;
    }
}

export default new SystemService();
