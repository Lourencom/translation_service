const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const port = 3000;
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const util = require('util');
const readFile = util.promisify(fs.readFile);
const pdf = require('pdf-parse');

/////////////////////////////////////////////////// FILE STORAGE //////////////////////////////////////////////////////////////

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Set up Multer (adjust the storage as needed)
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/') // make sure this folder exists
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

const upload = multer({ storage: storage });


/////////////////////////////////////////////////// VIRUS SCANNING //////////////////////////////////////////////////////////////


async function scanFileForViruses(filePath) {
    try {
        // Example command for ClamAV scan
        const { stdout, stderr } = await exec(`clamscan ${filePath}`);
        if (stderr) {
            console.error('Error in virus scanning:', stderr);
            return false;
        }
        // Check stdout to determine if the file is safe
        return !stdout.includes("FOUND");
    } catch (error) {
        console.error('Error executing virus scan:', error);
        return false;
    }
}



/////////////////////////////////////////////////// FRONTEND ENDPOINTS //////////////////////////////////////////////////////////////


// Express JSON and URL Encoded middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route for estimate submission
app.post('/submit-estimate', upload.single('file_upload'), async (req, res) => {
    const { input_language, output_language } = req.body;
    const file = req.file;

    console.log('Input Language:', input_language);
    console.log('Output Language:', output_language);
    if (file) {
        if (file.mimetype !== 'application/pdf') {
            return res.status(400).send('File must be a PDF');
        }

        try {
            const isSafe = await scanFileForViruses(file.path);
            if (!isSafe) {
                fs.unlinkSync(file.path); // Delete the file if it's not safe
                return res.status(400).send('File is not safe');
            }

            // Read the PDF file and count words
            let dataBuffer = fs.readFileSync(file.path);
            pdf(dataBuffer).then(function(data) {
                // Number of pages
                console.log('Number of pages:', data.numpages);

                // PDF text
                const text = data.text;
                const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

                console.log('Uploaded File:', file.path, 'Word Count:', wordCount);

                // Send response with word count
                res.send(`Estimate received. Input: ${input_language}, Output: ${output_language}, File: ${file.originalname}, Word Count: ${wordCount}`);
            });

        } catch (error) {
            console.error('Error during file processing:', error);
            res.status(500).send('Error processing the file');
        }
    } else {
        res.status(400).send('No file uploaded');
    }

    // Delete the file after processing
    fs.unlinkSync(file.path);
});


// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage_translation.html')); // adjust the path if you use a subdirectory
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

