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

    //seller
    const seller = database.collection("seller");
    const staff = database.collection("staff");
    const admin_banner = database.collection("admin_banner");
    staff.createIndex({ email: 1 }, { unique: true });

    /* 1. -------Seller section start here------- */

    app.get("/all-seller", async (req, res) => {
      const { status } = req.query;
      let query = { status };

      const option = {
        projection: { password: 0 },
      };
      try {
        const result = await seller.find(query, option).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No seller found" });
      }
    });

    app.patch("/update-seller", async (req, res) => {
      const { _id, data } = req.body;

      const filter = { _id: new ObjectId(_id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          ...data,
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

    app.delete("/delete-seller/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await seller.deleteOne(query);
        if (result.deletedCount === 1) {
          res.status(200).json({ message: "Seller deleted successfully" });
        } else {
          res.status(404).json({ message: "Seller not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting seller" });
      }
    });

    /* 2. -------Staff section start here------- */

    app.get("/all-staff", async (req, res) => {
      try {
        const result = await staff.find({}).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No staff found" });
      }
    });

    app.post("/create-staff", async (req, res) => {
      const staffData = {
        ...req.body,
        status: "active",
        createdAt: new Date().toISOString(),
      };

      try {
        await staff.insertOne(staffData);
        res.status(201).json({ message: "Staff member created successfully" });
      } catch (error) {
        if (error.code === 11000) {
          res.status(400).json({ message: "Email already exists" });
        } else {
          res.status(500).json({ message: "Error creating staff member" });
        }
      }
    });

    app.patch("/update-staff", async (req, res) => {
      const { data, _id } = req.body;

      const filter = { _id: new ObjectId(_id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          ...data,
        },
      };

      try {
        const result = await staff.updateOne(filter, updatedDoc, option);
        res.status(200).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "An error occurred while updating the staff" });
      }
    });

    app.delete("/delete-staff/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await staff.deleteOne(query);
        if (result.deletedCount === 1) {
          res.status(200).json({ message: "Staff deleted successfully" });
        } else {
          res.status(404).json({ message: "Staff not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting staff" });
      }
    });

    /* 3. -------Banner section start here------- */

    app.get("/banner/:type", async (req, res) => {
      const type = req.params.type;

      try {
        const result = await admin_banner.findOne({ type });
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No banner found" });
      }
    });

    app.get("/banner", async (req, res) => {
      try {
        const result = await admin_banner.findOne({ default: true });
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No banner found" });
      }
    });

    app.post("/create-banner", async (req, res) => {
      const data = req.body;

      try {
        if (data.default === true) {
          const oppositeType = data.type === "image" ? "video" : "image";

          await admin_banner.updateMany(
            { type: oppositeType, default: true },
            { $set: { default: false } }
          );
        }

        await admin_banner.insertOne(data);
        res.status(201).json({ message: "Banner created successfully" });
      } catch (error) {
        console.error("Error creating banner:", error);
        res.status(500).json({ message: "Error creating banner" });
      }
    });

    app.patch("/update-banner", async (req, res) => {
      const { data, _id } = req.body;

      if (data.default === true) {
        const oppositeType = data.type === "image" ? "video" : "image";

        await admin_banner.updateMany(
          { type: oppositeType, default: true },
          { $set: { default: false } }
        );
      }

      const filter = { _id: new ObjectId(_id) };
      const option = { upsert: true };

      const updatedDoc = {
        $set: {
          ...data,
        },
      };

      try {
        const result = await admin_banner.updateOne(filter, updatedDoc, option);
        res.status(200).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "An error occurred while updating the staff" });
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
