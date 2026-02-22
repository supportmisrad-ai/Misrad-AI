// List all Prisma models that do NOT have organizationId/organization_id
const { Prisma } = require('@prisma/client');
const models = Prisma.dmmf.datamodel.models;
const orgKeys = ['organizationId', 'organization_id'];
const noOrg = models.filter(m => !m.fields.some(f => orgKeys.includes(f.name))).map(m => m.name);
console.log('Models WITHOUT organizationId/organization_id (' + noOrg.length + '):');
noOrg.forEach(n => console.log('  ' + n));
