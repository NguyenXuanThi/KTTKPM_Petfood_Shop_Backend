/**
 * Giải phóng port trước khi chạy dev (Windows).
 * Usage: node scripts/free-port.js [port]
 */
const { execSync } = require('child_process');

const port = String(process.argv[2] || process.env.AI_PORT || process.env.CHAT_PORT || 3011);

function freePortOnWindows(targetPort) {
  if (process.platform !== 'win32') {
    console.log(`[free-port] Skip auto-kill on ${process.platform}. Stop the process on port ${targetPort} manually if needed.`);
    return;
  }

  try {
    const output = execSync(`netstat -ano | findstr ":${targetPort}" | findstr LISTENING`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/\s(\d+)\s*$/);
      if (match) pids.add(match[1]);
    }

    if (pids.size === 0) {
      console.log(`[free-port] Port ${targetPort} is free.`);
      return;
    }

    for (const pid of pids) {
      if (pid === '0') continue;
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[free-port] Stopped PID ${pid} on port ${targetPort}`);
      } catch {
        console.warn(`[free-port] Could not stop PID ${pid}`);
      }
    }
  } catch {
    console.log(`[free-port] Port ${targetPort} is free.`);
  }
}

freePortOnWindows(port);
