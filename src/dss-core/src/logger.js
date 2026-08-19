const levels = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = process.env.LOG_LEVEL || 'info';
const minimumLevel = levels[configuredLevel] ?? levels.info;

function write(level, message, context = {}) {
  if (levels[level] < minimumLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

function errorDetails(error) {
  return {
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
  };
}

module.exports = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
  errorDetails,
};