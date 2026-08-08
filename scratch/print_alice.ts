import mongoose from 'mongoose';
import { Period } from './src/models/Period';
import { Employee } from './src/models/Employee';
import { Attendance } from './src/models/Attendance';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/bs_trinity_test');
  const alice = await Employee.findOne({ name: /Alice/i });
  console.log("Alice:", alice?.name);
  if (alice) {
    const atts = await Attendance.find({ employeeId: alice._id });
    console.log("Attendance count:", atts.length);
    console.log(atts.slice(0, 5));
  }
  process.exit(0);
}
run();
