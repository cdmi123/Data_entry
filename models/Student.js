const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    fullName: String,
    address: String,
    whatsappNo: String,
    mobileNo: String,
    std: String,
    rawText: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", StudentSchema);
