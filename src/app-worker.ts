// Implements REQ-PIPE-001, REQ-PIPE-003, REQ-PIPE-005, REQ-DISC-001, REQ-MAIL-001
//
// Adapter-supported production entry: keep Astro's HTTP handler and the
// existing cron/queue dispatchers in one module. The test pool continues to
// enter worker.ts directly, without importing Astro's virtual application.
import { handle } from '@astrojs/cloudflare/handler';
import { scheduled, queue } from './worker';

export default { fetch: handle, scheduled, queue };
