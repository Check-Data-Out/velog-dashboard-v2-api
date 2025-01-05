export const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'V.D Project API',
      version: '1.0.0',
      description: 'API 문서화',
    },
    servers: [
      {
        url: 'http://localhost:8080',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};
