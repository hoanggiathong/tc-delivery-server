# Logging System Documentation

This document describes the logging system implementation in the TC Delivery Server project.

## Overview

The logging system uses Winston with daily rotating files to provide comprehensive logging capabilities with automatic file rotation and organization.

## Features

### 1. Quote Removal
The logging system automatically removes surrounding quotes from log messages while preserving JSON strings and quotes within the message content.

**Example:**
```javascript
// Input
logger.info('"This is a quoted message"');
logger.info('{"name": "John", "status": "active"}');

// Output
2024-01-15 10:30:45:123 info: This is a quoted message
2024-01-15 10:30:45:124 info: {"name": "John", "status": "active"}
```

### 2. Organized File Structure
Log files are organized in a hierarchical folder structure by year and month:

```
logs/
├── 2024/
│   ├── 01/                    # January 2024
│   │   ├── 01.log            # January 1st - All logs
│   │   ├── 02.log            # January 2nd - All logs
│   │   ├── error-01.log      # January 1st - Error logs only
│   │   ├── error-02.log      # January 2nd - Error logs only
│   │   ├── exceptions-01.log # January 1st - Uncaught exceptions
│   │   └── rejections-01.log # January 1st - Unhandled promise rejections
│   ├── 02/                    # February 2024
│   │   ├── 01.log
│   │   ├── 02.log
│   │   └── ...
│   └── ...
├── 2025/
│   └── ...
├── current.log               # Symlink to current day's log
├── current-error.log         # Symlink to current day's error log
├── current-exceptions.log    # Symlink to current day's exceptions log
└── current-rejections.log    # Symlink to current day's rejections log
```

### 3. Daily Rotation
- **Pattern**: Files rotate daily (DD format)
- **Compression**: Old files are automatically compressed (.gz)
- **Retention**:
  - Regular logs: 14 days
  - Error logs: 30 days
  - Exception/Rejection logs: 30 days
- **Size limit**: 20MB per file (rotates when exceeded)

### 4. Multiple Log Types
- **All logs**: Complete application logs
- **Error logs**: Error level logs only
- **Exception logs**: Uncaught exceptions
- **Rejection logs**: Unhandled promise rejections

## Log Levels

The system supports 5 log levels (in order of priority):

| Level | Color   | Description |
|-------|---------|-------------|
| error | red     | Error conditions |
| warn  | yellow  | Warning conditions |
| info  | green   | Informational messages |
| http  | magenta | HTTP request logs |
| debug | white   | Debug information |

### Environment-based Log Level
- **Development**: `debug` (all levels)
- **Production**: `warn` (warn and error only)

## Usage Examples

### Basic Logging
```javascript
import Logger from '../utils/logger';

// Different log levels
Logger.error('Database connection failed');
Logger.warn('Deprecated API endpoint used');
Logger.info('User logged in successfully');
Logger.http('GET /api/users - 200 OK');
Logger.debug('Processing user data: {userId: 123}');
```

### Structured Logging
```javascript
// Log with metadata
Logger.info('User action', {
  userId: 123,
  action: 'create_order',
  timestamp: new Date().toISOString()
});

// Log with error object
try {
  // some operation
} catch (error) {
  Logger.error('Operation failed', { error: error.message, stack: error.stack });
}
```

### JSON Logging
```javascript
// JSON strings are preserved
const userData = JSON.stringify({ name: 'John', email: 'john@example.com' });
Logger.info(`User data: ${userData}`);
// Output: User data: {"name": "John", "email": "john@example.com"}
```

## Configuration

The logger configuration is located in `src/utils/logger.ts`.

### Key Configuration Options
```javascript
// File rotation settings
maxSize: '20m',        // Maximum file size before rotation
maxFiles: '14d',       // Retention period for regular logs
datePattern: 'DD',     // Daily rotation pattern

// Compression
zippedArchive: true,   // Compress old files

// Symlinks
createSymlink: true,   // Create symlinks to current files
symlinkName: 'logs/current.log'
```

## Debugging and Monitoring

### View Current Logs
```bash
# View current day's logs (all levels)
tail -f logs/current.log

# View current day's error logs only
tail -f logs/current-error.log

# View specific date logs
tail -f logs/2024/01/15.log
```

### Search Logs
```bash
# Search for specific patterns
grep "ERROR" logs/2024/01/*.log
grep "user_id.*123" logs/2024/01/*.log

# Search in compressed files
zgrep "ERROR" logs/2024/01/*.log.gz
```

### Log File Analysis
```bash
# Count log entries by level
grep -c "error:" logs/current.log
grep -c "warn:" logs/current.log
grep -c "info:" logs/current.log

# Find logs in date range
find logs/ -name "*.log" -newermt "2024-01-01" -not -newermt "2024-01-31"
```

## Best Practices

### 1. Use Appropriate Log Levels
```javascript
// ✅ Good
Logger.error('Database connection failed', { error: dbError });
Logger.warn('API rate limit approaching', { currentRate: 95 });
Logger.info('User registered successfully', { userId: newUser.id });
Logger.debug('Processing request payload', { payload });

// ❌ Avoid
Logger.error('User clicked button'); // Not an error
Logger.info('Detailed debugging info'); // Use debug level
```

### 2. Include Context
```javascript
// ✅ Good - includes context
Logger.error('Failed to process order', {
  orderId: order.id,
  userId: user.id,
  error: error.message,
  timestamp: new Date().toISOString()
});

// ❌ Less useful - no context
Logger.error('Failed to process order');
```

### 3. Avoid Logging Sensitive Data
```javascript
// ✅ Good - no sensitive data
Logger.info('User authenticated', { userId: user.id });

// ❌ Avoid - contains sensitive data
Logger.info('User authenticated', {
  userId: user.id,
  password: user.password,  // Don't log passwords
  creditCard: user.card     // Don't log financial data
});
```

### 4. Use Structured Logging for Complex Data
```javascript
// ✅ Good - structured
Logger.info('Order processed', {
  orderId: order.id,
  amount: order.total,
  items: order.items.length,
  processingTime: endTime - startTime
});

// ❌ Less structured
Logger.info(`Order ${order.id} processed with ${order.items.length} items`);
```

## Troubleshooting

### Common Issues

1. **Log files not created**
   - Check file permissions in the logs directory
   - Ensure the application has write permissions

2. **Logs not rotating**
   - Verify the datePattern configuration
   - Check if the application is running continuously

3. **Large log files**
   - Adjust maxSize setting
   - Review log retention policies
   - Consider reducing log verbosity in production

4. **Missing logs**
   - Check log level configuration
   - Verify logger import and usage
   - Check for uncaught exceptions stopping the application

### Performance Considerations

- Log rotation happens automatically based on date and size
- Compressed files save disk space
- Symlinks provide easy access to current logs
- File organization by year/month helps with long-term storage management
- Consider log aggregation tools for production environments

## Security Considerations

1. **Log file permissions**: Ensure log files are not publicly readable
2. **Sensitive data**: Never log passwords, tokens, or personal information
3. **Log injection**: Validate and sanitize user input before logging
4. **Storage**: Implement secure log storage and transmission in production
5. **Retention**: Follow data retention policies and regulations