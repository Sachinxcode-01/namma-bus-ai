import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../common/constants';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProd = configService.get<string>('app.nodeEnv') === 'production';
        const logLevel = configService.get<string>('app.logLevel') || 'info';
        const appName = configService.get<string>('app.appName') || 'NammaBus-API';

        return {
          pinoHttp: {
            level: logLevel,
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                  },
                },
            genReqId: (req: Request) => {
              const reqId =
                (req.headers[REQUEST_ID_HEADER] as string) ||
                (req as Request & { id?: string }).id ||
                'unknown';
              return reqId;
            },
            customProps: (req: Request, _res: Response) => {
              const customReq = req as Request & { id?: string; user?: { id: string } };
              return {
                service: appName,
                environment: configService.get<string>('app.nodeEnv'),
                requestId: customReq.id || req.headers[REQUEST_ID_HEADER] || undefined,
                userId: customReq.user?.id || undefined,
              };
            },
            customLogLevel: (_req, res, err) => {
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            customSuccessMessage: (req: Request, res: Response, responseTime: number) => {
              return `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
            },
            customErrorMessage: (req: Request, res: Response, err: Error) => {
              return `${req.method} ${req.url} ${res.statusCode} - Error: ${err.message}`;
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-api-key"]',
                'req.body.password',
                'req.body.passwordHash',
                'req.body.token',
                'req.body.refreshToken',
                'req.body.privateKey',
                'req.body.secret',
              ],
              censor: '***REDACTED***',
            },
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
                headers: {
                  host: req.headers.host,
                  'user-agent': req.headers['user-agent'],
                  [REQUEST_ID_HEADER]: req.headers[REQUEST_ID_HEADER],
                },
              }),
              res: (res) => ({
                statusCode: res.statusCode,
                headers: {
                  'content-type': res.headers?.['content-type'],
                  [REQUEST_ID_HEADER]: res.headers?.[REQUEST_ID_HEADER],
                },
              }),
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggingModule {}
