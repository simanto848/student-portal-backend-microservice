import express from "express";
import expressProxy from "express-http-proxy";
import morgan from "morgan";
import { config } from "dotenv";
import colors from "colors";
import cors from "cors";

config();

const app = express();
app.use(morgan("dev"));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

const PORT = process.env.PORT || 8000;

const HEALTH_TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 2500);
const HEALTH_LOG_LIMIT = Number(process.env.HEALTH_LOG_LIMIT || 50);
const HEALTH_PROBE_INTERVAL_MS = Number(
  process.env.HEALTH_PROBE_INTERVAL_MS || 5000
);

const serviceDefinitions = [
  { key: "gateway", name: "API Gateway", url: `http://localhost:${PORT}` },
  { key: "user", name: "User Service", url: process.env.USER_SERVICE_URL },
  {
    key: "academic",
    name: "Academic Service",
    url: process.env.ACADEMIC_SERVICE_URL,
  },
  {
    key: "library",
    name: "Library Service",
    url: process.env.LIBRARY_SERVICE_URL,
  },
  {
    key: "enrollment",
    name: "Enrollment Service",
    url: process.env.ENROLLMENT_SERVICE_URL,
  },
  {
    key: "notification",
    name: "Notification Service",
    url: process.env.NOTIFICATION_SERVICE_URL,
  },
  {
    key: "communication",
    name: "Communication Service",
    url: process.env.COMMUNICATION_SERVICE_URL,
  },
  {
    key: "classroom",
    name: "Classroom Service",
    url: process.env.CLASSROOM_SERVICE_URL,
  },
].filter((s) => Boolean(s.url));

const buildHealthUrl = (baseUrl) => {
  const url = new URL(baseUrl);
  url.pathname = "/health";
  url.search = "";
  return url.toString();
};

const mapStatusFromHttp = (httpStatus) => {
  if (httpStatus >= 200 && httpStatus < 300) return "operational";
  if (httpStatus === 401 || httpStatus === 403) return "operational";
  if (httpStatus >= 500) return "degraded";
  return "degraded";
};

const checkServiceHealth = async (service, authorizationHeader) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const healthUrl = buildHealthUrl(service.url);
    const headers = {};
    if (authorizationHeader) {
      headers.Authorization = authorizationHeader;
    }

    const response = await fetch(healthUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    const responseTimeMs = Date.now() - startedAt;
    clearTimeout(timeoutId);

    return {
      key: service.key,
      name: service.name,
      status: mapStatusFromHttp(response.status),
      httpStatus: response.status,
      responseTimeMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      key: service.key,
      name: service.name,
      status: "down",
      httpStatus: null,
      responseTimeMs: Date.now() - startedAt,
    };
  }
};

const healthLogs = new Map();

const appendHealthLog = (serviceKey, entry) => {
  const existing = healthLogs.get(serviceKey) || [];
  existing.push(entry);
  if (existing.length > HEALTH_LOG_LIMIT) {
    existing.splice(0, existing.length - HEALTH_LOG_LIMIT);
  }
  healthLogs.set(serviceKey, existing);
};

const getServiceDefinition = (serviceKey) =>
  serviceDefinitions.find((s) => s.key === serviceKey);

const runBackgroundProbe = async () => {
  const checkedAt = new Date().toISOString();
  const checks = await Promise.all(
    serviceDefinitions.map((service) => checkServiceHealth(service))
  );

  for (const check of checks) {
    appendHealthLog(check.key, {
      at: checkedAt,
      status: check.status,
      httpStatus: check.httpStatus,
      responseTimeMs: check.responseTimeMs,
    });
  }
};

app.get("/health", (req, res) => {
  try {
    res.status(200).json({
      message: "Welcome to Gateway Service",
      status: true,
      statusCode: 200,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500,
    });
  }
});

// Aggregated system health for dashboard widgets
app.get("/api/system-health", async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;

    const checks = await Promise.all(
      serviceDefinitions.map((service) =>
        checkServiceHealth(service, authorizationHeader)
      )
    );

    const checkedAt = new Date().toISOString();

    for (const check of checks) {
      appendHealthLog(check.key, {
        at: checkedAt,
        status: check.status,
        httpStatus: check.httpStatus,
        responseTimeMs: check.responseTimeMs,
      });
    }

    const hasDown = checks.some((s) => s.status === "down");
    const hasDegraded = checks.some((s) => s.status === "degraded");

    const overallStatus = hasDown
      ? "down"
      : hasDegraded
      ? "degraded"
      : "operational";

    res.status(200).json({
      success: true,
      data: {
        checkedAt,
        overallStatus,
        services: checks,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

app.get("/api/system-health/:key/inspect", async (req, res) => {
  try {
    const { key } = req.params;
    const service = getServiceDefinition(key);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    const authorizationHeader = req.headers.authorization;
    const current = await checkServiceHealth(service, authorizationHeader);
    const checkedAt = new Date().toISOString();

    appendHealthLog(current.key, {
      at: checkedAt,
      status: current.status,
      httpStatus: current.httpStatus,
      responseTimeMs: current.responseTimeMs,
    });

    return res.status(200).json({
      success: true,
      data: {
        checkedAt,
        service: {
          key: service.key,
          name: service.name,
          url: service.url,
        },
        current,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

app.get("/api/system-health/:key/logs", (req, res) => {
  try {
    const { key } = req.params;
    const service = getServiceDefinition(key);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    const limit = Math.max(
      1,
      Math.min(Number(req.query.limit || 20), HEALTH_LOG_LIMIT)
    );
    const entries = (healthLogs.get(key) || []).slice(-limit).reverse();

    return res.status(200).json({
      success: true,
      data: {
        service: {
          key: service.key,
          name: service.name,
          url: service.url,
        },
        entries,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

app.use("/api/academic", expressProxy(process.env.ACADEMIC_SERVICE_URL));
app.use("/api/user", expressProxy(process.env.USER_SERVICE_URL));
app.use("/api/library", expressProxy(process.env.LIBRARY_SERVICE_URL));
app.use("/api/enrollment", expressProxy(process.env.ENROLLMENT_SERVICE_URL));
app.use(
  "/api/notification",
  expressProxy(process.env.NOTIFICATION_SERVICE_URL)
);
app.use(
  "/api/communication",
  expressProxy(process.env.COMMUNICATION_SERVICE_URL)
);
app.use("/api/classroom", expressProxy(process.env.CLASSROOM_SERVICE_URL));
app.use(
  "/public",
  expressProxy(process.env.USER_SERVICE_URL, {
    proxyReqPathResolver: function (req) {
      return "/public" + req.url;
    },
  })
);

app.listen(PORT, () => {
  console.log(
    `Gateway server started on http://localhost:${PORT}`.green.underline.bold
  );

  // Keep health logs updating in near-realtime without UI refresh
  if (
    Number.isFinite(HEALTH_PROBE_INTERVAL_MS) &&
    HEALTH_PROBE_INTERVAL_MS > 0
  ) {
    setInterval(() => {
      runBackgroundProbe().catch(() => {});
    }, HEALTH_PROBE_INTERVAL_MS);

    runBackgroundProbe().catch(() => {});
  }
});

export default app;
