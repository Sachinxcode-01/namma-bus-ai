import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NammaBus AI development data...');

  // 1. Create or upsert Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nammabus.ac.in' },
    update: {},
    create: {
      email: 'admin@nammabus.ac.in',
      // In production, hashed with bcrypt/argon2
      passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyUIXe/QL3.eTj3mP9Yh6QxU1bF9iWmu',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // 2. Create or upsert Route
  const route = await prisma.route.upsert({
    where: { code: 'ROUTE-01' },
    update: {},
    create: {
      name: 'Campus Express - Route 1',
      code: 'ROUTE-01',
      description: 'North Suburbs to Engineering Campus',
      isActive: true,
    },
  });

  // 3. Create or upsert Stops
  const stop1 = await prisma.stop.upsert({
    where: { code: 'STP-MAJESTIC' },
    update: {},
    create: {
      name: 'Majestic Metro Station',
      code: 'STP-MAJESTIC',
      latitude: 12.9767,
      longitude: 77.5713,
      geofenceRadiusMeters: 50,
    },
  });

  const stop2 = await prisma.stop.upsert({
    where: { code: 'STP-CAMPUS' },
    update: {},
    create: {
      name: 'Engineering College Main Gate',
      code: 'STP-CAMPUS',
      latitude: 13.0334,
      longitude: 77.564,
      geofenceRadiusMeters: 80,
    },
  });

  // Link route stops
  await prisma.routeStop.upsert({
    where: {
      routeId_sequenceOrder: {
        routeId: route.id,
        sequenceOrder: 1,
      },
    },
    update: {},
    create: {
      routeId: route.id,
      stopId: stop1.id,
      sequenceOrder: 1,
      estimatedMinutesFromStart: 0,
    },
  });

  await prisma.routeStop.upsert({
    where: {
      routeId_sequenceOrder: {
        routeId: route.id,
        sequenceOrder: 2,
      },
    },
    update: {},
    create: {
      routeId: route.id,
      stopId: stop2.id,
      sequenceOrder: 2,
      estimatedMinutesFromStart: 35,
    },
  });

  // 4. Create or upsert Bus
  await prisma.bus.upsert({
    where: { busNumber: 'BUS-01' },
    update: {},
    create: {
      busNumber: 'BUS-01',
      registrationNumber: 'KA-01-F-1234',
      capacity: 52,
      isActive: true,
    },
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
