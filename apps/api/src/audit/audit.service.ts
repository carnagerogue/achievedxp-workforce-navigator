import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  viewerId: string;
  targetUserId: string;
  action: string;
  route: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only audit log for sensitive read/write operations.
 *
 * Failures during logging are swallowed: if the audit table is briefly
 * unreachable we'd rather succeed the user's actual request than fail
 * it in the name of compliance. Log the failure to the application
 * logger so an oncall can spot a sustained outage; otherwise treat it
 * as a tracing concern, not a hot path.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.profileReadLog.create({
        data: {
          viewerId: entry.viewerId,
          targetUserId: entry.targetUserId,
          action: entry.action,
          route: entry.route,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent?.slice(0, 512) ?? null, // avoid unbounded UA strings
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write audit log for ${entry.action} on ${entry.targetUserId}: ${(err as Error).message}`,
      );
    }
  }
}
