'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const excelFilePath = path.join(dataDir, 'data.xlsx');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(publicDir));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadsDir);
	},
	filename: function (req, file, cb) {
		const ts = new Date().toISOString().replace(/[:.]/g, '-');
		const ext = path.extname(file.originalname || '.png') || '.png';
		cb(null, `capture-${ts}${ext}`);
	}
});
const upload = multer({ storage });

async function ensureWorkbook() {
	const workbook = new ExcelJS.Workbook();
	if (fs.existsSync(excelFilePath)) {
		await workbook.xlsx.readFile(excelFilePath);
	} else {
		const sheet = workbook.addWorksheet('Submissions');
		sheet.columns = [
			{ header: 'Timestamp', key: 'timestamp', width: 24 },
			{ header: 'FullName', key: 'fullname', width: 30 },
			{ header: 'WhatsAppNo', key: 'whatsapp', width: 18 },
			{ header: 'MobileNo', key: 'mobile', width: 18 },
			{ header: 'STD', key: 'std', width: 10 },
			{ header: 'ImageFilename', key: 'image', width: 40 }
		];
		await workbook.xlsx.writeFile(excelFilePath);
	}
	return workbook;
}

app.get('/', (req, res) => {
	res.render('index', { title: 'Camera + Manual Entry + OCR' });
});

app.post('/submit', upload.single('photo'), async (req, res) => {
	try {
		const fullname = req.body.fullname || '';
		const whatsapp = req.body.whatsapp || '';
		const mobile = req.body.mobile || '';
		const std = req.body.std || '';
		const imageFilename = req.file ? path.basename(req.file.path) : '';
		const workbook = await ensureWorkbook();
		let sheet = workbook.getWorksheet('Submissions');
		if (!sheet) {
			sheet = workbook.addWorksheet('Submissions');
			sheet.columns = [
				{ header: 'Timestamp', key: 'timestamp', width: 24 },
				{ header: 'FullName', key: 'fullname', width: 30 },
				{ header: 'WhatsAppNo', key: 'whatsapp', width: 18 },
				{ header: 'MobileNo', key: 'mobile', width: 18 },
				{ header: 'STD', key: 'std', width: 10 },
				{ header: 'ImageFilename', key: 'image', width: 40 }
			];
		}
		sheet.addRow({
			timestamp: new Date().toISOString(),
			fullname, whatsapp, mobile, std,
			image: imageFilename
		});
		await workbook.xlsx.writeFile(excelFilePath);
		res.json({ success: true, message: 'Saved' });
	} catch (e) {
		console.error(e);
		res.status(500).json({ success: false, message: 'Server error' });
	}
});

app.get('/download-excel', (req, res) => {
	if (!fs.existsSync(excelFilePath)) return res.status(404).send('Excel file not found.');
	res.download(excelFilePath, 'data.xlsx');
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});


