require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp_research',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // AI / LLM
  llm: {
    provider: process.env.LLM_PROVIDER || 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },

  // Academic source APIs
  sources: {
    openAlexApiUrl: process.env.OPENALEX_API_URL || 'https://api.openalex.org',
    semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
    ieeeXploreApiKey: process.env.IEEE_XPLORE_API_KEY || '',
    openAlexMailto: process.env.OPENALEX_MAILTO || '',
    crossrefMailto: process.env.CROSSREF_MAILTO || '',
  },
};
