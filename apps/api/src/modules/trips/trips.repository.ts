import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  Bus,
  Driver,
  LiveLocation,
  Prisma,
  Route,
  RouteStop,
  Stop,
  StopEvent,
  StopEventType,
  Trip,
  TripStatus,
  User,
} from '@prisma/client';
import {
  AppException,
  ConflictException,
  NotFoundException,
} from '../../common/errors/app.exception';

export type TripSummary = Trip & {
  bus: Bus;
  driver: Driver & { user: Pick<User, 'id' | 'email' | 'isActive'> };
  route: Route;
  lastKnownLocation?: LiveLocation | null;
  _count?: {
    stopEvents: number;
    liveLocations: number;
  };
};

export type TripDetail = Trip & {
  bus: Bus;
  driver: Driver & { user: Pick<User, 'id' | 'email' | 'isActive'> };
  route: Route & {
    routeStops: (RouteStop & { stop: Stop })[];
  };
  stopEvents: (StopEvent & { stop: Stop })[];
  lastKnownLocation?: LiveLocation | null;
};

export type TripStopProgress = RouteStop & {
  stop: Stop;
  events: StopEvent[];
};

@Injectable()
export class TripsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    busId: string;
    driverId: string;
    routeId: string;
    scheduledStartTime?: Date | null;
  }): Promise<TripSummary> {
    try {
      const trip = await this.prisma.trip.create({
        data: {
          busId: data.busId,
          driverId: data.driverId,
          routeId: data.routeId,
          scheduledStartTime: data.scheduledStartTime,
          status: TripStatus.SCHEDULED,
        },
        include: {
          bus: true,
          driver: {
            include: {
              user: {
                select: { id: true, email: true, isActive: true },
              },
            },
          },
          route: true,
        },
      });

      return {
        ...trip,
        lastKnownLocation: null,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A trip with identical unique constraints already exists.');
        }
      }
      throw error;
    }
  }

  async findMany(params: {
    skip: number;
    take: number;
    status?: TripStatus;
    busId?: string;
    driverId?: string;
    routeId?: string;
    date?: string;
    search?: string;
  }): Promise<{ trips: TripSummary[]; total: number }> {
    const where: Prisma.TripWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }
    if (params.busId) {
      where.busId = params.busId;
    }
    if (params.driverId) {
      where.driverId = params.driverId;
    }
    if (params.routeId) {
      where.routeId = params.routeId;
    }
    const andClauses: Prisma.TripWhereInput[] = [];

    if (params.date) {
      const startOfDay = new Date(`${params.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${params.date}T23:59:59.999Z`);
      andClauses.push({
        OR: [
          {
            scheduledStartTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        ],
      });
    }
    if (params.search) {
      const s = params.search.trim();
      andClauses.push({
        OR: [
          { bus: { busNumber: { contains: s, mode: 'insensitive' } } },
          { bus: { registrationNumber: { contains: s, mode: 'insensitive' } } },
          { driver: { name: { contains: s, mode: 'insensitive' } } },
          { route: { name: { contains: s, mode: 'insensitive' } } },
          { route: { code: { contains: s, mode: 'insensitive' } } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [tripsRaw, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          bus: true,
          driver: {
            include: {
              user: {
                select: { id: true, email: true, isActive: true },
              },
            },
          },
          route: true,
          liveLocations: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          _count: {
            select: { stopEvents: true, liveLocations: true },
          },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    const trips: TripSummary[] = tripsRaw.map((t) => {
      const { liveLocations, ...rest } = t;
      return {
        ...rest,
        lastKnownLocation: liveLocations[0] ?? null,
      };
    });

    return { trips, total };
  }

  async findById(id: string): Promise<TripDetail | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        bus: true,
        driver: {
          include: {
            user: {
              select: { id: true, email: true, isActive: true },
            },
          },
        },
        route: {
          include: {
            routeStops: {
              orderBy: { sequenceOrder: 'asc' },
              include: { stop: true },
            },
          },
        },
        stopEvents: {
          orderBy: { timestamp: 'asc' },
          include: { stop: true },
        },
        liveLocations: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!trip) {
      return null;
    }

    const { liveLocations, ...rest } = trip;
    return {
      ...rest,
      lastKnownLocation: liveLocations[0] ?? null,
    };
  }

  async findActiveByBus(busId: string): Promise<Trip | null> {
    return this.prisma.trip.findFirst({
      where: {
        busId,
        status: TripStatus.ACTIVE,
      },
    });
  }

  async findActiveByDriver(driverId: string): Promise<Trip | null> {
    return this.prisma.trip.findFirst({
      where: {
        driverId,
        status: TripStatus.ACTIVE,
      },
    });
  }

  async update(id: string, data: Prisma.TripUpdateInput): Promise<TripDetail> {
    await this.prisma.trip.update({
      where: { id },
      data,
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Trip with id ${id} could not be retrieved after update`);
    }
    return updated;
  }

  async startTripAtomic(
    id: string,
    busId: string,
    driverId: string,
    startTime: Date,
  ): Promise<TripDetail> {
    return this.prisma.$transaction(
      async (tx) => {
        const trip = await tx.trip.findUnique({
          where: { id },
        });

        if (!trip) {
          throw new NotFoundException('Trip', id);
        }

        // Idempotency: if already ACTIVE, return existing state without overwriting actualStartTime
        if (trip.status === TripStatus.ACTIVE) {
          const detail = await this.findById(id);
          if (!detail) {
            throw new NotFoundException('Trip', id);
          }
          return detail;
        }

        if (trip.status !== TripStatus.SCHEDULED) {
          throw new AppException(
            'INVALID_STATE_TRANSITION',
            `Cannot start trip with status '${trip.status}'. Only SCHEDULED trips can be started.`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const [busActiveTrip, driverActiveTrip] = await Promise.all([
          tx.trip.findFirst({
            where: { busId, status: TripStatus.ACTIVE, id: { not: id } },
          }),
          tx.trip.findFirst({
            where: { driverId, status: TripStatus.ACTIVE, id: { not: id } },
          }),
        ]);

        if (busActiveTrip) {
          throw new ConflictException(
            `Bus is currently operating another active trip (${busActiveTrip.id}).`,
          );
        }

        if (driverActiveTrip) {
          throw new ConflictException(
            `Driver is currently operating another active trip (${driverActiveTrip.id}).`,
          );
        }

        // Conditional atomic update: only transitions if status is still SCHEDULED
        const updateResult = await tx.trip.updateMany({
          where: { id, status: TripStatus.SCHEDULED },
          data: {
            status: TripStatus.ACTIVE,
            actualStartTime: startTime,
          },
        });

        if (updateResult.count === 0) {
          const rechecked = await tx.trip.findUnique({ where: { id } });
          if (rechecked && rechecked.status === TripStatus.ACTIVE) {
            const detail = await this.findById(id);
            if (!detail) {
              throw new NotFoundException('Trip', id);
            }
            return detail;
          }
          throw new ConflictException('Trip state was changed concurrently. Please retry.');
        }

        const updated = await this.findById(id);
        if (!updated) {
          throw new NotFoundException('Trip', id);
        }
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findStopEvent(
    tripId: string,
    stopId: string,
    eventType: StopEventType,
  ): Promise<StopEvent | null> {
    return this.prisma.stopEvent.findFirst({
      where: {
        tripId,
        stopId,
        eventType,
      },
    });
  }

  async createStopEvent(
    tripId: string,
    stopId: string,
    eventType: StopEventType,
    timestamp: Date,
  ): Promise<StopEvent & { stop: Stop }> {
    return this.prisma.stopEvent.create({
      data: {
        tripId,
        stopId,
        eventType,
        timestamp,
      },
      include: {
        stop: true,
      },
    });
  }

  async findTripStopsProgress(tripId: string): Promise<TripStopProgress[]> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          include: {
            routeStops: {
              orderBy: { sequenceOrder: 'asc' },
              include: { stop: true },
            },
          },
        },
        stopEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!trip) {
      return [];
    }

    const eventsByStopId = new Map<string, StopEvent[]>();
    for (const ev of trip.stopEvents) {
      const list = eventsByStopId.get(ev.stopId) ?? [];
      list.push(ev);
      eventsByStopId.set(ev.stopId, list);
    }

    return trip.route.routeStops.map((rs) => ({
      ...rs,
      events: eventsByStopId.get(rs.stopId) ?? [],
    }));
  }
}
