import { describe, it, expect, vi } from 'vitest';
import { createHealthRoutes } from '../routes/health.routes.js';
import type { Request, Response } from 'express';

describe('Health Check API', () => {
  it('should create router with "/", "/health", and "/healthz" paths', () => {
    const router = createHealthRoutes();
    const registeredPaths = router.stack
      .map((layer: any) => layer.route?.path)
      .filter(Boolean);

    expect(registeredPaths).toContain('/');
    expect(registeredPaths).toContain('/health');
    expect(registeredPaths).toContain('/healthz');
  });

  it('should return 200 OK with status "ok", service name, timestamp, and uptime', () => {
    const router = createHealthRoutes();
    const layer = router.stack.find((l: any) => l.route?.path === '/');
    expect(layer).toBeDefined();

    const handler = layer.route.stack[0].handle;
    const req = {} as Request;

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;

    handler(req, res);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'kazhudha-backend',
      })
    );

    const payload = jsonMock.mock.calls[0][0];
    expect(typeof payload.uptime).toBe('number');
    expect(payload.uptime).toBeGreaterThanOrEqual(0);
    expect(Date.parse(payload.timestamp)).not.toBeNaN();
  });
});
