import dbConnect from '@/lib/db';
import { LedgerEntry } from '@/models/LedgerEntry';
import { Period } from '@/models/Period';

async function run() {
  await dbConnect();
  const entries = await LedgerEntry.find({ note: /^Advance deduction for period / });
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  for (const entry of entries) {
    if (entry.periodId) {
      const p = await Period.findById(entry.periodId);
      if (p) {
        const newNote = `Advance deduction for ${monthNames[p.month - 1]} ${p.year}`;
        await LedgerEntry.updateOne({ _id: entry._id }, { $set: { note: newNote } });
        console.log(`Updated ${entry._id} to "${newNote}"`);
      }
    }
  }
  console.log("Done");
  process.exit(0);
}
run();
