const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const { port } = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WDP Backend API',
      version: '1.0.0',
      description: 'API documentation for Scientific Research Trend Tracking System',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: [path.join(__dirname, '../routes/*.js').replace(/\\/g, '/')], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
