import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { Settings } from '../src/models/Settings';
import { User } from '../src/models/User';
import { Employee } from '../src/models/Employee';
import { Period } from '../src/models/Period';
import { AttendanceDay } from '../src/models/AttendanceDay';
import { LeaveEntry } from '../src/models/LeaveEntry';
import { Holiday } from '../src/models/Holiday';
import { LedgerEntry } from '../src/models/LedgerEntry';
import { PayrollInput } from '../src/models/PayrollInput';
import { PayrollLine } from '../src/models/PayrollLine';
import { Import } from '../src/models/Import';
import path from 'path';

async function seed() {
   // Load .env file manually
    const fs = require('fs');
    const dotenvPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(dotenvPath)) {
      const envContent = fs.readFileSync(dotenvPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      }
    }
  let mongoServer: MongoMemoryServer | null = null;
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('No MONGODB_URI found, starting MongoMemoryServer for verification...');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
  }

  await mongoose.connect(uri, { bufferCommands: false });

  console.log('Ensuring collections exist to capture all indexes...');
  const models = [Settings, User, Employee, Period, AttendanceDay, LeaveEntry, Holiday, LedgerEntry, PayrollInput, PayrollLine, Import];
  for (const model of models) {
    await model.createCollection();
  }

  console.log('Syncing indexes...');
  await mongoose.syncIndexes();

  console.log('Seeding Settings...');
  await Settings.deleteMany({});
  await Settings.create({
    ruleset: {
      shift_start: "09:30",
      shift_end: "19:30",
      grace_until: "09:40",
      half_day_if_in_after: "11:30",
      half_day_if_out_before: "15:30",
      late_strike_window: ["09:41", "11:29"],
      early_strike_window: ["15:31", "19:29"],
      strikes_per_penalty: 3,
      penalty_days_per_trigger: 0.5,
      sandwich_skips_weekly_off: true
    }
  });

  console.log('Seeding Admin and HR Users...');
  await User.deleteMany({});
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await User.create({
    username: 'admin',
    passwordHash: adminPasswordHash,
    role: 'admin'
  });

  const hrPasswordHash = await bcrypt.hash('hr123', 10);
  await User.create({
    username: 'hr',
    passwordHash: hrPasswordHash,
    role: 'hr'
  });

  console.log('\n--- Collection Indexes ---');
  const collections = mongoose.connection.collections;
  for (const name in collections) {
    const indexes = await collections[name].indexes();
    console.log(`\n${name}:`);
    console.log(JSON.stringify(indexes, null, 2));
  }

  console.log('\nSeeding complete.');
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
