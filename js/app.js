class OpenAIPersonaGeneratorApp {
    constructor() {
        this.textGenerator = new TextGenerator();
        this.initializeEventListeners();
        this.loadSavedConfig();
    }

    initializeEventListeners() {
        const generateBtn = document.getElementById('generateBtn');
        const copyAllBtn = document.getElementById('copyAllBtn');
        const exportBtn = document.getElementById('exportBtn');
        const temperatureSlider = document.getElementById('temperature');
        const temperatureValue = document.getElementById('temperatureValue');
        
        generateBtn.addEventListener('click', () => this.generateTexts());
        copyAllBtn.addEventListener('click', () => this.copyAllResults());
        exportBtn.addEventListener('click', () => this.exportAnalytics());
        
        temperatureSlider.addEventListener('input', (e) => {
            temperatureValue.textContent = e.target.value;
        });

        // Save API key when changed
        document.getElementById('apiKey').addEventListener('input', (e) => {
            this.saveConfig();
        });
    }

    loadSavedConfig() {
        const savedApiKey = localStorage.getItem('openai_api_key');
        const savedModel = localStorage.getItem('openai_model') || AppConfig.DEFAULT_MODEL;
        
        if (savedApiKey) {
            document.getElementById('apiKey').value = savedApiKey;
        }
        
        document.getElementById('model').value = savedModel;
    }

    saveConfig() {
        const apiKey = document.getElementById('apiKey').value;
        const model = document.getElementById('model').value;
        
        if (apiKey) {
            localStorage.setItem('openai_api_key', apiKey);
        }
        localStorage.setItem('openai_model', model);
    }

    async generateTexts() {
        const apiKey = document.getElementById('apiKey').value.trim();
        const model = document.getElementById('model').value;
        const topic = document.getElementById('topic').value.trim();
        const contentType = document.getElementById('contentType').value;
        const maxLength = parseInt(document.getElementById('maxLength').value);
        //const max_completion_tokens=parseInt(document.getElementById('maxLength').value);
        const temperature = parseFloat(document.getElementById('temperature').value);
        const selectedPersonas = this.getSelectedPersonas();

        // Validate inputs
        if (!apiKey) {
            this.showError('Please enter your OpenAI API key');
            return;
        }

        if (!topic) {
            this.showError('Please enter a topic');
            return;
        }

        if (selectedPersonas.length === 0) {
            this.showError('Please select at least one persona');
            return;
        }

        this.saveConfig();
        this.setLoadingState(true);

        try {
            const result = await this.textGenerator.generateTexts(
                apiKey, model, selectedPersonas, contentType, topic, maxLength, temperature
            );

            if (result.success) {
                this.displayResults(result.results, result.sessionAnalytics);
            } else {
                this.showError(result.error);
            }

        } catch (error) {
            this.showError('An unexpected error occurred: ' + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    getSelectedPersonas() {
        const checkboxes = document.querySelectorAll('.persona-checkboxes input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    setLoadingState(loading) {
        const generateBtn = document.getElementById('generateBtn');
        const btnText = generateBtn.querySelector('.btn-text');
        const btnLoading = generateBtn.querySelector('.btn-loading');
        
        if (loading) {
            generateBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            generateBtn.disabled = false;
            btnText.style.display = 'flex';
            btnLoading.style.display = 'none';
        }
    }

    displayResults(results, sessionAnalytics) {
        const resultsContainer = document.getElementById('resultsContainer');
        const analyticsSummary = document.getElementById('analyticsSummary');
        const analyticsSection = document.getElementById('analyticsSection');
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results">No results generated. Please try again.</p>';
            return;
        }

        // Display analytics summary
        this.displayAnalyticsSummary(sessionAnalytics);
        analyticsSummary.style.display = 'block';
        
        // Display results
        resultsContainer.innerHTML = results.map(result => this.createResultHTML(result)).join('');
        
        // Display detailed analytics
        this.displayDetailedAnalytics(results);
        analyticsSection.style.display = 'block';
    }

    createResultHTML(result) {
        const personaDef = PersonaPrompts.getPersonaDefinitions()[result.persona];
        const isSuccess = result.success;
        
        return `
            <div class="persona-result" data-persona="${result.persona}">
                <div class="persona-header">
                    <div class="persona-title">
                        ${personaDef.name}
                        ${isSuccess ? '✅' : '❌'}
                    </div>
                    <div class="persona-actions">
                        ${isSuccess ? `
                            <button class="copy-persona-btn" onclick="app.copyPersonaText('${result.persona}')">
                                Copy
                            </button>
                            <button class="view-analytics-btn" onclick="app.showCallAnalytics('${result.analytics.id}')">
                                Analytics
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${isSuccess ? `
                    <div class="generated-text">${result.content}</div>
                    <div class="analytics-info">
                        <div class="metric">
                            <span class="label">Latency:</span>
                            <span class="value">${this.textGenerator.getAnalytics().formatLatency(result.latency)}</span>
                        </div>
                        <div class="metric">
                            <span class="label">Tokens:</span>
                            <span class="value">${result.usage.prompt_tokens} prompt + ${result.usage.completion_tokens} completion = ${result.usage.total_tokens} total</span>
                        </div>
                        <div class="metric">
                            <span class="label">Performance:</span>
                            <span class="value">${this.textGenerator.getAnalytics().getPerformanceRating(result.latency)}</span>
                        </div>
                    </div>
                ` : `
                    <div class="error-message" style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 5px;">
                        <strong>Error:</strong> ${result.error}
                    </div>
                `}
            </div>
        `;
    }

    displayAnalyticsSummary(sessionAnalytics) {
        const analyticsSummary = document.getElementById('analyticsSummary');
        const avgLatency = sessionAnalytics.averageLatency;
        
        analyticsSummary.innerHTML = `
            <h3>📊 Session Analytics Summary</h3>
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h4>Total Calls</h4>
                    <div class="value">${sessionAnalytics.totalCalls}</div>
                </div>
                <div class="analytics-card">
                    <h4>Success Rate</h4>
                    <div class="value">${sessionAnalytics.successRate}%</div>
                </div>
                <div class="analytics-card">
                    <h4>Avg Latency</h4>
                    <div class="value">${this.textGenerator.getAnalytics().formatLatency(avgLatency)}</div>
                    <div class="unit">${this.textGenerator.getAnalytics().getPerformanceRating(avgLatency)}</div>
                </div>
                <div class="analytics-card">
                    <h4>Total Tokens</h4>
                    <div class="value">${sessionAnalytics.totalTokens}</div>
                </div>
            </div>
        `;
    }

    displayDetailedAnalytics(results) {
        const analyticsDetails = document.getElementById('analyticsDetails');
        
        analyticsDetails.innerHTML = results.map(result => {
            if (!result.success) return '';
            
            const analytics = result.analytics;
            return `
                <div class="api-call-detail">
                    <div class="api-call-header">
                        <h4>${PersonaPrompts.getPersonaDefinitions()[result.persona].name}</h4>
                        <span class="status-badge ${analytics.status}">${analytics.status.toUpperCase()}</span>
                    </div>
                    
                    <div class="api-call-metrics">
                        <div class="metric-box">
                            <div class="metric-value">${this.textGenerator.getAnalytics().formatLatency(analytics.latency)}</div>
                            <div class="metric-label">Latency</div>
                        </div>
                        <div class="metric-box">
                            <div class="metric-value">${analytics.promptTokens}</div>
                            <div class="metric-label">Prompt Tokens</div>
                        </div>
                        <div class="metric-box">
                            <div class="metric-value">${analytics.completionTokens}</div>
                            <div class="metric-label">Completion Tokens</div>
                        </div>
                        <div class="metric-box">
                            <div class="metric-value">${this.textGenerator.getAnalytics().getPerformanceRating(analytics.latency)}</div>
                            <div class="metric-label">Performance</div>
                        </div>
                    </div>
                    
                    <div class="prompt-preview">
                        <h4>System Prompt</h4>
                        <div class="prompt-content">${analytics.prompt.system}</div>
                    </div>
                    
                    <div class="prompt-preview">
                        <h4>User Prompt</h4>
                        <div class="prompt-content">${analytics.prompt.user}</div>
                    </div>
                    
                    <div class="response-preview">
                        <h4>AI Response</h4>
                        <div class="response-content">${result.content}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showCallAnalytics(callId) {
        const analytics = this.textGenerator.getAnalytics().getCallAnalytics(callId);
        if (analytics) {
            alert(`Detailed Analytics for ${callId}:\n\n` +
                  `Latency: ${this.textGenerator.getAnalytics().formatLatency(analytics.latency)}\n` +
                  `Prompt Tokens: ${analytics.promptTokens}\n` +
                  `Completion Tokens: ${analytics.completionTokens}\n` +
                  `Status: ${analytics.status}\n` +
                  `Timestamp: ${analytics.timestamp}`);
        }
    }

    copyPersonaText(persona) {
        const personaElement = document.querySelector(`.persona-result[data-persona="${persona}"]`);
        const text = personaElement.querySelector('.generated-text').textContent;
        
        this.copyToClipboard(text);
        this.showFeedback('Persona text copied to clipboard!');
    }

    async copyAllResults() {
        const allTexts = Array.from(document.querySelectorAll('.generated-text'))
            .map(el => {
                const persona = el.closest('.persona-result').dataset.persona;
                const personaName = PersonaPrompts.getPersonaDefinitions()[persona].name;
                return `${personaName}:\n${el.textContent}\n${'='.repeat(50)}\n`;
            })
            .join('\n');
        
        await this.copyToClipboard(allTexts);
        this.showFeedback('All persona texts copied to clipboard!');
    }

    async exportAnalytics() {
        const analyticsData = this.textGenerator.getAnalytics().exportAnalytics();
        const blob = new Blob([analyticsData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `openai-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showFeedback('Analytics data exported!');
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    showFeedback(message) {
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 3000);
    }

    showError(message) {
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 5000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OpenAIPersonaGeneratorApp();
});