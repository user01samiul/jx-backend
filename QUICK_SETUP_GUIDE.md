# Quick Setup Guide - Cloudflare Rate Limiting Solution

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables (Optional)

Create a `.env` file or set environment variables:

```bash
# Rate limiting configuration
CF_RATE_LIMIT_MAX=100
CF_CIRCUIT_BREAKER_THRESHOLD=5

# Disable cron jobs if needed
DISABLE_CRON_JOBS=false
```

### 3. Start the Server

```bash
npm start
# or
node index.ts
```

### 4. Test the Solution

```bash
# Run the test script
node test-cloudflare-solution.js

# Or test specific endpoints
curl http://localhost:3000/health
curl http://localhost:3000/health/detailed
curl http://localhost:3000/health/cloudflare
```

## 📊 Monitoring Endpoints

Once the server is running, you can monitor the system:

- **Basic Health**: `GET /health`
- **Detailed Metrics**: `GET /health/detailed`
- **Cloudflare Metrics**: `GET /health/cloudflare`

## 🔧 Configuration

### Rate Limiting Tiers

| Tier | Window | Max Requests | Use Case |
|------|--------|--------------|----------|
| Standard | 15 minutes | 100 | General API endpoints |
| Strict | 1 minute | 30 | Sensitive operations |
| Provider | 1 minute | 1000 | Provider callbacks |
| Auth | 15 minutes | 5 | Authentication endpoints |

### Circuit Breaker

- **Threshold**: 5 consecutive failures
- **Timeout**: 30 seconds
- **Auto-reset**: After timeout period

## 🧪 Testing

### Manual Testing

```bash
# Test rate limiting
for i in {1..150}; do curl http://localhost:3000/health; done

# Test circuit breaker (trigger errors)
for i in {1..10}; do curl http://localhost:3000/nonexistent; done
```

### Load Testing

```bash
# Run comprehensive load test
node test-cloudflare-solution.js

# Custom test
API_URL=http://your-api.com node test-cloudflare-solution.js
```

## 📈 Expected Results

### Healthy System
- Success rate: >95%
- Rate limit rate: <5%
- Circuit breaker: CLOSED
- Response time: <500ms

### Under Load
- Some requests will be rate limited (429)
- Circuit breaker may open temporarily
- System should recover automatically

## 🚨 Troubleshooting

### Common Issues

1. **Server won't start**
   ```bash
   # Check dependencies
   npm install
   
   # Check port availability
   lsof -i :3000
   ```

2. **Rate limiting not working**
   ```bash
   # Check logs
   tail -f access.log
   
   # Verify middleware is loaded
   curl http://localhost:3000/health/detailed
   ```

3. **High error rates**
   ```bash
   # Check system health
   curl http://localhost:3000/health
   
   # Monitor in real-time
   watch -n 5 'curl -s http://localhost:3000/health/cloudflare | jq'
   ```

### Debug Commands

```bash
# Check if server is running
curl http://localhost:3000/health

# Monitor system metrics
watch -n 10 'curl -s http://localhost:3000/health/detailed | jq'

# Test rate limiting
ab -n 200 -c 10 http://localhost:3000/health

# Check Cloudflare headers
curl -H "CF-Connecting-IP: 1.2.3.4" http://localhost:3000/health
```

## 🔄 Production Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Set Production Environment Variables

```bash
export NODE_ENV=production
export CF_RATE_LIMIT_MAX=200
export CF_CIRCUIT_BREAKER_THRESHOLD=10
```

### 3. Start with PM2 (Recommended)

```bash
npm install -g pm2
pm2 start index.js --name "jackpotx-api"
pm2 save
pm2 startup
```

### 4. Monitor in Production

```bash
# Check PM2 status
pm2 status

# Monitor logs
pm2 logs jackpotx-api

# Check health
curl https://your-api.com/health
```

## 📋 Checklist

- [ ] Dependencies installed
- [ ] Server starts without errors
- [ ] Health endpoints respond
- [ ] Rate limiting works (test with multiple requests)
- [ ] Circuit breaker responds to errors
- [ ] Monitoring shows correct metrics
- [ ] Production environment variables set
- [ ] Load testing completed
- [ ] Cloudflare configuration verified

## 🎯 Success Indicators

✅ Server responds to health checks  
✅ Rate limiting triggers on high load  
✅ Circuit breaker opens/closes appropriately  
✅ Error rates stay below 5%  
✅ Response times remain under 1 second  
✅ Cloudflare requests are properly tracked  

## 📞 Support

If you encounter issues:

1. Check the logs: `tail -f access.log`
2. Monitor health: `curl http://localhost:3000/health/detailed`
3. Review the full documentation: `CLOUDFLARE_RATE_LIMITING_SOLUTION.md`
4. Run the test script: `node test-cloudflare-solution.js`

The solution is designed to be self-healing and should handle most Cloudflare rate limiting issues automatically. 