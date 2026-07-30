# 🚀 Next Steps for AWS Amplify Deployment

Your code has been successfully pushed to GitHub! Here are the next steps to deploy your AI Meeting Assistant to AWS Amplify.

## ✅ What's Been Done

1. ✅ All code pushed to: `https://github.com/ametaankit25-design/AiMeetingAssistant.git`
2. ✅ Created `amplify.yml` for AWS Amplify build configuration
3. ✅ Added comprehensive deployment documentation
4. ✅ Fixed CORS and production configuration issues
5. ✅ Created Docker configuration for backend deployment
6. ✅ Added environment variable examples

## 📋 Deployment Steps

### Part 1: Deploy Frontend to AWS Amplify (15 minutes)

1. **Go to AWS Amplify Console:**
   - Visit: https://console.aws.amazon.com/amplify/
   - Sign in to your AWS account

2. **Create New App:**
   - Click "New app" → "Host web app"
   - Select "GitHub" as the source
   - Authorize AWS Amplify to access your GitHub account
   - Select repository: `ametaankit25-design/AiMeetingAssistant`
   - Select branch: `main`

3. **Configure Build Settings:**
   - Amplify will auto-detect `amplify.yml`
   - Review the build settings (they should look good!)
   - Click "Next"

4. **Review and Deploy:**
   - Review all settings
   - Click "Save and deploy"
   - Wait 5-10 minutes for the initial build

5. **Your Frontend is Live! 🎉**
   - You'll get a URL like: `https://main.d1234abcd.amplifyapp.com`
   - Save this URL - you'll need it!

### Part 2: Deploy Backend to AWS EC2 (30-45 minutes)

**Important:** The frontend alone won't work without the backend. Follow these steps:

1. **Launch EC2 Instance:**
   - Go to EC2 Console: https://console.aws.amazon.com/ec2/
   - Click "Launch Instance"
   - **Configuration:**
     - Name: `ai-meeting-backend`
     - AMI: Ubuntu Server 22.04 LTS
     - Instance type: `t3.medium` (minimum for Ollama)
     - Create new key pair (save it securely!)
     - Storage: 30 GB GP3
     - **Security Group Settings (IMPORTANT):**
       - SSH (22): Your IP
       - HTTP (80): Anywhere (0.0.0.0/0)
       - Custom TCP (5000): Anywhere (0.0.0.0/0)
       - Custom TCP (11434): 127.0.0.1/32 (localhost only)
   - Launch instance

2. **Connect to EC2:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-public-ip
   ```

3. **Run Setup Commands:**
   Copy and paste these commands one by one:

   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install Python and dependencies
   sudo apt install -y python3 python3-pip python3-venv ffmpeg

   # Install PM2 for process management
   sudo npm install -g pm2

   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh

   # Clone your repository
   git clone https://github.com/ametaankit25-design/AiMeetingAssistant.git
   cd AiMeetingAssistant

   # Setup backend
   cd backend
   npm install
   cd ..

   # Setup Python environment
   python3 -m venv venv
   source venv/bin/activate
   pip install transformers librosa numpy torch

   # Pull Ollama model (this takes 5-10 minutes)
   ollama pull llama3.2
   ```

4. **Start Services:**
   ```bash
   # Start Ollama as a service
   pm2 start ollama -- serve
   pm2 save
   pm2 startup  # Follow the command it gives you

   # Start backend
   cd ~/AiMeetingAssistant/backend
   pm2 start server.js --name "ai-meeting-backend"
   pm2 save

   # Check everything is running
   pm2 status
   ```

5. **Test Backend:**
   ```bash
   # Test health endpoint
   curl http://localhost:5000/api/health
   ```

   You should see: `{"status":"ok","timestamp":"..."}`

6. **Get Your EC2 Public IP:**
   ```bash
   curl http://checkip.amazonaws.com
   ```
   Save this IP address!

### Part 3: Connect Frontend to Backend (5 minutes)

1. **Update Amplify Environment Variables:**
   - Go to your Amplify app
   - Click "App settings" → "Environment variables"
   - Add new variable:
     - Key: `VITE_API_URL`
     - Value: `http://YOUR-EC2-PUBLIC-IP:5000`
   - Click "Save"

2. **Redeploy Frontend:**
   - Go to your Amplify app
   - Click "Redeploy this version" on the latest build
   - Wait for the build to complete

3. **Optional: Setup Domain (Recommended):**
   - Get a domain from Route 53 or external registrar
   - In Amplify: "Domain management" → "Add domain"
   - For backend, setup Nginx reverse proxy (see DEPLOYMENT.md)
   - Setup SSL with Let's Encrypt

### Part 4: Test Your Deployment! 🎯

1. **Visit Your Amplify URL**
2. **Test the Application:**
   - Upload a sample audio file
   - Wait for processing
   - Verify you see:
     - Raw Transcript (from Whisper)
     - Cleaned Transcript (from LLaMA)
     - Meeting Minutes

## 🔒 Security Improvements (Do This Next!)

1. **Update CORS:**
   - SSH into EC2
   - Edit `~/AiMeetingAssistant/backend/.env`
   - Add: `CORS_ORIGIN=https://your-amplify-url.amplifyapp.com`
   - Restart: `pm2 restart ai-meeting-backend`

2. **Update Security Group:**
   - Remove public access to port 5000
   - Only allow traffic from your Amplify IP ranges
   - Or better: Setup Application Load Balancer

3. **Setup HTTPS:**
   - Follow the Nginx + Let's Encrypt guide in DEPLOYMENT.md

## 💰 Cost Estimate

- **AWS Amplify**: ~$0/month (free tier) for small usage
- **EC2 t3.medium**: ~$30/month
- **Data Transfer**: ~$5-10/month
- **Total**: ~$35-40/month

**Cost Optimization Tips:**
- Use Reserved Instances for 40% discount
- Stop EC2 when not in use
- Use t3a.medium (AMD) for lower cost

## 🆘 Troubleshooting

### Frontend Builds Successfully But Backend Connection Fails

**Check:**
1. EC2 security group allows port 5000
2. Backend is running: `pm2 status`
3. Test directly: `curl http://YOUR-EC2-IP:5000/api/health`
4. Check CORS configuration

### Whisper Fails

**Check:**
1. Python packages installed: `pip list | grep transformers`
2. Check logs: `pm2 logs ai-meeting-backend`
3. Sufficient disk space: `df -h`

### Ollama Connection Error

**Check:**
1. Ollama is running: `pm2 status`
2. Model is downloaded: `ollama list`
3. Restart Ollama: `pm2 restart ollama`

## 📚 Additional Resources

- **Full Deployment Guide**: See `DEPLOYMENT.md`
- **AWS Amplify Docs**: https://docs.amplify.aws/
- **Ollama Docs**: https://ollama.ai/docs
- **GitHub Repo**: https://github.com/ametaankit25-design/AiMeetingAssistant

## 🎉 Success Checklist

- [ ] Frontend deployed to Amplify
- [ ] Backend running on EC2
- [ ] Ollama running and model downloaded
- [ ] Frontend can connect to backend
- [ ] Test audio upload works end-to-end
- [ ] CORS configured correctly
- [ ] Security groups properly configured
- [ ] (Optional) Custom domain setup
- [ ] (Optional) HTTPS/SSL configured

## 🤝 Need Help?

If you run into issues:
1. Check the logs: `pm2 logs`
2. Review DEPLOYMENT.md for detailed steps
3. Open an issue on GitHub
4. Check AWS CloudWatch logs

---

**Ready to deploy? Start with Part 1 above!** 🚀

Good luck! Your AI Meeting Assistant will be live soon! 🎊
