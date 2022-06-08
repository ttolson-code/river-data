import express from 'express';

const IndexController = express.Router();

IndexController.get('/', (req, res) => {
  res.status(200).json({
    status: '200',
  });
});

export default IndexController;
