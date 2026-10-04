import { Injectable } from '@nestjs/common';
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
import { ConflictException } from '../../common/errors/app.exception';

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
    if (params.date) {
      const startOfDay = new Date(`${params.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${params.date}T23:59:59.999Z`);
      where.OR = [
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
      ];
    }
    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { bus: { busNumber: { contains: s, mode: 'insensitive' } } },
        { bus: { registrationNumber: { contains: s, mode: 'insensitive' } } },
        { driver: { name: { contains: s, mode: 'insensitive' } } },
        { route: { name: { contains: s, mode: 'insensitive' } } },
        { route: { code: { contains: s, mode: 'insensitive' } } },
      ];
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
