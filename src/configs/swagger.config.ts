export const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'V.D Project API',
      version: '1.0.0',
      description: '모든 API는 로그인 후 진행이 가능합니다.',
    },
    servers: [
      {
        url: 'http://localhost:8080/api',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/types/**/*.ts'],
};
