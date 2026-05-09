# Deploying MediCore to Render - Step by Step

## Prerequisites
- GitHub account
- Render account (free tier works)

---

## Step 1: Prepare Your Code for Deployment

### 1.1 Create a `render.yaml` for the backend (Server)

Create a file `render.yaml` in the root of your project:

```yaml
services:
  - type: web
    name: medicore-server
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: MONGO_URI
        fromDatabase:
          name: medicore-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: CLIENT_URL
        value: https://your-client-app.onrender.com
      - key: PORT
        value: 5000
      - key: BREVO_API_KEY
        fromSecret: your_brevo_api_key
      - key: BREVO_SENDER_EMAIL
        value: mahendrapra0077@gmail.com
  ```

### 1.2 Update server/package.json (already done - has start script)

### 1.3 Create Client Build Configuration

The client already has build scripts. We'll need to update the API URL for production.

---

## Step 2: Push Code to GitHub

1. Create a new repository on GitHub
2. Push your code:

```bash
git init
git add .
git commit -m "Initial commit for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/medicore.git
git push -u origin main
```

---

## Step 3: Deploy Backend (Server) on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `medicore-server`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
5. Click **"Create Web Service"**

### Add Environment Variables:
In Render dashboard for your service, go to **"Environment"** tab and add:
- `MONGO_URI` - Your MongoDB connection string
- `JWT_SECRET` - Generate a secure random string
- `CLIENT_URL` - Your frontend URL (after deploying client)
- `BREVO_API_KEY` - Brevo (Sendinblue) API key for email
   - `BREVO_SENDER_EMAIL` - Sender email address for Brevo

---

## Step 4: Deploy Database (MongoDB)

1. In Render dashboard, click **"New"** → **"MongoDB"**
2. Select free tier
3. Give it a name: `medicore-db`
4. Copy the connection string
5. Add it to your server's environment variables as `MONGO_URI`

---

## Step 5: Deploy Frontend (Client) on Render

1. Click **"New"** → **"Static Site"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `medicore-client`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL`: `https://medicore-server.onrender.com/api`
5. Click **"Create Static Site"**

---

## Step 6: Update Environment Variables

After deploying both services:
1. Update `CLIENT_URL` in server to point to your frontend
2. Update `VITE_API_URL` in client if needed

---

## Alternative: Deploy Client on Vercel (Easier)

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Select the `client` folder as root
4. Add environment variable:
   - `VITE_API_URL`: `https://medicore-server.onrender.com/api`
5. Deploy

---

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Make sure your MongoDB IP whitelist includes Render's IPs
   - Use MongoDB Atlas with proper connection string

2. **CORS Errors**
   - Update `CLIENT_URL` in server .env to match your frontend URL

3. **File Upload Issues**
   - Ensure the server has proper body parser limits (already configured)

4. **Static Files Not Loading**
   - Make sure `/uploads` route is properly configured

---

## Quick Fix: Environment Variables Update

After deployment, update your client .env:
```
VITE_API_URL=https://medicore-server.onrender.com/api
```

And server .env on Render:
```
CLIENT_URL=https://medicore-client.onrender.com
```