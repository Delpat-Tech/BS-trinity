import { MongoClient } from 'mongodb';

async function run() {
  const uri = 'mongodb://admin:3850c50fc4b61d3b66d6a8ce48a48678@15.206.176.91:27017/trinity_db?authSource=admin&retryWrites=false';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('trinity_db');
  
  const alice = await db.collection('employees').findOne({ name: /Alice/i });
  if (alice) {
    const result = await db.collection('attendancedays').updateMany(
      { employeeId: alice._id, outTime: '18:30:00' },
      { $set: { outTime: '19:30:00' } }
    );
    console.log(`Updated ${result.modifiedCount} records for Alice Valid to 19:30:00.`);
  }

  // Just in case other employees were also set to 18:30:00
  const otherResult = await db.collection('attendancedays').updateMany(
    { outTime: '18:30:00' },
    { $set: { outTime: '19:30:00' } }
  );
  console.log(`Updated ${otherResult.modifiedCount} records for other employees to 19:30:00.`);
  
  process.exit(0);
}
run();
