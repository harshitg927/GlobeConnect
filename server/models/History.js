const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  stateName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  source: {
    type: String,
    enum: ["wikipedia", "restcountries", "other"],
    default: "other",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "7d",
  },
});

historySchema.index({ stateName: 1 });

const History = mongoose.model("History", historySchema);

module.exports = History;
