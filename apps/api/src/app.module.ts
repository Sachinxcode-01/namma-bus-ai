import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  validateEnv,
  appConfig,
  databaseConfig,
  authConfig,
  notificationsConfig,
  firebaseConfig,
  realtimeConfig,
} from './config';
import { LoggingModule } from './logging/logging.module';
import { PrismaModule } from './database/prisma.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusesModule } from './modules/buses/buses.module';
import { StopsModule } from './modules/stops/stops.module';
import { RoutesModule } from './modules/routes/routes.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { StudentsModule } from './modules/students/students.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TripsModule } from './modules/trips/trips.module';
import { LocationsModule } from './modules/locations/locations.module';
import { EtaModule } from './modules/eta/eta.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig, databaseConfig, authConfig, notificationsConfig, firebaseConfig, realtimeConfig],
    }),
    LoggingModule,
    PrismaModule,
    RealtimeModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BusesModule,
    StopsModule,
    RoutesModule,
    DriversModule,
    StudentsModule,
    SubscriptionsModule,
    TripsModule,
    LocationsModule,
    EtaModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
