const { createLogger, format, transports } = require("winston");
const path = require("path");
const { combine, timestamp, label, printf } = format;

const getLabel = function (callingModule) {
  return callingModule.filename.split("/").pop();
};

module.exports = function (callingModule) {
  return createLogger({
    level: "info",
    format: format.combine(
      timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      format.label({ label: getLabel(callingModule) }),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    transports: [
      new transports.File({ filename: "error.log", level: "error" }),
      new transports.File({ filename: "combined.log" }),
      new transports.Console({
        format: combine(
          format.colorize(),
          format.simple(),
          printf(
            (info) =>
              `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
          )
        ),
      }),
    ],
  });
};
