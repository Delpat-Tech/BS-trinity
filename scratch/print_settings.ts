import mongoose from 'mongoose';
import { Period } from './src/models/Period';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/bs_trinity_test');
  const period = await Period.findOne();
  console.log(period?.ruleset);
  process.exit(0);
}
run();
