const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const moment = require("moment");
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

    /*==== Collections start from here ====*/
    const seller = database.collection("seller");
    const seller_products = database.collection("seller_products");
    const admin_staff = database.collection("admin_staff");
    const admin_banner = database.collection("admin_banner");
    admin_staff.createIndex({ email: 1 }, { unique: true });
    const admin_message = database.collection("admin_message");
    const category = database.collection("category");
    category.createIndex({ category: 1 }, { unique: true });
    const user_report = database.collection("user_report");
    const feedback = database.collection("feedback");
    const user_order = database.collection("user_order");

    /*====================================
        1. Seller section start here
      ====================================*/

    app.get("/admin-all-seller", async (req, res) => {
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

    app.get("/admin-seller-by-id/:sellerId", async (req, res) => {
      const sellerId = req.params.sellerId;
      try {
        const result = await seller.findOne({ _id: new ObjectId(sellerId) });
        if (result?._id) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "Seller not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding seller" });
      }
    });

    app.patch("/admin-update-seller", async (req, res) => {
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

    app.delete("/admin-delete-seller/:id", async (req, res) => {
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

    /*====================================
        2. seller products section start here
      ====================================*/

    app.get("/seller-products", async (req, res) => {
      try {
        const result = await seller_products.find({}).toArray();
        if (result?.length) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "product not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding product" });
      }
    });

    app.patch("/update-product-status", async (req, res) => {
      const { _id, data } = req.body;
      const option = { upsert: false };
      const filter = { _id: new ObjectId(_id) };
      updateData = {
        $set: {
          status: data?.status,
        },
      };

      try {
        const result = await seller_products.updateOne(
          filter,
          updateData,
          option
        );
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error while updating product" });
      }
    });

    /*====================================
        2. Staff section start here
      ====================================*/

    app.get("/admin-all-staff", async (req, res) => {
      try {
        const result = await admin_staff.find({}).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No staff found" });
      }
    });

    app.post("/admin-create-staff", async (req, res) => {
      const staffData = {
        ...req.body,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      try {
        await admin_staff.insertOne(staffData);
        res.status(201).json({ message: "Staff member created successfully" });
      } catch (error) {
        if (error.code === 11000) {
          res.status(400).json({ message: "Email already exists" });
        } else {
          res.status(500).json({ message: "Error creating staff member" });
        }
      }
    });

    app.patch("/admin-update-staff", async (req, res) => {
      const { data, _id } = req.body;

      const filter = { _id: new ObjectId(_id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          ...data,
        },
      };

      try {
        const result = await admin_staff.updateOne(filter, updatedDoc, option);
        res.status(200).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "An error occurred while updating the staff" });
      }
    });

    app.delete("/admin-delete-staff/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await admin_staff.deleteOne(query);
        if (result.deletedCount === 1) {
          res.status(200).json({ message: "Staff deleted successfully" });
        } else {
          res.status(404).json({ message: "Staff not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting staff" });
      }
    });

    /*====================================
        3. Banner section start here
      ====================================*/

    app.get("/admin-banner/:type", async (req, res) => {
      const type = req.params.type;

      try {
        const result = await admin_banner.findOne({ type });
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No banner found" });
      }
    });

    app.get("/admin-default-banner", async (req, res) => {
      try {
        const result = await admin_banner.findOne({ default: true });
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No banner found" });
      }
    });

    app.post("/admin-create-banner", async (req, res) => {
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
        res.status(500).json({ message: "Error creating banner" });
      }
    });

    app.patch("/admin-update-banner", async (req, res) => {
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

    /*====================================
        1. Message section start here
      ====================================*/
    app.get("/admin-message", async (req, res) => {
      try {
        const result = await admin_message.find({}).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No mesage found" });
      }
    });

    app.post("/admin-create-message", async (req, res) => {
      const data = req.body;
      try {
        const result = await admin_message.insertOne({
          ...data,
          date: moment().format("L"),
        });
        res.status(201).json({ message: "Message created successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error creating message" });
      }
    });

    app.patch("/admin-update-message", async (req, res) => {
      const { _id, data } = req.body;
      const option = { upsert: true };
      const filter = {
        _id: new ObjectId(_id),
      };
      const updateData = {
        $set: {
          ...data,
          date: moment().format("L"),
        },
      };

      try {
        const result = await admin_message.updateOne(
          filter,
          updateData,
          option
        );
        res.status(200).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "An error occurred while updating the message" });
      }
    });

    app.delete("/admin-delete-message/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      try {
        const result = await admin_message.deleteOne(query);
        if (result.deletedCount === 1) {
          res.status(200).json({ message: "Message deleted successfully" });
        } else {
          res.status(404).json({ message: "Message not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting message" });
      }
    });

    /*====================================
        1. Message section start here
      ====================================*/

    app.get("/categories", async (req, res) => {
      try {
        const result = await category.find({}).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "An error occurred" });
      }
    });

    app.post("/create-category", async (req, res) => {
      const data = req.body;
      try {
        const result = await category.insertOne(data);
        res.status(200).json(result);
      } catch (error) {
        if (error.code === 11000) {
          res.status(400).json({ message: "Category already exists" });
        } else {
          res.status(500).json({ message: "Error while create category" });
        }
      }
    });

    app.patch("/update-category", async (req, res) => {
      const { _id, data } = req.body;
      const option = {
        upsert: true,
      };
      const filter = {
        _id: new ObjectId(_id),
      };

      const updateData = {
        $set: {
          ...data,
        },
      };
      try {
        const result = await category.updateOne(filter, updateData, option);
        res.status(200).json(result);
      } catch (error) {
        if (error.code === 11000) {
          res.status(400).json({ message: "Category already exists" });
        } else {
          res
            .status(500)
            .json({ message: "An error occurred while updating categroy" });
        }
      }
    });

    app.delete("/delete-category/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await category.deleteOne({ _id: new ObjectId(id) });
      } catch (error) {
        res
          .status(500)
          .json({ message: "An error occurred while deleting category" });
      }
    });

    /*====================================
        1. User report section start here
      ====================================*/
    app.get("/user-reports", async (req, res) => {
      try {
        const result = await user_report
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        if (result?.length) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "Report not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding reports" });
      }
    });

    /*====================================
        1. User feedback section start here
      ====================================*/

    app.get("/feedback", async (req, res) => {
      try {
        const result = await feedback
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        if (result?.length) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "feedback not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding feedback" });
      }
    });

    /*====================================
        3. Banner section start here
      ====================================*/

    app.get("/user-order", async (req, res) => {
      try {
        const result = await user_order
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        if (result?.length) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "order not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding order" });
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
