import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuditLogService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

/**
 * Registers AuditLogService for DI plus the AuditInterceptor as a global
 * interceptor. Global means: any handler decorated with `@AuditAction(...)`
 * gets logged automatically — feature modules don't have to remember
 * `@UseInterceptors(AuditInterceptor)`.
 *
 * The `@Global()` mark exports AuditLogService for any feature module
 * that wants to call audit.record() directly (e.g. for events the
 * decorator doesn't cover, like "user signed up").
 */
@Global()
@Module({
  providers: [
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditLogService],
})
export class AuditModule {}
