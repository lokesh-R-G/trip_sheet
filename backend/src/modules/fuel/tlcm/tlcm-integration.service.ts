import { prisma } from '../../../shared/database/prisma.js';
import { IntegrationJob } from '@prisma/client';

export interface TLCMClientInterface {
  postOdometerObservation(payload: any): Promise<{ acknowledged: boolean; tlcmObservationId?: string }>;
}

export class DefaultTLCMClient implements TLCMClientInterface {
  private shouldSimulateFailure = false;

  setSimulateFailure(fail: boolean) {
    this.shouldSimulateFailure = fail;
  }

  async postOdometerObservation(payload: any): Promise<{ acknowledged: boolean; tlcmObservationId?: string }> {
    if (this.shouldSimulateFailure) {
      throw new Error('TLCM Pro service temporarily unavailable (503 Service Unavailable)');
    }
    return {
      acknowledged: true,
      tlcmObservationId: `tlcm-obs-${Date.now()}`,
    };
  }
}

export class TLCMIntegrationService {
  constructor(private client: TLCMClientInterface = new DefaultTLCMClient()) {}

  getClient(): TLCMClientInterface {
    return this.client;
  }

  async processPendingJob(jobId: string): Promise<IntegrationJob> {
    const job = await prisma.integrationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Integration job ${jobId} not found`);
    }

    try {
      const response = await this.client.postOdometerObservation(job.payload);

      return await prisma.integrationJob.update({
        where: { id: jobId },
        data: {
          status: 'success',
          responseBody: response as any,
          errorMessage: null,
          attemptCount: { increment: 1 },
        },
      });
    } catch (err: any) {
      const nextAttempt = job.attemptCount + 1;
      const isDeadLetter = nextAttempt >= job.maxAttempts;
      const retryDelaySeconds = Math.pow(2, nextAttempt) * 30; // Exponential backoff

      return await prisma.integrationJob.update({
        where: { id: jobId },
        data: {
          status: isDeadLetter ? 'dead_letter' : 'retry_queued',
          attemptCount: { increment: 1 },
          errorMessage: err.message,
          nextRetryAt: isDeadLetter ? null : new Date(Date.now() + retryDelaySeconds * 1000),
        },
      });
    }
  }
}

export const tlcmIntegrationService = new TLCMIntegrationService();
