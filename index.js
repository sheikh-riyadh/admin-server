const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.wjboujk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const database = client.db("captake");
    const seller = database.collection("seller");

    // Get all the seller from here
    app.get("/all-seller", async (req, res) => {
      const option = {
        projection: { password: 0 },
      };
      try {
        const result = await seller.find({}, option).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No seller found" });
      }
    });

    // Seller update from here
    app.patch("/update-seller", async (req, res) => {
      const updatedSeller = req.body;

      const filter = { _id: new ObjectId(updatedSeller._id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          ...updatedSeller.data,
        },
      };

      try {
        const result = await seller.updateOne(filter, updatedDoc, option);
        res.status(200).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "An error occurred while updating the seller" });
      }
    });


    
  } finally {
    // await client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
