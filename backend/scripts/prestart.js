const { execSync } = require('child_process');
const path = require('path');

const port = process.env.PORT || 3000;

function checkAndFreePort() {
  if (process.platform === 'win32') {
    try {
      // Find PID on port
      const netstatOutput = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = netstatOutput.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        // Expect format: TCP local_address foreign_address LISTENING pid
        if (parts.length >= 5 && parts[3] === 'LISTENING') {
          const pid = parts[4];
          if (pid && pid !== '0' && pid !== `${process.pid}`) {
            pids.add(pid);
          }
        }
      }

      for (const pid of pids) {
        try {
          let cmdOutput = '';
          try {
            cmdOutput = execSync(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
          } catch (e1) {
            try {
              cmdOutput = execSync(`wmic process where "ProcessId=${pid}" get CommandLine,ProcessId /format:list`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            } catch (e2) {
              cmdOutput = '';
            }
          }

          const isSwayamBackend = cmdOutput.toLowerCase().includes('swayam-admission') ||
                                  cmdOutput.toLowerCase().includes('dist\\src\\main') ||
                                  cmdOutput.toLowerCase().includes('dist/src/main') ||
                                  cmdOutput.toLowerCase().includes('@nestjs\\cli') ||
                                  cmdOutput.toLowerCase().includes('@nestjs/cli');

          if (isSwayamBackend) {
            console.log(`[Prestart] Safely terminating stale Swayam backend process PID ${pid} holding port ${port}...`);
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[Prestart] Successfully cleared PID ${pid}.`);
          } else {
            console.warn(`[Prestart Warning] Port ${port} is currently occupied by PID ${pid}. Non-swayam process detected.`);
          }
        } catch (e) {
          // Ignore lookup errors
        }
      }
    } catch (e) {
      // netstat returned non-zero if no matching line found -> port is already free
    }
  }
}

try {
  checkAndFreePort();
} catch (err) {
  // Gracefully continue
}
