// Temp script to add operations tables to schema
const fs = require('fs');

const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf8');

// Check if models already exist
if (!content.includes('operations_locations')) {
  const models = `

// Operations module tables (added 2026-03-13)
model operations_locations {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  name            String
  created_at      DateTime @default(now()) @db.Timestamptz(6)
  
  organization    organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  
  @@unique([organization_id, name], map: "uq_operations_locations_org_name")
  @@index([organization_id], map: "idx_operations_locations_org_id")
}

model operations_work_order_types {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  name            String
  description     String?
  color           String   @default("#3b82f6")
  created_at      DateTime @default(now()) @db.Timestamptz(6)
  
  organization    organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  
  @@unique([organization_id, name], map: "uq_operations_work_order_types_org_name")
  @@index([organization_id], map: "idx_operations_work_order_types_org_id")
}
`;
  
  fs.writeFileSync(file, content + models);
  console.log('✅ operations_locations model added');
  console.log('✅ operations_work_order_types model added');
} else {
  console.log('ℹ️ Models already exist in schema');
}
