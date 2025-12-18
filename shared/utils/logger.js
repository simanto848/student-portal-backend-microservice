import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, "../../logs");

// Define log levels
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  fatal: "red",
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "blue",
};

winston.addColors(colors);

// Define custom format with timestamp and colorization
const customFormat = (serviceName) =>
  winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.printf((info) => {
      const { timestamp, level, message, service, requestId, ...meta } = info;
      const serviceLabel = service || serviceName || "SHARED";
      const requestLabel = requestId ? ` [${requestId}]` : "";
      const metaStr = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : "";

      return `${timestamp} [${serviceLabel}]${requestLabel} ${level}: ${message}${metaStr}`;
    })
  );

// Create logger factory function
export const createLogger = (serviceName = "APP") => {
  const isDevelopment = process.env.NODE_ENV !== "production";

  const transports = [
    // Console transport - colorized output in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat(serviceName)
      ),
    }),

    // Error logs - daily rotation
    new DailyRotateFile({
      filename: path.join(
        logsDir,
        `${serviceName.toLowerCase()}`,
        "%DATE%-error.log"
      ),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxDays: "14d",
      level: "error",
      format: winston.format.combine(
        winston.format.uncolorize(),
        customFormat(serviceName)
      ),
    }),

    // Combined logs - daily rotation
    new DailyRotateFile({
      filename: path.join(
        logsDir,
        `${serviceName.toLowerCase()}`,
        "%DATE%-combined.log"
      ),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxDays: "14d",
      format: winston.format.combine(
        winston.format.uncolorize(),
        customFormat(serviceName)
      ),
    }),
  ];

  // Development-only detailed logging
  if (isDevelopment) {
    transports.push(
      new DailyRotateFile({
        filename: path.join(
          logsDir,
          `${serviceName.toLowerCase()}`,
          "%DATE%-debug.log"
        ),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxDays: "7d",
        level: "debug",
        format: winston.format.combine(
          winston.format.uncolorize(),
          customFormat(serviceName)
        ),
      })
    );
  }

  const logger = winston.createLogger({
    levels,
    level: isDevelopment ? "debug" : "info",
    defaultMeta: { service: serviceName },
    transports,
    exceptionHandlers: [
      new DailyRotateFile({
        filename: path.join(
          logsDir,
          `${serviceName.toLowerCase()}`,
          "%DATE%-exceptions.log"
        ),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxDays: "14d",
        format: customFormat(serviceName),
      }),
    ],
    rejectionHandlers: [
      new DailyRotateFile({
        filename: path.join(
          logsDir,
          `${serviceName.toLowerCase()}`,
          "%DATE%-rejections.log"
        ),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxDays: "14d",
        format: customFormat(serviceName),
      }),
    ],
  });

  return logger;
};

// Default logger instance
export const logger = createLogger("SHARED");

export default logger;
