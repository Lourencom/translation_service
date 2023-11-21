const express = require('express')
const path = require('path')
const multer = require('multer')
const fs = require('fs')
const app = express()
const port = 3000
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)
const pdf = require('pdf-parse')
const dbConfig = require('./config')

/// //////////////////////////////////////////////// DATABASE //////////////////////////////////////////////////////////////

const { Pool } = require('pg')

const pool = new Pool(dbConfig)

/// //////////////////////////////////////////////// FILE STORAGE //////////////////////////////////////////////////////////////

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

// Set up Multer (adjust the storage as needed)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

const upload = multer({ storage })

/// //////////////////////////////////////////////// VIRUS SCANNING //////////////////////////////////////////////////////////////

async function scanFileForViruses (filePath) {
  try {
    // Example command for ClamAV scan
    const { stdout, stderr } = await exec(`clamscan ${filePath}`)
    if (stderr) {
      console.error('Error in virus scanning:', stderr)
      return false
    }
    // Check stdout to determine if the file is safe
    return !stdout.includes('FOUND')
  } catch (error) {
    console.error('Error executing virus scan:', error)
    return false
  }
}

/// //////////////////////////////////////////////// FRONTEND ENDPOINTS //////////////////////////////////////////////////////////////

// Express JSON and URL Encoded middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Route for estimate submission
app.post('/submit-estimate', upload.single('file_upload'), async (req, res) => {
  const { InputLanguage, OutputLanguage } = req.body
  const file = req.file

  console.log('Input Language:', InputLanguage)
  console.log('Output Language:', OutputLanguage)
  if (file) {
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).send('File must be a PDF')
    }

    try {
      const isSafe = await scanFileForViruses(file.path)
      if (!isSafe) {
        fs.unlinkSync(file.path) // Delete the file if it's not safe
        return res.status(400).send('File is not safe')
      }

      // Read the PDF file and count words
      const dataBuffer = fs.readFileSync(file.path)
      pdf(dataBuffer).then(function (data) {
        // Number of pages
        console.log('Number of pages:', data.numpages)

        // PDF text
        const text = data.text
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length

        console.log('Uploaded File:', file.path, 'Word Count:', wordCount)

        // Send response with word count
        res.send(`Estimate received. Input: ${InputLanguage}, Output: ${OutputLanguage}, File: ${file.originalname}, Word Count: ${wordCount}`)
      })
    } catch (error) {
      console.error('Error during file processing:', error)
      res.status(500).send('Error processing the file')
    }
  } else {
    res.status(400).send('No file uploaded')
  }

  // Delete the file after processing
  fs.unlinkSync(file.path)
})

app.post('/submit-translation', upload.single('file'), async (req, res) => {
  const { ClientName, ClientAddress, ClientEmail, ClientPhone, ClientFiscalnum } = req.body
  const file = req.file

  // Log form data
  console.log('Client Name:', ClientName)
  console.log('Client Address:', ClientAddress)
  console.log('Client Email:', ClientEmail)
  console.log('Client Phone:', ClientPhone)
  console.log('Client Fiscal Number:', ClientFiscalnum)
  console.log('Uploaded File:', file.filename)

  // Check if a file is uploaded
  if (file) {
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).send('File must be a PDF')
    }

    try {
      console.log('Scanning for viruses')
      const isSafe = await scanFileForViruses(file.path)
      if (!isSafe) {
        fs.unlinkSync(file.path) // Delete the file if it's not safe
        return res.status(400).send('File is not safe')
      }
      console.log('File is safe')

      // File is safe, log the file path
      console.log('Uploaded File:', file.path)

      // Send a response confirming receipt
      res.send(`Translation request received. Client: ${ClientName}, File: ${file.originalname}`)

      const query = 'INSERT INTO translations (client_name, client_address, client_email, client_phone, client_fiscalnum, filename) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id'
      console.log('Inserting into query')

      const results = await pool.query(query, [ClientName, ClientAddress, ClientEmail, ClientPhone, ClientFiscalnum, file.filename])
      console.log('Insertion successful, ID:', results.rows[0].id)
    } catch (error) {
      fs.unlinkSync(file.path) // Delete the file if it did not work

      console.error('Error during file processing:', error)
      res.status(500).send('Error processing the file')
    }
  } else {
    res.status(400).send('No file uploaded')
  }
})

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'homepage_translation.html')) // adjust the path if you use a subdirectory
})

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
