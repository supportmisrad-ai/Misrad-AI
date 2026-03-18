import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creating ai_chat_sessions table...');

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ai_chat_sessions" (
        "session_id" TEXT NOT NULL,
        "organization_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "pathname" TEXT NOT NULL,
        "is_sales_mode" BOOLEAN NOT NULL DEFAULT false,
        "detected_name" TEXT,
        "detected_company" TEXT,
        "detected_industry" TEXT,
        "detected_pain_points" JSONB,
        "detected_objections" JSONB,
        "detected_budget" TEXT,
        "detected_timeline" TEXT,
        "messages_count" INTEGER NOT NULL DEFAULT 0,
        "situation_type" TEXT,
        "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ended_at" TIMESTAMP(3),
        "duration_seconds" INTEGER,
        "final_outcome" TEXT,
        "user_rating" INTEGER,
        "user_feedback" TEXT,
        "helpful_yn" BOOLEAN,

        CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("session_id")
      );
    `);
    
    console.log('✅ ai_chat_sessions table created');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ai_chat_sessions_organization_id_idx" ON "ai_chat_sessions"("organization_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ai_chat_sessions_user_id_idx" ON "ai_chat_sessions"("user_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ai_chat_sessions_started_at_idx" ON "ai_chat_sessions"("started_at");
    `);

    console.log('🚀 Creating ai_chat_messages table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "quick_actions" JSONB,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
      );
    `);
    
    console.log('✅ ai_chat_messages table created');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ai_chat_messages_session_id_idx" ON "ai_chat_messages"("session_id");
    `);
    
    // Add Foreign Key
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_chat_messages_session_id_fkey') THEN 
          ALTER TABLE "ai_chat_messages" 
          ADD CONSTRAINT "ai_chat_messages_session_id_fkey" 
          FOREIGN KEY ("session_id") REFERENCES "ai_chat_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE; 
        END IF; 
      END $$;
    `);

    console.log('✅ Foreign keys created');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
