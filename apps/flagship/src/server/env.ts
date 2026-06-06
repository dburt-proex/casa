import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
dotenv.config();

export function shouldLoadEnvExample(nodeEnv = process.env.NODE_ENV): boolean {
  const normalizedNodeEnv = nodeEnv?.trim().toLowerCase();
  return normalizedNodeEnv === 'development' || normalizedNodeEnv === 'test';
}

if (shouldLoadEnvExample()) {
  try {
    const envExample = dotenv.parse(fs.readFileSync('.env.example'));
    for (const key in envExample) {
      if (key === 'GEMINI_API_KEY' || key === 'gemini-casa-api' || key === 'GEMINI_CASA_API' || key === 'APP_URL') continue;
      if (!process.env[key]) {
        process.env[key] = envExample[key];
      }
    }
  } catch (e) {
    console.warn('Could not load .env.example');
  }
}
