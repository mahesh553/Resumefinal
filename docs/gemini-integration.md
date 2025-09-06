# Gemini AI Integration Documentation

## Overview

The QoderResume application now includes Google Gemini AI integration for advanced resume analysis, job description matching, and content generation capabilities.

## Configuration

### API Key Setup

1. **Environment Variable**: Add your Gemini API key to the `.env` file:

   ```bash
   GEMINI_API_KEY=AIzaSyCAIcotfCIXYO1pOs44yxjJd6KaTw2aOUQ
   ```

2. **Model Configuration**: The system uses the latest `gemini-2.0-flash` model for optimal performance.

## Features

### 1. Resume Analysis

- **ATS Score Calculation**: Evaluates resume compatibility with Applicant Tracking Systems
- **Skill Extraction**: Identifies technical and soft skills with confidence levels
- **Experience Parsing**: Extracts work experience with achievements and responsibilities
- **Education Analysis**: Parses educational background and qualifications
- **Contact Information**: Extracts personal and professional contact details

### 2. Job Description Matching

- **Compatibility Scoring**: Calculates overall match percentage between resume and job requirements
- **Skill Gap Analysis**: Identifies missing skills and areas for improvement
- **Strength Assessment**: Highlights areas where the resume strongly matches job requirements
- **Improvement Recommendations**: Provides actionable suggestions for better alignment

### 3. Content Generation

- **Resume Suggestions**: Generates specific recommendations for resume improvement
- **Keyword Optimization**: Suggests relevant keywords for better ATS performance
- **Achievement Enhancement**: Recommends ways to better present accomplishments

## API Usage Examples

### Basic Analysis

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
  -H 'Content-Type: application/json' \
  -H 'X-goog-api-key: AIzaSyCAIcotfCIXYO1pOs44yxjJd6KaTw2aOUQ' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'
```

### Application Integration

The Gemini provider is automatically initialized and available through the AI service layer:

```typescript
// Resume analysis
const analysis = await aiProviderService.analyzeResume({
  content: resumeText,
  fileName: "resume.pdf",
  provider: "gemini",
});

// Job matching
const matchResult = await aiProviderService.matchJobDescription(
  resumeText,
  jobDescription
);

// Generate suggestions
const suggestions = await aiProviderService.generateSuggestions(
  resumeText,
  jobDescription
);
```

## Architecture

### Provider Implementation

- **Primary Provider**: Gemini has the highest priority (priority: 1) among AI providers
- **Fallback System**: Automatic fallback to OpenAI or Claude if Gemini fails
- **Health Monitoring**: Continuous health checks and automatic recovery
- **Cost Tracking**: Token usage and cost monitoring for optimization

### Caching Strategy

- **Redis Integration**: Intelligent caching of analysis results
- **TTL Configuration**: 24-hour cache duration by default
- **Cache Keys**: SHA256-hashed keys for secure and efficient storage

### Error Handling

- **Graceful Degradation**: Automatic provider switching on failures
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Logging**: Comprehensive error logging and monitoring

## Performance Metrics

- **Model**: `gemini-2.0-flash` (latest Google AI model)
- **Cost**: $0.000125 per 1K tokens
- **Priority**: 1 (highest among providers)
- **Response Time**: Typically 2-5 seconds for resume analysis
- **Accuracy**: High-quality analysis with confidence scoring

## Configuration Options

### Environment Variables

```bash
# Primary configuration
GEMINI_API_KEY=your_api_key_here

# AI system configuration
AI_CACHE_ENABLED=true
AI_CACHE_TTL=86400
AI_PROVIDER_TIMEOUT=30000
AI_MAX_RETRIES=3
```

### Model Selection

The system automatically uses the best available model:

1. `gemini-2.0-flash` (primary)
2. `gemini-1.5-pro` (fallback)
3. `gemini-pro` (legacy fallback)

## Testing

### Quick Test

Run the included test script to verify integration:

```bash
node test-gemini.js
```

Expected output:

```
🔑 API Key found: AIzaSyCAIc...
📝 Testing Gemini API with simple prompt...
✅ Gemini API Response:
AI learns patterns from data to make predictions or decisions.

🎉 Gemini API integration is working successfully!
```

### Unit Tests

Comprehensive test suite available in:

- `src/backend/__tests__/ai-provider.service.spec.ts`
- Coverage for all AI provider functionality

## Security Considerations

1. **API Key Protection**: Store in environment variables, never commit to version control
2. **Rate Limiting**: Built-in request throttling and retry logic
3. **Data Privacy**: No data retention on Google's servers for API usage
4. **SSL/TLS**: All communications encrypted with HTTPS

## Monitoring and Analytics

### Usage Tracking

- Token consumption monitoring
- Cost analysis by provider and operation
- Performance metrics and response times
- Error rate tracking and alerting

### Health Checks

- Automatic provider health monitoring
- Real-time status reporting
- Automatic failover and recovery

## Support and Troubleshooting

### Common Issues

1. **API Key Invalid**: Verify key is correctly set in `.env` file
2. **Model Not Available**: System automatically falls back to supported models
3. **Rate Limiting**: Built-in retry logic handles temporary rate limits
4. **Network Issues**: Automatic failover to alternative providers

### Debug Mode

Enable debug logging:

```bash
ENABLE_DEBUG_LOGGING=true
LOG_LEVEL=debug
```

---

## Integration Status: ✅ Complete

- ✅ API Key configured
- ✅ Provider initialized
- ✅ Model updated to `gemini-2.0-flash`
- ✅ Health checks passing
- ✅ Test verification successful
- ✅ Documentation complete
