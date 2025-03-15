const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.get('/', (req, res) => {
  res.send('the server is working fine');
});
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tfnar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// console.log(uri);
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const db = client.db('userDB');
    const index = db.collection('roundAndRobin');
    const ipCollection = db.collection('ipCollection');

    app.post('/getCoupon', async (req, res) => {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      console.log(ip);
      const timestamp = Date.now();
      if (ipCollection.find({ ip: ip }).toArray().length === 0) {
        await ipCollection.insertOne({ ip: ip, timestamp: timestamp });
      } else {
        // console.log(await ipCollection.findOne({ ip: ip }));
        if (timestamp - ipCollection.findOne({ ip: ip }).timestamp > 3600000) {
          await ipCollection.updateOne(
            { ip: ip },
            { $set: { timestamp: timestamp } }
          );
          console.log('ip updated');
        } else if (
          timestamp - ipCollection.findOne({ ip: ip }).timestamp <
          3600000
        ) {
          console.log('ip not updated');
          res.send({ error: 'You can only collect one coupon per hour' });
          return;
        }
      }
      const coupons = await db.collection('Coupons').find().toArray();
      // console.log(index);
      const prevIndex = await index.findOne({
        _id: new ObjectId('67d589f541a13cef77213387'),
      });

      if (prevIndex.index >= coupons.length - 1) {
        index.updateOne(
          { _id: new ObjectId('67d589f541a13cef77213387') },
          {
            $set: {
              index: 0,
            },
          }
        );
        // console.log(coupons);
        // .then(() => {
        //   console.log('index updated');
        // });
      } else {
        index
          .updateOne(
            { _id: new ObjectId('67d589f541a13cef77213387') },
            {
              $set: {
                index: prevIndex.index + 1,
              },
            }
          )
          .then(() => {
            console.log('index updated');
            console.log(coupons.length);
          });
      }
      console.log(prevIndex.index);
      res.send(coupons[prevIndex.index]);
    });
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
