# Quick Deployment Guide

## ⚠️ Important: Deploy in This Order

### 1. Deploy Backend First (Render)
The backend needs to be deployed first because it includes the critical authentication middleware update.

```bash
cd backend
git add .
git commit -m "fix: Add Authorization header support for JWT authentication"
git push
```

**Wait for Render deployment to complete** (~5-10 minutes)
- Check Render dashboard for "Live" status
- Verify no deployment errors in logs

### 2. Deploy Frontend (Vercel)
After backend is live, deploy the frontend.

```bash
cd frontend  
git add .
git commit -m "fix: Implement JWT token storage and Authorization header authentication"
git push
```

**Wait for Vercel deployment to complete** (~2-3 minutes)
- Vercel will auto-deploy from git push
- Check Vercel dashboard for "Ready" status

## Testing After Deployment

1. **Open Your Vercel App**
   - Visit: https://careerconnectjobportal.vercel.app

2. **Clear Browser Data**
   - Press F12 (DevTools)
   - Go to Application tab
   - Click "Clear site data"
   - Close and reopen the browser

3. **Login**
   - Login with your credentials
   - Should see success message

4. **Verify Token Storage**
   - F12 → Application → Local Storage
   - Should see `jobToken` with a value

5. **Test Previously Failing Operations**
   - ✅ Post an experience
   - ✅ Apply to a job
   - ✅ Analyze resume
   - ✅ Access saved jobs
   - ✅ Post a job (if employer)

6. **Check Network Tab**
   - F12 → Network tab
   - Click on any API request
   - Look at Request Headers
   - Should see: `Authorization: Bearer eyJhbGc...`

## Expected Behavior

✅ **Login:** Token saved to localStorage  
✅ **API Requests:** Authorization header automatically added  
✅ **Page Refresh:** User stays logged in  
✅ **Logout:** Token removed, user logged out  
✅ **401 Errors:** Token auto-cleared, user redirected  

## If Issues Persist

### Check Environment Variables

**Render (Backend):**
- `NODE_ENV` = `production`
- `JWT_SECRET_KEY` = (your secret)
- `FRONTEND_URL` = `https://careerconnectjobportal.vercel.app`
- `COOKIE_EXPIRE` = `7` (or your preference)
- `AWS_REGION` = your AWS region (e.g. `ap-south-1`)
- `AWS_ACCESS_KEY_ID` = your IAM access key
- `AWS_SECRET_ACCESS_KEY` = your IAM secret key
- `AWS_S3_BUCKET_NAME` = your S3 bucket name
- `AWS_S3_PUBLIC_BASE_URL` = optional public URL base / CloudFront domain

**Vercel (Frontend):**
- `VITE_API_URL` = `https://careerconnect-backend-u91w.onrender.com`

### Check CORS Configuration

Ensure `backend/app.js` includes your Vercel URL in allowed origins:
- Should already be in `fallbackOrigins` array
- If custom domain, add to `FRONTEND_URL` env var

### Debug Steps

1. **Backend Logs:**
   ```
   Render Dashboard → Logs → Look for errors
   ```

2. **Frontend Console:**
   ```
   F12 → Console → Look for errors
   ```

3. **Network Errors:**
   ```
   F12 → Network → Look for failed requests
   ```

4. **Token Issues:**
   ```
   Check if token is being stored: localStorage.getItem('jobToken')
   Check if token is in headers: Network tab → Headers
   ```

## Rollback (If Needed)

If something breaks:

```bash
# Backend
cd backend
git revert HEAD
git push

# Frontend  
cd frontend
git revert HEAD
git push
```

## Success Indicators

✅ No 401 errors in Network tab  
✅ Token visible in localStorage  
✅ Authorization header in requests  
✅ All features working  
✅ User persists after refresh  

You're all set! 🚀
