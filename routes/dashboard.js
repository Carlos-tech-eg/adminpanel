const express = require("express");
const { VisaApplication } = require("../models/VisaApplication");
const { ConsularRegistration } = require("../models/ConsularRegistration");
const { Appointment } = require("../models/Appointment");
const { NewsArticle } = require("../models/NewsArticle");
const MediaAsset = require("../models/MediaAsset");
const { Notice } = require("../models/Notice");

const router = express.Router();

router.get("/stats", async (_req, res) => {
  try {
    const [
      visaByStatus,
      regByStatus,
      apptByStatus,
      newsCount,
      mediaCount,
      noticesCount,
      visaTotal,
      regTotal,
    ] = await Promise.all([
      VisaApplication.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ConsularRegistration.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      NewsArticle.countDocuments({ published: true }),
      MediaAsset.countDocuments(),
      Notice.countDocuments(),
      VisaApplication.countDocuments(),
      ConsularRegistration.countDocuments(),
    ]);

    const toMap = (arr) =>
      Object.fromEntries(arr.map((x) => [x._id || "unknown", x.count]));

    return res.json({
      data: {
        visaApplications: { total: visaTotal, byStatus: toMap(visaByStatus) },
        consularRegistrations: { total: regTotal, byStatus: toMap(regByStatus) },
        appointments: { byStatus: toMap(apptByStatus) },
        content: {
          publishedNews: newsCount,
          mediaAssets: mediaCount,
          notices: noticesCount,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load dashboard stats", details: err.message });
  }
});

module.exports = router;
