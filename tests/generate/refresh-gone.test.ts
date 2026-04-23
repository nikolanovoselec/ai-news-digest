import { describe, it, expect } from 'vitest';
import { POST, GET } from '~/pages/api/digest/refresh';
describe('/api/digest/refresh — retired', () => {
  it('returns 410 Gone on POST after retirement', async () => {
    const res = await POST();
    expect(res.status).toBe(410);
  });
  it('returns 410 Gone on GET after retirement', async () => {
    const res = await GET();
    expect(res.status).toBe(410);
  });
});
