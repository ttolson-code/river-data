// TODO: replace config file with .env file. Install dotenv.
const config = {
  express: {
    baseURL: 'http://',
    host: 'localhost',
    port: 5000,
  },
  mongoDb: {
    // change mongoUrl to 'mongodb://db:27017/' for local development with docker-compose. 
    // must be 'mongodb://localhost:27017/' for fargate.
    mongoUrl: 'mongodb://127.0.0.1:27017/',
    dbName: 'rivers',
    options: {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    }
  }
}

export default config; 
