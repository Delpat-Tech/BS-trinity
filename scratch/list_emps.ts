import { MongoClient } from 'mongodb';
async function run() {
  const uri = 'mongodb://admin:3850c50fc4b61d3b66d6a8ce48a48678@15.206.176.91:27017/trinity_db?authSource=admin&retryWrites=false';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('trinity_db');
  const emps = await db.collection('employees').find({}).toArray();
  for (const e of emps) {
    console.log(e.name, "| Code:", e.machineId, "| Salary:", e.salaryRevisions[0]?.fixedSalary);
  }
  process.exit(0);
}
run();
