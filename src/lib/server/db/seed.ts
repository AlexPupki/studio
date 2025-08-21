// tsx src/lib/server/db/seed.ts
import 'dotenv/config';
import { db } from '.';
import { users } from './schema';
import { normalizePhone } from '@/lib/shared/phone.utils';

async function seed() {
  console.log('Seeding database...');

  const adminPhone = normalizePhone('+70000000000');
  const userPhone = normalizePhone('+70000000001');

  if (!adminPhone || !userPhone) {
    console.error('Could not normalize seed phone numbers');
    process.exit(1);
  }

  // Upsert Admin User
  await db.insert(users).values({
    phoneE164: adminPhone,
    roles: ['admin', 'ops.editor', 'ops.viewer', 'customer'],
    status: 'active'
  }).onConflictDoUpdate({
      target: users.phoneE164,
      set: { roles: ['admin', 'ops.editor', 'ops.viewer', 'customer'], status: 'active' }
  });
  console.log(`Upserted admin user with phone ${adminPhone}`);


  // Upsert Normal User
  await db.insert(users).values({
    phoneE164: userPhone,
    roles: ['customer'],
    status: 'active'
  }).onConflictDoUpdate({
    target: users.phoneE164,
      set: { roles: ['customer'], status: 'active' }
  });
  console.log(`Upserted regular user with phone ${userPhone}`);


  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
