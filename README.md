# Translation Service Website

This is the README file for the Translation Service website project.

## Features

- Get Translation Estimate: Upload file and get translation price estimate.
- Submit Translation: Submit the original document, specifying source and output languages for translation.



## Getting Started

To run the Translation Service website, follow these steps:

1. Make sure you have Node.js installed on your machine. If not, you can download it from the official Node.js website: [https://nodejs.org](https://nodejs.org)

2. Open a terminal or command prompt and navigate to the base directory of the project.

3. Install the project dependencies by running the following command:

   ```bash
   npm install
   ```

4. Set up your Postgres database credentials in a config.js file with the following structure:

   ```javascript
   const dbConfig = {
      host: 'your_host',
      user: 'your_user',
      password: 'your_password',
      database: 'your_database'
   }

   module.exports = dbConfig
   ```

5. Start the server by running the following command:

   ```bash
   node server.js
   ```

6. Open a web browser and visit [http://localhost:3000](http://localhost:3000) to access the Translation Service website.

## Running the Linter

The project has a pre-commit hook that runs the linter and tries to fix what it can.
Nevertheless, to maintain code quality and consistency, it's recommended to run the linter before commiting.

1. Run the linter with the following command:

   ```bash
   npx eslint .
   ```

2. To automatically fix linting issues, you can run:

   ```bash
   npx eslint . --fix
   ```
