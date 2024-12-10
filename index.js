const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const moment = require("moment");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "https://seller-center-32880.web.app",
      "https://seller-center-32880.firebaseapp.com",
      "https://captake-web.firebaseapp.com",
      "https://captake-web.web.app",
      "https://admin-center-32881.web.app",
      "https://admin-center-32881.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.options("*", cors());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.wjboujk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

const verify = async (req, res, next) => {
  const token = req.cookies?.captake_admin_token;
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  jwt.verify(token, process.env.JWT_TOKEN, (error, decoded) => {
    if (error) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    req.user = decoded;
    next();
  });
};

const run = async () => {
  try {
    const database = client.db("captake");

    /*==== Collections start from here ====*/
    const seller = database.collection("seller");
    const seller_products = database.collection("seller_products");
    const seller_banner = database.collection("seller_banner");
    const seller_location = database.collection("seller_location");
    const admin_staff = database.collection("admin_staff");
    const admin_banner = database.collection("admin_banner");
    admin_staff.createIndex({ email: 1 }, { unique: true });
    const admin_message = database.collection("admin_message");
    const category = database.collection("category");
    category.createIndex({ category: 1 }, { unique: true });
    const user_report = database.collection("user_report");
    const feedback = database.collection("feedback");
    const user_order = database.collection("user_order");
    const user_review = database.collection("user_review");
    const user = database.collection("user");
    const product_questions = database.collection("product_questions");

    /*====================================
      JWT GENERATE
    ====================================== */
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN, {
        expiresIn: "1d",
      });
      res
        .cookie("captake_admin_token", token, cookieOptions)
        .status(201)
        .json({ message: "success" });
    });

    app.get("/logout", async (req, res) => {
      res
        .clearCookie("captake_admin_token", { ...cookieOptions, maxAge: 0 })
        .status(200)
        .json({ message: "success" });
    });

    /*====================================
        1. Seller section start here
      ====================================*/

    app.get("/admin-all-seller", verify, async (req, res) => {
      const { status, email, search = "", page = 0, limit = 10 } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      const query = {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { businessName: { $regex: search, $options: "i" } },
          { zipCode: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };

      if(status){
        query.status=status
      }

      try {
        const result = await seller
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();
        const total = await seller.countDocuments();
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding seller" });
      }
    });

    app.get("/admin-seller-by-id", verify, async (req, res) => {
      const { sellerId, email } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
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

    app.patch("/admin-update-seller", verify, async (req, res) => {
      const { _id, data, email } = req.body;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

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

    app.delete("/admin-delete-seller", verify, async (req, res) => {
      const { id, email } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
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

    app.get("/seller-products", verify, async (req, res) => {
      const { email, search = "", page, limit } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      const query = {
        title: { $regex: search, $options: "i" },
      };

      try {
        const result = await seller_products
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await seller_products.countDocuments();

        if (result?.length) {
          res.status(200).json({ total, data: result });
        } else {
          res.status(404).json({ message: "product not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding product" });
      }
    });

    app.get("/seller-product-by-id", verify, async (req, res) => {
      const { sellerId, email, limit, page, search } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      const query = {
        sellerId,
        $or: [
          { title: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ],
      };

      try {
        const result = await seller_products
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await seller_products.countDocuments({ sellerId });
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding product" });
      }
    });

    app.patch("/update-product-status", verify, async (req, res) => {
      const { _id, data, email } = req.body;

      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

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

    app.get("/admin-all-staff/:email", verify, async (req, res) => {
      const email = req.params.email;
      const query = { email: { $ne: email }, role: "admin" };
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      try {
        const result = await admin_staff.find(query).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No staff found" });
      }
    });

    app.get("/admin-by-email/:email", verify, async (req, res) => {
      const email = req.params.email;
      const option = {
        projection: { password: 0 },
      };

      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      try {
        const result = await admin_staff.findOne({ email }, option);
        if (result) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "user not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding user" });
      }
    });

    app.post("/admin-create-staff", verify, async (req, res) => {
      if (req.body.adminEmail !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
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

    app.patch("/admin-update-staff", verify, async (req, res) => {
      const { data, _id, adminEmail } = req.body;

      if (adminEmail !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

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

    app.delete("/admin-delete-staff", verify, async (req, res) => {
      const { email, id } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
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
        3. Admin Banner section start here
      ====================================*/

    app.get("/admin-banner", verify, async (req, res) => {
      const { type, email } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      try {
        const result = await admin_banner.findOne({ type });
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No banner found" });
      }
    });

    app.get("/admin-default-banner/:email", verify, async (req, res) => {
      const email = req.params.email;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      try {
        const result = await admin_banner.findOne({ default: true });
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No banner found" });
      }
    });

    app.post("/admin-create-banner", verify, async (req, res) => {
      const { email, data } = req.body;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

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

    app.patch("/admin-update-banner", verify, async (req, res) => {
      const { data, _id, email } = req.body;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

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
        1. Seller banner section start here
      ====================================*/
    app.get("/seller-banner", verify, async (req, res) => {
      const { sellerId, email } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      try {
        const result = await seller_banner.find({ sellerId }).toArray();
        if (result?.length) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "Seller banner not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding banner" });
      }
    });

    /*========================================
        1. Seller location section start here
      ========================================*/
    app.get("/seller-location", verify, async (req, res) => {
      const { sellerId, email } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      try {
        const result = await seller_location.findOne({ sellerId });
        if (result) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "Seller location not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error while finding location" });
      }
    });

    /*====================================
        1. Message section start here
      ====================================*/
    app.get("/admin-message", verify, async (req, res) => {
      const { email } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      try {
        const result = await admin_message.find({}).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(204).json({ message: "No mesage found" });
      }
    });

    app.post("/admin-create-message", verify, async (req, res) => {
      const { email, data } = req.body;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
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

    app.patch("/admin-update-message", verify, async (req, res) => {
      const { _id, data, email } = req.body;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
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

    app.delete("/admin-delete-message", verify, async (req, res) => {
      const { id, email } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      const query = { _id: new ObjectId(id) };
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

    app.get("/categories", verify, async (req, res) => {
      const { email, page, limit, search = "" } = req.query;

      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      const query = {
        category: { $regex: search, $options: "i" },
      };

      try {
        const result = await category
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();
        const total = await category.countDocuments();
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "An error occurred" });
      }
    });

    app.post("/create-category", verify, async (req, res) => {
      const { data, email } = req.body;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      try {
        const result = await category.insertOne({
          ...data,
          createdAt: moment().toISOString(),
        });
        res.status(200).json(result);
      } catch (error) {
        if (error.code === 11000) {
          res.status(400).json({ message: "Category already exists" });
        } else {
          res.status(500).json({ message: "Error while create category" });
        }
      }
    });

    app.patch("/update-category", verify, async (req, res) => {
      const { _id, data, email } = req.body;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

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

    app.delete("/delete-category", verify, async (req, res) => {
      const { email, id } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      try {
        const result = await category.deleteOne({ _id: new ObjectId(id) });
        res.status(200).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "An error occurred while deleting category" });
      }
    });

    /*====================================
        1. User report section start here
      ====================================*/
    app.get("/user-reports", verify, async (req, res) => {
      const { email, limit, page } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      try {
        const result = await user_report
          .find({})
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await user_report.countDocuments();
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding reports" });
      }
    });

    /*====================================
        1. User feedback section start here
      ====================================*/

    app.get("/feedback", verify, async (req, res) => {
      const { email, page, limit } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      try {
        const result = await feedback
          .find({})
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await feedback.countDocuments();
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding feedback" });
      }
    });

    /*====================================
        3. Banner section start here
      ====================================*/

    app.get("/user-order", verify, async (req, res) => {
      const { limit, email, page, search } = req.query;

      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      const query = {
        $or: [
          { orderId: search ? parseInt(search) : { $exists: true } },
          { date: { $regex: search, $options: "i" } },
          { paymentMethod: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ],
      };

      try {
        const result = await user_order
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();
        const total = await user_order.countDocuments();
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding order" });
      }
    });

    app.get("/order-by-sellerId", verify, async (req, res) => {
      const { sellerId, email, limit, page, search = "" } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      const query = {
        sellerId,
        $or: [
          { orderId: search ? parseInt(search) : { $exists: true } },
          { date: { $regex: search, $options: "i" } },
          { paymentMethod: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ],
      };

      try {
        const result = await user_order
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await user_order.countDocuments({ sellerId });
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding order" });
      }
    });

    app.get("/order-by-userId", verify, async (req, res) => {
      const { userId, email, limit, page } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      const query = {
        userId,
        status: { $ne: "cancelled" },
      };

      try {
        const result = await user_order
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await user_order.countDocuments({ userId });
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding order" });
      }
    });

    app.get("/cancel-order-by-userId", verify, async (req, res) => {
      const { userId, status, email } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      try {
        const result = await user_order
          .find({ userId, status })
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error while finding order" });
      }
    });

    /*=========================================
        3. Product review section start here
      =========================================*/
    app.get("/product-review", verify, async (req, res) => {
      const { productId, email, search = "", limit, page } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      const query = {
        "productInfo.productId": productId,
        $or: [
          { reviewMessage: { $regex: search, $options: "i" } },
          { "userInfo.fName": { $regex: search, $options: "i" } },
          { "userInfo.lName": { $regex: search, $options: "i" } },
          { "userInfo.phone": { $regex: search, $options: "i" } },
        ],
      };

      try {
        const result = await user_review
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await user_review.countDocuments({
          "productInfo.productId": productId,
        });
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding review" });
      }
    });

    app.get("/product-review-by-sellerId", verify, async (req, res) => {
      const { sellerId, email, limit, page } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      try {
        const result = await user_review
          .find({ sellerId })
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await user_review.countDocuments({ sellerId });
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding review" });
      }
    });

    app.get("/product-review-by-userId", verify, async (req, res) => {
      const { userId, email, limit, page } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      try {
        const result = await user_review
          .find({ userId })
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();
        const total = await user_review.countDocuments({ userId });
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding review" });
      }
    });

    /*=========================================
        3. User section start here
      =========================================*/

    app.get("/user", verify, async (req, res) => {
      const { status, email, search = "", page = 0, limit = 10 } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      const query = {
        $or: [
          { fName: { $regex: search, $options: "i" } },
          { lName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      };
      if(status){
        query.status=status
      }

      try {
        const result = await user
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();
        const total = await user.countDocuments();
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding user" });
      }
    });

    app.patch("/update-user-status", verify, async (req, res) => {
      const { _id, data, email } = req.body;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }
      const option = { upsert: false };
      const filter = { _id: new ObjectId(_id) };
      updateData = {
        $set: {
          status: data?.status,
        },
      };

      try {
        const result = await user.updateOne(filter, updateData, option);
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error while updating user" });
      }
    });

    /*=========================================
        3. Product question section start here
      =========================================*/
    app.get("/product-questions", verify, async (req, res) => {
      const { productId, email, search = "", limit, page } = req.query;
      if (email !== req?.user?.email) {
        res.status(403).json({ message: "forbidden access" });
        return;
      }

      const query = {
        "question.productInfo.productId": productId,
        $or: [
          { "question.userQuestion": { $regex: search, $options: "i" } },
          { "question.userInfo.userName": { $regex: search, $options: "i" } },
        ],
      };

      try {
        const result = await product_questions
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip(parseInt(page) * parseInt(limit))
          .toArray();

        const total = await product_questions.countDocuments({
          "question.productInfo.productId": productId,
        });
        res.status(200).json({ total, data: result });
      } catch (error) {
        res.status(500).json({ message: "Error while finding question" });
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
