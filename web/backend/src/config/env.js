require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp_research',

  // Redis
  redisEnabled: process.env.REDIS_ENABLED !== 'false',
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

  // Email / SMTP
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'ResearchTrends <no-reply@researchtrends.local>',
  },

  // AI / LLM
  llm: {
    provider: process.env.LLM_PROVIDER || 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },

  // Academic source APIs
  sources: {
    openAlexApiUrl: process.env.OPENALEX_API_URL || 'https://api.openalex.org',
    openAlexMailto: process.env.OPENALEX_MAILTO || '',
    externalApiTimeoutMs: parseInt(process.env.EXTERNAL_API_TIMEOUT_MS, 10) || 30000,
    semanticScholarApiUrl: process.env.SEMANTIC_SCHOLAR_API_URL || 'https://api.semanticscholar.org/graph/v1',
    semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
    crossrefApiUrl: process.env.CROSSREF_API_URL || 'https://api.crossref.org',
    crossrefMailto: process.env.CROSSREF_MAILTO || '',
    ieeeApiUrl: process.env.IEEE_API_URL || 'https://ieeexploreapi.ieee.org',
    ieeeApiKey: process.env.IEEE_API_KEY || process.env.IEEE_XPLORE_API_KEY || '',
    ieeeXploreApiKey: process.env.IEEE_XPLORE_API_KEY || process.env.IEEE_API_KEY || '',
    exaApiUrl: process.env.EXA_API_URL || 'https://api.exa.ai',
    exaApiKey: process.env.EXA_API_KEY || '',
  },
};
