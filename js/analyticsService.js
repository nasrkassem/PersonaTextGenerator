class AnalyticsService {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.analyticsData = {
            sessionStart: new Date(),
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalTokens: 0,
            totalLatency: 0,
            calls: []
        };
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    startCall(persona, contentType, topic) {
        const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        const callData = {
            id: callId,
            persona,
            contentType,
            topic,
            startTime: performance.now(),
            timestamp: new Date(),
            status: 'started'
        };

        this.analyticsData.calls.push(callData);
        this.analyticsData.totalCalls++;
        
        return callId;
    }

    endCall(callId, result) {
        const call = this.analyticsData.calls.find(c => c.id === callId);
        if (!call) return;

        const endTime = performance.now();
        call.endTime = endTime;
        call.latency = endTime - call.startTime;
        call.status = result.success ? 'success' : 'error';
        
        if (result.success) {
            this.analyticsData.successfulCalls++;
            this.analyticsData.totalLatency += call.latency;
            
            if (result.usage) {
                call.usage = result.usage;
                this.analyticsData.totalTokens += result.usage.total_tokens;
            }
            
            if (result.response) {
                call.response = result.response;
            }
        } else {
            this.analyticsData.failedCalls++;
            call.error = result.error;
        }

        call.promptTokens = result.promptTokens || 0;
        call.completionTokens = result.completionTokens || 0;
    }

    recordPrompt(callId, prompt) {
        const call = this.analyticsData.calls.find(c => c.id === callId);
        if (call) {
            call.prompt = prompt;
        }
    }

    getCallAnalytics(callId) {
        return this.analyticsData.calls.find(c => c.id === callId);
    }

    getSessionAnalytics() {
        const avgLatency = this.analyticsData.successfulCalls > 0 
            ? this.analyticsData.totalLatency / this.analyticsData.successfulCalls 
            : 0;

        const successRate = this.analyticsData.totalCalls > 0
            ? (this.analyticsData.successfulCalls / this.analyticsData.totalCalls) * 100
            : 0;

        return {
            sessionId: this.sessionId,
            sessionStart: this.analyticsData.sessionStart,
            totalCalls: this.analyticsData.totalCalls,
            successfulCalls: this.analyticsData.successfulCalls,
            failedCalls: this.analyticsData.failedCalls,
            successRate: Math.round(successRate),
            averageLatency: Math.round(avgLatency),
            totalTokens: this.analyticsData.totalTokens,
            calls: this.analyticsData.calls
        };
    }

    getPerformanceRating(latency) {
        if (latency < AppConfig.LATENCY_THRESHOLDS.EXCELLENT) return 'Excellent 🚀';
        if (latency < AppConfig.LATENCY_THRESHOLDS.GOOD) return 'Good 👍';
        if (latency < AppConfig.LATENCY_THRESHOLDS.ACCEPTABLE) return 'Acceptable ⚡';
        if (latency < AppConfig.LATENCY_THRESHOLDS.SLOW) return 'Slow 🐢';
        return 'Very Slow 🚨';
    }

    formatLatency(latency) {
        if (latency < 1000) {
            return `${Math.round(latency)}ms`;
        } else {
            return `${(latency / 1000).toFixed(2)}s`;
        }
    }

    exportAnalytics() {
        return JSON.stringify(this.getSessionAnalytics(), null, 2);
    }

    resetSession() {
        this.sessionId = this.generateSessionId();
        this.analyticsData = {
            sessionStart: new Date(),
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalTokens: 0,
            totalLatency: 0,
            calls: []
        };
    }
}