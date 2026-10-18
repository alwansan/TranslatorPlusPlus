# Summary Generator Feature - Implementation Documentation

## Overview
This feature implements an automatic conversation summarization system to reduce token usage and API costs when interacting with AI services. The system intelligently condenses older messages into summaries while maintaining full conversation history in the UI.

## Key Features

### 1. **Automatic Summary Generation**
- Monitors the conversation for a configurable number of assistant responses
- When threshold is reached, generates a concise summary of older messages
- Replaces consumed messages with a summary system message
- Summary is sent to the API instead of full message history

### 2. **User Interface Remains Full**
- All original messages are always displayed in the UI
- Users see the complete, unsummarized conversation
- Only the API payload is optimized with summaries

### 3. **Configurable Settings**
Located in **Settings Modal > Advanced Settings** (collapsible section):

- **Enable Summary** (Toggle): Turn the summary system on/off
- **Generate summary every X assistant messages** (Default: 16): How often to create summaries
- **Number of messages to consume** (Default: 8): How many message pairs to include in each summary
- **Current Summary** (Read-only): Displays the auto-generated summary

## How It Works

### Summary Lifecycle

1. **Monitoring**: After each successful assistant response, `checkAndGenerateSummary()` is called
2. **Threshold Check**: Counts assistant messages since last summary
3. **Summary Generation**: When threshold is reached:
   - Selects messages to summarize (based on `summaryConsumeCount`)
   - Sends them to AI with a summarization prompt
   - Receives condensed summary
4. **Message Replacement**: 
   - Removes consumed messages from the array
   - Inserts new summary system message at the beginning
   - Summary message is marked with `isSummary: true` flag
5. **API Optimization**: `getMessagesForAPI()` filters out consumed messages, sends only summary + recent messages

### Visual Indicators

Summary messages have distinct styling:
- **Greenish background** (`#2d4a3e`)
- **Green left border** accent (`#4caf50`)
- **Label**: "Summary" instead of "System"
- Cannot be edited or role-changed (protected)

## Configuration

### Default Settings
```javascript
enableSummary: false           // Disabled by default
summaryTriggerCount: 16       // Generate after 16 assistant messages
summaryConsumeCount: 8        // Consume 8 message pairs per summary
previousSummary: ""           // Auto-populated
```

### Recommended Usage

**For Light Usage** (occasional questions):
- Keep disabled or use high trigger count (20-30)

**For Long Conversations** (extended sessions):
- Enable with trigger count 10-16
- Consume count 6-10 messages

**For Cost-Sensitive Deployments**:
- Enable with trigger count 8-12
- Consume count 8-12 messages

## Technical Implementation

### Key Methods

#### `checkAndGenerateSummary()`
- Main summary orchestration logic
- Checks if summary should be generated
- Calls AI to create summary
- Updates message array and settings

#### `getMessagesForAPI()`
- Filters messages for API requests
- Returns full history if summary disabled
- Returns summary + recent messages if enabled

#### `createMessageHTML(message)`
- Enhanced to render summary messages with special styling
- Displays "Summary" label for summary messages
- Prevents editing of summary messages

### Data Flow

```
User sends message
    ↓
Assistant responds
    ↓
checkAndGenerateSummary() called
    ↓
If threshold reached:
    - Extract messages to summarize
    - Call AI with summarization prompt
    - Receive summary
    - Remove old messages
    - Insert summary message (isSummary: true)
    ↓
Next API call uses getMessagesForAPI()
    - Skips messages before summary
    - Includes summary + recent messages
```

## Storage

- Summary settings are persisted in `localStorage` under key `settings`
- Each chat maintains its own message array (including summary messages)
- Summary messages are saved/loaded like other messages (with `isSummary` flag)

## Benefits

1. **Cost Reduction**: Significantly reduces tokens sent to API
2. **Performance**: Faster API responses with smaller payloads
3. **Context Retention**: Important information preserved in summaries
4. **User Experience**: Full conversation always visible in UI
5. **Flexibility**: Fully configurable per user preferences

## Future Enhancements

Potential improvements:
- Manual summary generation button
- Summary preview before applying
- Multiple summary strategies (aggressive, moderate, conservative)
- Summary quality metrics
- Export summaries separately

## Troubleshooting

**Summary not generating?**
- Check if "Enable Summary" is toggled on
- Verify you've reached the trigger count
- Check browser console for errors

**Too many summaries?**
- Increase `summaryTriggerCount` value
- Decrease `summaryConsumeCount` value

**Summary quality issues?**
- Summary quality depends on the AI model used
- Better models (GPT-4, Claude) produce better summaries
- Adjust system message for summarization in code if needed
