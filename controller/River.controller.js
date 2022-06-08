import express from 'express';
import fetch from 'node-fetch';
import { getMongoConnection } from '../utils/mongoConnect.js';

const RiverController = express.Router();

RiverController.get('/', async (req, res) => {
  console.log(`/rivers endpoint reached.`);

  const db = getMongoConnection();

  db.collection('rivers').find().sort({"state": 1}).toArray((err, items) => {
    console.log(`${items.length} entries.`);
    // Format json response.
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify(items, null, 4));
  })

});

RiverController.get('/:state', async (req, res) => {
  const state = req.params.state
  console.log(`/rivers/${state} endpoint reached.`);

  const db = getMongoConnection();

  db.collection('rivers').find( { state: state } ).sort({"river": 1}).toArray((err, items) => {
    console.log(`${items.length} entries.`);
    // Format json response.
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify(items, null, 4));
  })
}); 

export default RiverController;