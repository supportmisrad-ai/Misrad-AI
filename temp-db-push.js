const { execSync } = require('child_process');

const DATABASE_URL = "postgresql://postgres.qcoolonvjocvzjnnjblw:itsik25%40254025@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

process.env.DATABASE_URL = DATABASE_URL;

try {
  const result = execSync('npx prisma db push --schema prisma/schema.prisma', {
    encoding: 'utf8',
    stdio: 'inherit'
  });
  console.log('✅ DB push successful');
} catch (error) {
  console.error('❌ DB push failed:', error.message);
  process.exit(1);
}
