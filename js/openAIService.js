class OpenAIService {
    constructor() {
        this.analyticsService = new AnalyticsService();
    }

    async generateContent(apiKey, model, persona, contentType, topic, maxLength, temperature) {
        const callId = this.analyticsService.startCall(persona, contentType, topic);
        
        try {
            const systemPrompt = PersonaPrompts.buildSystemPrompt(persona, contentType, maxLength);
            const userPrompt = PersonaPrompts.buildUserPrompt(topic, contentType);
            
            this.analyticsService.recordPrompt(callId, {
                system: systemPrompt,
                user: userPrompt
            });

            const startTime = performance.now();
            
            const response = await this.makeOpenAIRequest(apiKey, model, systemPrompt, userPrompt, temperature, maxLength);
            
            const endTime = performance.now();
            const latency = endTime - startTime;

            const result = {
                success: true,
                content: response.choices[0].message.content,
                usage: response.usage,
                latency: latency,
                response: response,
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens
            };

            this.analyticsService.endCall(callId, result);
            
            return {
                success: true,
                persona: persona,
                contentType: contentType,
                content: response.choices[0].message.content,
                analytics: this.analyticsService.getCallAnalytics(callId),
                usage: response.usage,
                latency: latency
            };

        } catch (error) {
            console.error('OpenAI API Error:', error);
            
            const result = {
                success: false,
                error: error.message
            };

            this.analyticsService.endCall(callId, result);
            
            return {
                success: false,
                persona: persona,
                contentType: contentType,
                error: error.message,
                analytics: this.analyticsService.getCallAnalytics(callId)
            };
        }
    }

    async makeOpenAIRequest(apiKey, model, systemPrompt, userPrompt, temperature, maxLength) {
        const maxTokens = Math.min(Math.floor(maxLength * 0.75), AppConfig.DEFAULT_MAX_TOKENS);
        
        const requestBody = {
            model: model,
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            temperature: temperature,
            max_tokens: maxTokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AppConfig.REQUEST_TIMEOUT);

        try {
            const response = await fetch(AppConfig.OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - took longer than 30 seconds');
            }
            throw error;
        }
    }

    getAnalyticsService() {
        return this.analyticsService;
    }

    async generateMultipleContents(apiKey, model, personas, contentType, topic, maxLength, temperature) {
        const results = [];
        
        for (const persona of personas) {
            // Add delay between requests to avoid rate limiting
            if (results.length > 0) {
                await new Promise(resolve => setTimeout(resolve, AppConfig.RATE_LIMIT_DELAY));
            }
            
            const result = await this.generateContent(apiKey, model, persona, contentType, topic, maxLength, temperature);
            results.push(result);
        }
        
        return results;
    }
}