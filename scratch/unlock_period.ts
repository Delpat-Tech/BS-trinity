import { MongoClient } from 'mongodb';

async function run() {
  const uri = 'mongodb://admin:3850c50fc4b61d3b66d6a8ce48a48678@15.206.176.91:27017/trinity_db?authSource=admin&retryWrites=false';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('trinity_db');
  
  const period = await db.collection('periods').findOne({});
  if (period) {
    console.log("Period status:", period.status);
    if (period.status === 'locked') {
       await db.collection('periods').updateOne({ _id: period._id }, { $set: { status: 'review' } });
       console.log("Period unlocked!");
    }
  }
  process.exit(0);
}
run();
