# AWS Deployment Guide

This guide covers deploying the AI Meeting Assistant to AWS using multiple services.

## Architecture Overview

- **Frontend**: AWS Amplify (static hosting)
- **Backend**: AWS EC2 or ECS (Node.js + Python)
- **Ollama**: Self-hosted on EC2 or use external API

## Option 1: Frontend on Amplify + Backend on EC2

### Step 1: Deploy Frontend to AWS Amplify

1. **Push Code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for AWS deployment"
   git push origin main
   ```

2. **Create Amplify App:**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect your GitHub repository
   - Select branch: `main`

3. **Configure Build Settings:**
   - Amplify will detect `amplify.yml` automatically
   - Update the build settings if needed:
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - cd frontend
             - npm ci
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: frontend/dist
         files:
           - '**/*'
       cache:
         paths:
           - frontend/node_modules/**/*
     ```

4. **Add Environment Variables:**
   - In Amplify Console → App settings → Environment variables
   - Add: `VITE_API_URL` = `https://your-backend-domain.com` (EC2 or Load Balancer URL)

5. **Deploy:**
   - Click "Save and deploy"
   - Wait for build to complete
   - Your frontend will be available at: `https://[app-id].amplifyapp.com`

### Step 2: Deploy Backend to AWS EC2

#### 2.1 Launch EC2 Instance

1. **Go to EC2 Console:**
   - Launch new instance
   - Choose: Ubuntu Server 22.04 LTS
   - Instance type: t3.medium or larger (for Ollama)
   - Storage: 30GB minimum
   - Security Group: Allow ports 22 (SSH), 5000 (Backend), 11434 (Ollama)

2. **Connect to Instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-public-ip
   ```

#### 2.2 Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python and pip
sudo apt install -y python3 python3-pip python3-venv ffmpeg

# Install PM2 for process management
sudo npm install -g pm2

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
```

#### 2.3 Clone and Setup Backend

```bash
# Clone repository
git clone https://github.com/ametaankit25-design/AiMeetingAssistant.git
cd AiMeetingAssistant

# Setup backend
cd backend
npm install

# Setup Python environment
cd ..
python3 -m venv venv
source venv/bin/activate
pip install transformers librosa numpy torch

# Pull Ollama model
ollama pull llama3.2
```

#### 2.4 Configure Environment

```bash
cd backend
cp .env.example .env
nano .env
```

Update `.env`:
```env
PORT=5000
HOST=0.0.0.0
NODE_ENV=production
OLLAMA_URL=http://127.0.0.1:11434/api/generate
OLLAMA_MODEL=llama3.2
```

#### 2.5 Start Services with PM2

```bash
# Start Ollama service
pm2 start ollama -- serve
pm2 save
pm2 startup

# Start backend
cd backend
pm2 start server.js --name "ai-meeting-backend"
pm2 save
```

#### 2.6 Configure Nginx Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/ai-meeting-assistant
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        send_timeout 600s;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/ai-meeting-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 2.7 Setup SSL with Let's Encrypt (Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Step 3: Update Frontend Configuration

Update your Amplify environment variables:
- `VITE_API_URL` = `https://your-domain.com` (or EC2 public IP)

Redeploy frontend in Amplify Console.

### Step 4: Test Deployment

1. Visit your Amplify URL
2. Upload an audio file
3. Verify processing works end-to-end

## Option 2: Deploy Backend with Docker on AWS ECS

### 2.1 Build and Push Docker Image

```bash
# Login to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [account-id].dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name ai-meeting-backend --region us-east-1

# Build image
cd backend
docker build -t ai-meeting-backend .

# Tag image
docker tag ai-meeting-backend:latest [account-id].dkr.ecr.us-east-1.amazonaws.com/ai-meeting-backend:latest

# Push image
docker push [account-id].dkr.ecr.us-east-1.amazonaws.com/ai-meeting-backend:latest
```

### 2.2 Create ECS Cluster and Task

1. Go to ECS Console
2. Create cluster (EC2 or Fargate)
3. Create task definition:
   - Container: Your ECR image
   - Port mappings: 5000
   - Memory: 4GB minimum
   - CPU: 2 vCPU minimum
4. Create service
5. Configure Application Load Balancer
6. Update security groups

### 2.3 Note: Ollama with Docker

Ollama requires significant resources. Consider:
- Using a separate EC2 instance for Ollama
- Using Ollama API from external provider
- Running Ollama as a sidecar container

## Security Considerations

1. **API Keys & Secrets:**
   - Store in AWS Secrets Manager
   - Use IAM roles for EC2
   - Never commit secrets to Git

2. **CORS Configuration:**
   - Update backend CORS to only allow your Amplify domain

3. **Rate Limiting:**
   - Implement rate limiting in backend
   - Use AWS WAF if needed

4. **File Upload Security:**
   - Validate file types and sizes
   - Scan uploaded files
   - Set up proper file cleanup

## Monitoring and Logging

### CloudWatch Logs

```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure to send PM2 logs
pm2 install pm2-cloudwatch
```

### PM2 Monitoring

```bash
# View logs
pm2 logs

# View status
pm2 status

# Monitor resources
pm2 monit
```

## Scaling Considerations

1. **Horizontal Scaling:**
   - Use Auto Scaling Groups for EC2
   - Configure ECS service auto-scaling

2. **Load Balancing:**
   - Setup Application Load Balancer
   - Configure health checks

3. **Caching:**
   - Use CloudFront for frontend
   - Implement Redis for backend caching

## Cost Optimization

- **EC2**: Use Reserved Instances or Savings Plans
- **Amplify**: First 1000 build minutes free
- **Data Transfer**: Use CloudFront to reduce costs
- **Storage**: Clean up old uploads regularly

## Troubleshooting

### Backend Not Accessible

```bash
# Check if services are running
pm2 status

# Check logs
pm2 logs ai-meeting-backend

# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Ollama Issues

```bash
# Check Ollama status
ollama list

# Restart Ollama
pm2 restart ollama
```

### Frontend Can't Connect to Backend

1. Check CORS settings in backend
2. Verify `VITE_API_URL` in Amplify
3. Check security group rules
4. Test backend directly: `curl https://your-backend-domain.com/api/health`

## Alternative Architectures

### Serverless Option (Advanced)

- **Frontend**: Amplify
- **API**: API Gateway + Lambda
- **Whisper**: Lambda with container (or external API)
- **Ollama**: External service (not recommended on Lambda)

### Kubernetes Option

- Deploy to AWS EKS
- Use Helm charts for management
- Configure autoscaling

## Backup and Disaster Recovery

1. **Code**: GitHub (already backed up)
2. **Database**: If you add one, use RDS snapshots
3. **Configuration**: Store in AWS Systems Manager Parameter Store
4. **AMI**: Create AMI of configured EC2 instance

## Support and Maintenance

### Regular Updates

```bash
# Update backend code
cd AiMeetingAssistant
git pull origin main
cd backend
npm install
pm2 restart ai-meeting-backend

# Update Python packages
source ../venv/bin/activate
pip install --upgrade transformers librosa numpy torch
```

### Health Checks

Set up CloudWatch alarms for:
- CPU utilization
- Memory usage
- Disk space
- API response times
- Error rates

## Contact

For deployment issues, open an issue on GitHub or contact support.
