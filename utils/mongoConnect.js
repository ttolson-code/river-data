import { MongoClient } from 'mongodb';
import connect from 'mongodb';
import config from '../config.js';

// https://stackoverflow.com/questions/10656574/how-do-i-manage-mongodb-connections-in-a-node-js-web-application
// https://docs.mongodb.com/drivers/node/fundamentals/connection

// Assign variables from config.js.
const { mongoDb: { mongoUrl, dbName, options } } = config;

// Create a new MongoClient.
const client = new MongoClient(mongoUrl);

let connection;

const mongoConnect = async () => {
  try {
    // Connect the client to the server.
    await client.connect();
    // Establish and verify connection.
    await client.db(dbName).command({ ping: 1 });
    connection = client.db(dbName);
  } catch (err) {
    console.log(err.stack);
  }
}
  
const getMongoConnection = () => {
  if(!connection) {
    throw new Error('Call connect first!');
  }
  return connection;
}

export { mongoConnect, getMongoConnection };