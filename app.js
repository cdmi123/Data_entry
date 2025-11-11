const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const { createWorker } = require("tesseract.js");
const Excel = require("exceljs");
const fs = require("fs");

const Student = require("./models/Student");

require("dotenv").config();

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ocr_scanner";
mongoose.connect(MONGODB_URI).then(() => console.log("MongoDB connected"));

// Upload setup
const upload = multer({ dest: "uploads/" });

// Excel file setup
const excelPath = path.join(__dirname, "data", "students.xlsx");
if (!fs.existsSync(path.dirname(excelPath))) fs.mkdirSync(path.dirname(excelPath));
if (!fs.existsSync(excelPath)) {
  const workbook = new Excel.Workbook();
  const sheet = workbook.addWorksheet("Students");
  sheet.addRow(["Full Name", "Address", "WhatsApp No", "Mobile No", "STD", "Created At"]);
  workbook.xlsx.writeFile(excelPath);
}

// OCR worker
(async () => {
  const worker = await createWorker();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  function extractFields(text) {
    const t = text.toUpperCase();
    const match = (label) => {
      const idx = t.indexOf(label);
      if (idx === -1) return null;
      const sub = text.slice(idx + label.length).split("\n")[0];
      return sub.replace(/[:.]/g, "").trim();
    };
    return {
      fullName: match("FULL NAME") || "",
      address: match("ADDRESS") || "",
      whatsappNo: match("WHATSAPP NO") || "",
      mobileNo: match("MOBILE NO") || "",
      std: match("STD") || "",
      rawText: text,
    };
  }

  app.get("/", (req, res) => res.render("index"));

  app.post("/scan", upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).send("No image uploaded");
    const { data } = await worker.recognize(req.file.path);
    const parsed = extractFields(data.text);
    const student = await Student.create(parsed);

    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const sheet = workbook.getWorksheet("Students");
    sheet.addRow([
      student.fullName,
      student.address,
      student.whatsappNo,
      student.mobileNo,
      student.std,
      new Date().toLocaleString(),
    ]);
    await workbook.xlsx.writeFile(excelPath);

    res.render("result", { student });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
})(); 
