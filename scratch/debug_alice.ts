import mongoose from 'mongoose';
import { Period } from './src/models/Period';
import { Employee } from './src/models/Employee';
import { AttendanceDay } from './src/models/AttendanceDay';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/bs_trinity_test');
  const alice = await Employee.findOne({ name: /Alice/i });
  const period = await Period.findOne();
  if (alice && period) {
    const rules = period.ruleset;
    const atts = await AttendanceDay.find({ employeeId: alice._id, periodId: period._id });
    
    let earlyStrikes = 0;
    for (const att of atts) {
      const outTime = att.outTime ? att.outTime.slice(0, 5) : null;
      let isStrike = false;
      if (outTime && outTime >= rules.early_strike_window[0] && outTime <= rules.early_strike_window[1] && outTime < rules.shift_end) {
        earlyStrikes++;
        isStrike = true;
      }
      console.log(`${att.date}: in=${att.inTime} out=${att.outTime} formattedOut=${outTime} isStrike=${isStrike}`);
    }
    console.log(`Total early strikes for Alice: ${earlyStrikes}`);
    console.log(`Rules: shift_end=${rules.shift_end} window=${rules.early_strike_window[0]} to ${rules.early_strike_window[1]}`);
  }
  process.exit(0);
}
run();
