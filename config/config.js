const AppConfig = {
    OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
    DEFAULT_MODEL: 'gpt-4',
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_MAX_TOKENS: 500,
    REQUEST_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 2,
    
    // Rate limiting
    RATE_LIMIT_DELAY: 1000, // 1 second between requests
    
    // Analytics thresholds (in milliseconds)
    LATENCY_THRESHOLDS: {
        EXCELLENT: 1000,
        GOOD: 2000,
        ACCEPTABLE: 5000,
        SLOW: 10000
    }
};