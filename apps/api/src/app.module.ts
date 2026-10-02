import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv, appConfig, databaseConfig, authConfig } from './config';
import { LoggingModule } from './logging/logging.module';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusesModule } from './modules/buses/buses.module';
import { StopsModule } from './modules/stops/stops.module';
import { RoutesModule } from './modules/routes/routes.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig, databaseConfig, authConfig],
    }),
    LoggingModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BusesModule,
    StopsModule,
    RoutesModule,
    DriversModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
