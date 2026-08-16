import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary';
import { ApiResponse } from './utils/ApiResponse.js';

// Import routers from routes directory
import devRouter from './routes/developer.js';
import userRouter from './routes/user.js';
import groupRouter from './routes/group.js';
import chatRouter from './routes/chat.js';
import reportRouter from './routes/report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

mongoose.connect(process.env.MONGO_URL)
.then(()=>{
  app.listen(process.env.PORT, ()=>{
      console.log("Server is listening on port : ", process.env.PORT);
  });
  console.log("Database connected successfully");
})
.catch(()=>{
  console.log("Some error occured while connecting database");
})

// =============================================================================
// ROUTER MOUNTING
// =============================================================================

app.use('/dev', devRouter);
app.use('/user', userRouter);
app.use('/user', groupRouter);
app.use('/user', chatRouter);
app.use('/', reportRouter);


// =============================================================================
// SERVER HEALTH CHECK ROUTE
// =============================================================================

app.get('/health', (req,res)=>{
  return ApiResponse.success(res, 200, "Server is running perfectly");
});

// =============================================================================
// GLOBAL FALLBACK ROUTES
// =============================================================================

app.get('/{*any}', (req, res) => {
  return ApiResponse.success(res, 200, "This is global get page");
});

app.post('/{*any}', (req, res) => {
  return ApiResponse.success(res, 200, "This is global post page");
});

export default app;