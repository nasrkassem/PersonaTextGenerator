class TextGenerator {
    constructor() {
        this.openAIService = new OpenAIService();
    }

    async generateTexts(apiKey, model, personas, contentType, topic, maxLength, temperature) {
        if (!apiKey) {
            throw new Error('OpenAI API key is required');
        }

        if (!topic.trim()) {
            throw new Error('Topic is required');
        }

        if (personas.length === 0) {
            throw new Error('At least one persona must be selected');
        }

        try {
            const results = await this.openAIService.generateMultipleContents(
                apiKey, model, personas, contentType, topic, maxLength, temperature
            );

            return {
                success: true,
                results: results,
                sessionAnalytics: this.openAIService.getAnalyticsService().getSessionAnalytics()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    getAnalytics() {
        return this.openAIService.getAnalyticsService();
    }
}