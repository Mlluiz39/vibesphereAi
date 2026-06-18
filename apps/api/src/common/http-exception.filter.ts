import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditService } from '../modules/audit/audit.service';

/**
 * Resposta de erro padronizada: { code, message, details? } — ver design (Tratamento de Erros).
 * Também audita acessos negados (401/403) — Requisitos 11.1 / 3.4.
 */
@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  constructor(private readonly audit: AuditService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Erro interno';
    let details: unknown;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string) ?? message;
        details = r.details ?? r.errors;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    // Auditoria de acessos negados — Req 11.1 / 3.4.
    if (status === HttpStatus.FORBIDDEN || status === HttpStatus.UNAUTHORIZED) {
      const user = (request as Request & { user?: { sub?: string; tenantId?: string } }).user;
      void this.audit.log({
        tenantId: user?.tenantId ?? null,
        actorUserId: user?.sub ?? null,
        action: status === HttpStatus.FORBIDDEN ? 'access.forbidden' : 'access.unauthorized',
        resource: `${request.method} ${request.url}`,
      });
    }

    response.status(status).json({
      code: status,
      message,
      ...(details ? { details } : {}),
    });
  }
}
