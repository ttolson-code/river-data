import express from 'express';
import cors from 'cors';
import config from './config.js';

// RUN: nodemon -r esm server.js

// Imports api controllers.
import { IndexController, RiverController } from './controller/index.js';

// Imports mongoConnection function to establish database connection.
import { mongoConnect } from './utils/mongoConnect.js';

// Imports updateDatabase() function to update database on app startup.
import updateDatabase from './utils/fetchRiverData.js';

// Import a module for side effects only.
// This runs the module's global code, but doesn't actually import any values.
// import './helpers/cronJobs';

// Assign variables from config.js.
const { express: { baseURL, host, port } } = config;

//  Create express server.
const app = express();

// Use cors.
app.use(cors());

// Controllers(APIs).
app.use('/', IndexController);
app.use('/rivers', RiverController);

// Connect to MongoDb and then start express server.
mongoConnect()
  .then(() => console.log('Connected to MongoDB.'))
  .then(() => updateDatabase())
  .then(() => {
    app.listen(port, () => {
      console.log(`Express server is running on port ${baseURL}${host}\/${port}.`);
    });
  })
  .catch((err) => {
    console.error(err);
    // Always hard exit on a database connection error.
    process.exit(1);
  });