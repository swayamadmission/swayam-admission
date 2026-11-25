import { AdmissionAlertsService } from './admission-alerts.service';

describe('AdmissionAlertsService', () => {
  const createMockPrisma = () => ({
    alertSubscriber: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    alertBroadcastLog: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  });

  const createMockOutbox = () => ({
    enqueueEmail: jest.fn().mockResolvedValue({ id: 'del_1' }),
  });

  it('subscribes a new email, normalizes casing, and queues confirmation email', async () => {
    const prisma = createMockPrisma();
    const outbox = createMockOutbox();
    prisma.alertSubscriber.findUnique.mockResolvedValue(null);
    prisma.alertSubscriber.create.mockImplementation(async ({ data }: any) => ({
      id: 'sub_1',
      ...data,
    }));

    const svc = new AdmissionAlertsService(prisma as any, outbox as any);
    const res = await svc.subscribe({
      email: '  Student.Test@Example.com ',
      source: 'BLOG_SIDEBAR',
    });

    expect(res.success).toBe(true);
    expect(res.alreadySubscribed).toBe(false);
    expect(res.email).toBe('student.test@example.com');
    expect(prisma.alertSubscriber.create).toHaveBeenCalledTimes(1);

    await new Promise((r) => setImmediate(r));
    expect(outbox.enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'student.test@example.com',
        recipientType: 'SUBSCRIBER',
        subject: 'Welcome to Swayam Admission Alerts',
      }),
    );
  });

  it('returns alreadySubscribed without duplicate insert when already ACTIVE', async () => {
    const prisma = createMockPrisma();
    const outbox = createMockOutbox();
    prisma.alertSubscriber.findUnique.mockResolvedValue({
      id: 'sub_1',
      email: 'student@example.com',
      status: 'ACTIVE',
      unsubscribeToken: 'tok_1',
    });

    const svc = new AdmissionAlertsService(prisma as any, outbox as any);
    const res = await svc.subscribe({ email: 'student@example.com' });

    expect(res.success).toBe(true);
    expect(res.alreadySubscribed).toBe(true);
    expect(prisma.alertSubscriber.create).not.toHaveBeenCalled();
    expect(outbox.enqueueEmail).not.toHaveBeenCalled();
  });

  it('unsubscribes by valid token', async () => {
    const prisma = createMockPrisma();
    prisma.alertSubscriber.findUnique.mockResolvedValue({
      id: 'sub_1',
      email: 'student@example.com',
      status: 'ACTIVE',
      unsubscribeToken: 'valid_tok',
    });
    prisma.alertSubscriber.update.mockResolvedValue({});

    const svc = new AdmissionAlertsService(prisma as any);
    const res = await svc.unsubscribeByToken('valid_tok');

    expect(res.success).toBe(true);
    expect(prisma.alertSubscriber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_1' },
        data: expect.objectContaining({ status: 'UNSUBSCRIBED' }),
      }),
    );
  });

  it('broadcasts email to all active subscribers on publish and prevents duplicate sends', async () => {
    const prisma = createMockPrisma();
    const outbox = createMockOutbox();

    prisma.alertBroadcastLog.findUnique.mockResolvedValueOnce(null);
    prisma.alertSubscriber.findMany.mockResolvedValue([
      { id: 's1', email: 'a@test.com', unsubscribeToken: 't1' },
      { id: 's2', email: 'b@test.com', unsubscribeToken: 't2' },
    ]);
    prisma.alertBroadcastLog.create.mockResolvedValue({ id: 'log_1' });
    prisma.alertSubscriber.updateMany.mockResolvedValue({ count: 2 });

    const svc = new AdmissionAlertsService(prisma as any, outbox as any);
    const first = await svc.notifySubscribersOnPublish({
      contentType: 'BLOG',
      contentId: 'blog_123',
      title: 'JEE Main 2026 Dates Announced',
      summary: 'Official NTA schedule and registration deadlines.',
      category: 'Engineering',
      urlPath: '/blog/jee-main-2026-dates',
    });

    expect(first.queued).toBe(2);
    expect(outbox.enqueueEmail).toHaveBeenCalledTimes(2);
    expect(outbox.enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'a@test.com',
        subject: 'New Article Published: JEE Main 2026 Dates Announced',
      }),
    );

    // Second call for the same published item must be skipped
    prisma.alertBroadcastLog.findUnique.mockResolvedValueOnce({ id: 'log_1' });
    const second = await svc.notifySubscribersOnPublish({
      contentType: 'BLOG',
      contentId: 'blog_123',
      title: 'JEE Main 2026 Dates Announced',
      urlPath: '/blog/jee-main-2026-dates',
    });
    expect(second.queued).toBe(0);
    expect(outbox.enqueueEmail).toHaveBeenCalledTimes(2);
  });
});
