import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';

interface ICustomError extends HttpException {
  body?: Record<string, any>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: ICustomError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = 500;
    let message = 'Внутренняя ошибка сервера';
    let body = {};

    if (exception) {
      status = exception.getStatus();
      message = exception.message;
      if (exception.getResponse && (exception.getResponse() as { info: any }).info) {
        body = (exception.getResponse() as { info: any }).info;
      }
    }

    this.logger.error(
      `Ошибка ${status}: ${message} - ${request.method} ${request.url} ${exception}`,
      (exception as any)?.stack || ''
    );

    response.status(status).json({
      ...body,
      statusCode: status,
      message,
      path: request.url,
    });
  }
}
