# Gemini AI Provider Configuration

This document explains the Gemini AI integration in QoderResume.

## Configuration

### API Key Setup

Your Gemini API key has been configured in the `.env` file:

```bash
GEMINI_API_KEY=AIzaSyCAIcotfCIXYO1pOs44yxjJd6KaTw2aOUQ
```

### Provider Details

- **Model**: `gemini-1.5-pro` (stable and reliable)
- **Priority**: 1 (Primary AI provider)
- **Cost**: ~$0.000125 per 1K tokens
- **Features**: Resume analysis, job description matching, improvement suggestions

## API Capabilities

### 1. Resume Analysis

```typescript
const analysis = await geminiProvider.analyze(resumeText);
```

Provides:

- ATS compatibility score (0-100)
- Skill extraction with confidence levels
- Personal information extraction
- Work experience parsing
- Education background analysis
- Actionable improvement suggestions

### 2. Job Description Matching

```typescript
const match = await geminiProvider.matchJobDescription(
  resumeText,
  jobDescription
);
```

Provides:

- Match percentage
- Skill alignment analysis
- Missing skills identification
- Keyword optimization suggestions

### 3. Improvement Suggestions

```typescript
const suggestions = await geminiProvider.generateSuggestions(
  resumeText,
  jobDescription
);
```

Provides:

- 5-8 specific, actionable improvements
- ATS optimization tips
- Keyword recommendations
- Formatting suggestions

## Integration Points

### Backend (NestJS)

- **Location**: `src/backend/modules/ai/providers/gemini.provider.ts`
- **Module**: AIModule
- **Dependencies**: `@google/generative-ai`

### Configuration

- **Environment**: Reads `GEMINI_API_KEY` from ConfigService
- **Health Check**: Automatically sets `isHealthy` status
- **Error Handling**: Graceful fallback to secondary providers

## API Endpoints

The Gemini provider is used by the following API endpoints:

1. **POST /api/resume-analysis/analyze**
   - Analyzes uploaded resume
   - Returns comprehensive analysis

2. **POST /api/jd-matching/match**
   - Matches resume against job description
   - Returns compatibility score

3. **POST /api/resume-analysis/suggestions**
   - Generates improvement suggestions
   - Optionally uses job description for targeting

## Testing

A test script has been created at `test-gemini.ts` to verify API connectivity:

```bash
# Run the test (if needed for debugging)
npx ts-node test-gemini.ts
```

## Error Handling

The provider includes comprehensive error handling:

- **API Key Missing**: Logs warning, sets unhealthy status
- **Network Errors**: Retries with exponential backoff
- **Rate Limits**: Automatic fallback to secondary providers
- **Invalid Responses**: Parsing error recovery

## Security

- ✅ API key stored in environment variables
- ✅ `.env` file is git-ignored
- ✅ No API key exposure in client-side code
- ✅ Secure logging (no sensitive data in logs)

## Performance

- **Caching**: AI responses cached in Redis (24h TTL)
- **Timeouts**: 30-second timeout per request
- **Retries**: 3 automatic retries on failure
- **Fallback**: OpenAI and Claude as backup providers

## Usage Examples

### Basic Resume Analysis

```typescript
const resumeText = "Software Engineer with 5 years experience...";
const analysis = await aiProviderService.analyzeResume({
  content: resumeText,
  fileName: "resume.pdf",
});

console.log(`ATS Score: ${analysis.atsScore}`);
console.log(`Skills Found: ${analysis.skills.length}`);
```

### Job-Targeted Analysis

```typescript
const jobDescription = "Looking for React developer...";
const suggestions = await aiProviderService.generateSuggestions(
  resumeText,
  jobDescription
);

suggestions.forEach((suggestion) => {
  console.log(`💡 ${suggestion}`);
});
```

## Monitoring

The provider logs important events:

- Initialization success/failure
- API call duration
- Error conditions
- Health status changes

Check application logs for Gemini-related activity:

```bash
# Look for Gemini provider logs
grep "GeminiProvider" logs/application.log
```

## Troubleshooting

### Common Issues

1. **"Gemini API key not configured"**
   - Verify `GEMINI_API_KEY` in `.env` file
   - Restart the application

2. **"Failed to initialize Gemini provider"**
   - Check API key validity
   - Verify network connectivity
   - Check Google AI Studio quota

3. **"Gemini analysis failed"**
   - Check API quotas and billing
   - Verify model availability
   - Check for service outages

### Health Check

```bash
curl http://localhost:3001/api/ai/health
```

Should return provider status including Gemini health.

## Next Steps

1. **Test the integration**: Run the application and try uploading a resume
2. **Monitor usage**: Check API usage in Google AI Studio
3. **Set up monitoring**: Configure alerts for API failures
4. **Optimize prompts**: Adjust prompts based on analysis quality

The Gemini API is now fully integrated and ready to provide AI-powered resume analysis!
