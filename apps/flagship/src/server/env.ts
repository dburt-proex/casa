import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

try {
  const envExample = dotenv.parse(fs.readFileSync('.env.example'));
  for (const key in envExample) {
    if (key === 'GEMINI_API_KEY' || key === 'gemini-casa-api' || key === 'GEMINI_CASA_API' || key === 'APP_URL') continue;
    
    const isLocalRedis = key === 'REDIS_URL' && process.env[key] === 'redis://127.0.0.1:6379';
    const isLocalPython = (key === 'PYTHON_API_URL' || key === 'BACKEND_API_URL') && 
                          process.env[key]?.includes('127.0.0.1');

    // If the variable is not set, OR if it's a local default that we want to override from .env.example
    if (!process.env[key] || isLocalRedis || isLocalPython) {
      process.env[key] = envExample[key];
    }
  }
} catch (e) {
  console.warn('Could not load .env.example');
}
