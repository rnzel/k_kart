/*
  Bulk user registration script
  - Creates user1@gmail.com ... user100@gmail.com
  - Uses a shared password (default: abc123)
  - Sends POST requests to /api/auth/register
*/

const DEFAULT_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DEFAULT_ENDPOINT = '/api/auth/register';
const DEFAULT_COUNT = 100;
const DEFAULT_PASSWORD = 'abc123';
// Backend rate-limit is 5 registrations/minute, so default to ~12s/request
const DEFAULT_DELAY_MIN = 12000;
const DEFAULT_DELAY_MAX = 13000;
const DEFAULT_MAX_RETRIES = 3;

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    endpoint: DEFAULT_ENDPOINT,
    count: DEFAULT_COUNT,
    password: DEFAULT_PASSWORD,
    delayMin: DEFAULT_DELAY_MIN,
    delayMax: DEFAULT_DELAY_MAX,
    useDelay: true,
    maxRetries: DEFAULT_MAX_RETRIES
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--base-url' && next) {
      options.baseUrl = next;
      i++;
    } else if (arg === '--endpoint' && next) {
      options.endpoint = next;
      i++;
    } else if (arg === '--count' && next) {
      const parsed = Number(next);
      if (!Number.isNaN(parsed) && parsed > 0) options.count = parsed;
      i++;
    } else if (arg === '--password' && next) {
      options.password = next;
      i++;
    } else if (arg === '--delay-min' && next) {
      const parsed = Number(next);
      if (!Number.isNaN(parsed) && parsed >= 0) options.delayMin = parsed;
      i++;
    } else if (arg === '--delay-max' && next) {
      const parsed = Number(next);
      if (!Number.isNaN(parsed) && parsed >= 0) options.delayMax = parsed;
      i++;
    } else if (arg === '--no-delay') {
      options.useDelay = false;
    } else if (arg === '--max-retries' && next) {
      const parsed = Number(next);
      if (!Number.isNaN(parsed) && parsed >= 0) options.maxRetries = parsed;
      i++;
    }
  }

  if (options.delayMin > options.delayMax) {
    const tmp = options.delayMin;
    options.delayMin = options.delayMax;
    options.delayMax = tmp;
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeUrl(baseUrl, endpoint) {
  return `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

function extractMessage(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const formattedErrors = payload.errors
      .map((err) => `${err.field || err.param || 'field'}: ${err.message || err.msg || 'invalid value'}`)
      .join('; ');
    return `${payload.message || 'Validation failed'} (${formattedErrors})`;
  }
  return payload.message || payload.error || JSON.stringify(payload);
}

function indexToLetters(index) {
  let n = Math.max(1, index);
  let result = '';
  while (n > 0) {
    n -= 1;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

function buildLastName(email) {
  const index = Number(email.match(/user(\d+)@/i)?.[1] || 1);
  return `User${indexToLetters(index)}`;
}

function isDuplicate(status, payloadMessage) {
  if (status === 409) return true;
  return /duplicate|already\s+exists|already\s+registered|email\s+exists/i.test(payloadMessage || '');
}

function getRetryDelayMs(response) {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return 65000;

  const seconds = Number(retryAfter);
  if (!Number.isNaN(seconds)) return Math.max(1000, seconds * 1000);

  const timestamp = Date.parse(retryAfter);
  if (!Number.isNaN(timestamp)) {
    return Math.max(1000, timestamp - Date.now());
  }

  return 65000;
}

async function registerWithRetry(url, email, password, maxRetries) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'User',
          lastName: buildLastName(email),
          email,
          password
        })
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = await response.text();
      }

      const message = extractMessage(payload);

      if (response.status === 429 && attempt <= maxRetries) {
        const waitMs = getRetryDelayMs(response);
        console.log(`    ↳ rate limited for ${email}, retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt}/${maxRetries + 1})`);
        await sleep(waitMs);
        continue;
      }

      if (response.ok) {
        return { ok: true, status: response.status, message };
      }

      return {
        ok: false,
        status: response.status,
        message,
        duplicate: isDuplicate(response.status, message)
      };
    } catch (error) {
      if (attempt <= maxRetries) {
        await sleep(1000);
        continue;
      }

      return {
        ok: false,
        status: 0,
        message: error.message || 'Network/request failed',
        duplicate: false
      };
    }
  }

  return {
    ok: false,
    status: 0,
    message: 'Unexpected retry exhaustion',
    duplicate: false
  };
}

async function main() {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. Please run this script with Node.js 18+ or install a fetch polyfill.');
  }

  const options = parseArgs(process.argv.slice(2));
  const url = normalizeUrl(options.baseUrl, options.endpoint);

  console.log('=== Bulk Register Script ===');
  console.log(`Target URL : ${url}`);
  console.log(`Users      : ${options.count}`);
  console.log(`Password   : ${options.password}`);
  console.log('Name fields: firstName=User, lastName=<index>');
  console.log(`Delay      : ${options.useDelay ? `${options.delayMin}-${options.delayMax}ms` : 'disabled'}`);
  console.log(`Retries    : ${options.maxRetries} (for 429/network errors)`);
  console.log('');

  let success = 0;
  let duplicate = 0;
  let failed = 0;

  for (let i = 1; i <= options.count; i++) {
    const email = `user${i}@gmail.com`;
    const result = await registerWithRetry(url, email, options.password, options.maxRetries);

    if (result.ok) {
      success++;
      console.log(`[${i}/${options.count}] ✅ SUCCESS  ${email} (status ${result.status})`);
    } else if (result.duplicate) {
      duplicate++;
      console.log(`[${i}/${options.count}] ⚠️  DUPLICATE ${email} (status ${result.status}) - ${result.message}`);
    } else {
      failed++;
      console.log(`[${i}/${options.count}] ❌ FAILED   ${email} (status ${result.status || 'N/A'}) - ${result.message}`);
    }

    if (options.useDelay && i < options.count) {
      const ms = randomInt(options.delayMin, options.delayMax);
      await sleep(ms);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Success   : ${success}`);
  console.log(`Duplicate : ${duplicate}`);
  console.log(`Failed    : ${failed}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
