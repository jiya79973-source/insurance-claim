const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const agentPassword = await bcrypt.hash('agent123', 10);
  const customerPassword = await bcrypt.hash('customer123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@insurance.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@insurance.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@insurance.com' },
    update: {},
    create: {
      name: 'John Agent',
      email: 'agent@insurance.com',
      password: agentPassword,
      role: 'AGENT',
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      name: 'Jane Customer',
      email: 'customer@example.com',
      password: customerPassword,
      role: 'CUSTOMER',
      customer: {
        create: {
          name: 'Jane Customer',
          email: 'customer@example.com',
          dob: new Date('1990-05-15'),
          phone: '+1-555-0101',
          address: '123 Main St, New York, NY',
        },
      },
    },
    include: { customer: true },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      dob: new Date('1985-08-22'),
      phone: '+1-555-0102',
      address: '456 Oak Ave, Los Angeles, CA',
    },
  });

  const policy1 = await prisma.policy.upsert({
    where: { policyNumber: 'POL-DEMO-001' },
    update: {},
    create: {
      customerId: customerUser.customer.id,
      policyType: 'Health Insurance',
      policyNumber: 'POL-DEMO-001',
      premiumAmount: 250,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2026-01-01'),
      status: 'ACTIVE',
    },
  });

  const policy2 = await prisma.policy.upsert({
    where: { policyNumber: 'POL-DEMO-002' },
    update: {},
    create: {
      customerId: customer2.id,
      policyType: 'Auto Insurance',
      policyNumber: 'POL-DEMO-002',
      premiumAmount: 180,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2026-03-01'),
      status: 'ACTIVE',
    },
  });

  await prisma.premiumPayment.createMany({
    data: [
      {
        policyId: policy1.id,
        amount: 250,
        dueDate: new Date('2025-01-01'),
        paymentDate: new Date('2025-01-05'),
        paymentStatus: 'PAID',
      },
      {
        policyId: policy1.id,
        amount: 250,
        dueDate: new Date('2025-07-01'),
        paymentStatus: 'PENDING',
      },
      {
        policyId: policy2.id,
        amount: 180,
        dueDate: new Date('2025-03-01'),
        paymentDate: new Date('2025-03-02'),
        paymentStatus: 'PAID',
      },
    ],
  });

  await prisma.claim.createMany({
    data: [
      {
        policyId: policy1.id,
        claimAmount: 1500,
        reason: 'Medical expenses for hospital visit due to accident',
        status: 'PENDING',
      },
      {
        policyId: policy2.id,
        claimAmount: 3200,
        reason: 'Vehicle damage from collision on highway',
        status: 'UNDER_REVIEW',
      },
    ],
  });

  console.log('Seed completed!');
  console.log('\nDemo accounts:');
  console.log('  Admin:    admin@insurance.com / admin123');
  console.log('  Agent:    agent@insurance.com / agent123');
  console.log('  Customer: customer@example.com / customer123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
