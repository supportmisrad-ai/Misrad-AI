const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('🔥 Starting complete DB reset with CASCADE...');
  
  try {
    await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE;');
    console.log('✅ Dropped public schema');
    
    await prisma.$executeRawUnsafe('CREATE SCHEMA public;');
    console.log('✅ Created public schema');
    
    await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO postgres;');
    await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO public;');
    console.log('✅ Granted permissions');
    
    console.log('\n🎉 Database reset complete! Ready for db push.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
