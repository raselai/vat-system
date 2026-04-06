import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vatsystem.com' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@vatsystem.com',
      passwordHash,
      status: 'active',
    },
  });

  // Create sample company
  const company = await prisma.company.create({
    data: {
      name: 'ABC Trading Ltd.',
      bin: '1234567890123',
      address: 'House 12, Road 5, Dhanmondi, Dhaka-1205',
      challanPrefix: 'CH',
      nextChallanNo: 1,
      fiscalYearStart: 7,
    },
  });

  // Assign admin to company
  await prisma.userCompany.create({
    data: {
      userId: admin.id,
      companyId: company.id,
      role: 'admin',
    },
  });

  // Create sample products with different VAT scenarios
  const products = [
    {
      companyId: company.id,
      productCode: 'P001',
      hsCode: '8471.30.00',
      name: 'Laptop Computer',
      nameBn: 'ল্যাপটপ কম্পিউটার',
      type: 'product' as const,
      vatRate: new Decimal(15),
      sdRate: new Decimal(0),
      specificDutyAmount: new Decimal(0),
      truncatedBasePct: new Decimal(100),
      unit: 'pcs',
      unitPrice: new Decimal(50000),
    },
    {
      companyId: company.id,
      productCode: 'P002',
      hsCode: '2201.10.00',
      name: 'Mineral Water',
      nameBn: 'মিনারেল ওয়াটার',
      type: 'product' as const,
      vatRate: new Decimal(5),
      sdRate: new Decimal(0),
      specificDutyAmount: new Decimal(0),
      truncatedBasePct: new Decimal(100),
      unit: 'bottle',
      unitPrice: new Decimal(20),
    },
    {
      companyId: company.id,
      productCode: 'S001',
      serviceCode: 'S009.00',
      name: 'IT Consulting Service',
      nameBn: 'আইটি কনসাল্টিং সেবা',
      type: 'service' as const,
      vatRate: new Decimal(15),
      sdRate: new Decimal(0),
      specificDutyAmount: new Decimal(0),
      truncatedBasePct: new Decimal(30),
      unit: 'hour',
      unitPrice: new Decimal(5000),
    },
    {
      companyId: company.id,
      productCode: 'P003',
      hsCode: '2402.20.00',
      name: 'Cigarettes',
      nameBn: 'সিগারেট',
      type: 'product' as const,
      vatRate: new Decimal(15),
      sdRate: new Decimal(65),
      specificDutyAmount: new Decimal(5),
      truncatedBasePct: new Decimal(100),
      unit: 'pack',
      unitPrice: new Decimal(150),
    },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  // Create sample customers
  const customers = [
    {
      companyId: company.id,
      name: 'XYZ Corporation',
      binNid: '9876543210123',
      phone: '01711-000000',
      address: 'Gulshan-2, Dhaka',
      isVdsEntity: false,
    },
    {
      companyId: company.id,
      name: 'Bangladesh Bank',
      binNid: '1111111111111',
      phone: '02-9530001',
      address: 'Motijheel, Dhaka',
      isVdsEntity: true,
      vdsEntityType: 'bank',
    },
    {
      companyId: company.id,
      name: 'Ministry of ICT',
      binNid: '2222222222222',
      phone: '02-9513954',
      address: 'Agargaon, Dhaka',
      isVdsEntity: true,
      vdsEntityType: 'govt',
    },
  ];

  for (const c of customers) {
    await prisma.customer.create({ data: c });
  }

  console.log('Seed complete!');
  console.log(`Admin login: admin@vatsystem.com / admin123`);
  console.log(`Company: ${company.name} (BIN: ${company.bin})`);
  console.log(`Products: ${products.length} created`);
  console.log(`Customers: ${customers.length} created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
