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
        SessionCookieAuth: {
          type: 'apiKey',
          description: '로그인하면 발급되는 대시보드 세션 쿠키입니다. 브라우저 요청은 이 쿠키로 인증합니다.',
          name: 'vd_session',
          in: 'cookie',
        },
        AccessTokenAuth: {
          type: 'apiKey',
          description: 'velog 액세스 토큰입니다. 세션 쿠키가 없을 때 헤더(익스텐션)로 전달합니다.',
          name: 'access_token',
          in: 'header',
        },
        RefreshTokenAuth: {
          type: 'apiKey',
          description: 'velog 리프레시 토큰입니다. 세션 쿠키가 없을 때 헤더(익스텐션)로 전달합니다.',
          name: 'refresh_token',
          in: 'header',
        },
      },
    },
    // 세션 쿠키 또는 velog 토큰 헤더 쌍 중 하나
    security: [
      { SessionCookieAuth: [] },
      {
        AccessTokenAuth: [],
        RefreshTokenAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/types/**/*.ts'],
};
