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
    components: {
      securitySchemes: {
        AccessTokenAuth: {
          type: 'apiKey',
          description: 'API 인증을 위한 액세스 토큰입니다. 헤더, 쿠키 또는 요청 본문을 통해 전달할 수 있습니다.',
          name: 'access_token',
          in: 'header',
        },
        RefreshTokenAuth: {
          type: 'apiKey',
          description: '토큰 갱신을 위한 리프레시 토큰입니다. 헤더, 쿠키 또는 요청 본문을 통해 전달할 수 있습니다.',
          name: 'refresh_token',
          in: 'header',
        },
      },
    },
    security: [
      {
        AccessTokenAuth: [],
        RefreshTokenAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/types/**/*.ts'],
};
