import { MongoClient } from 'mongodb';

async function run() {
  const uri = 'mongodb://admin:3850c50fc4b61d3b66d6a8ce48a48678@15.206.176.91:27017/trinity_db?authSource=admin&retryWrites=false';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('trinity_db');
  
  const alice = await db.collection('employees').findOne({ name: /Alice/i });
  const att = await db.collection('attendancedays').find({ employeeId: alice?._id }).toArray();
  
  let earlyStrikes = 0;
  for (const a of att) {
    if (a.outTime && a.outTime < '19:30') {
      earlyStrikes++;
    }
  }
  console.log(`Alice left before 19:30 on ${earlyStrikes} days.`);
  
  process.exit(0);
}
run();
