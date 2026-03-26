import fs from 'node:fs';
fs.mkdirSync('src/types', { recursive: true });
const data = JSON.parse(fs.readFileSync('C:/Users/tayan/.gemini/antigravity/brain/5f3378f9-e92d-479d-80c7-31189e24e24e/.system_generated/steps/146/output.txt', 'utf8'));
fs.writeFileSync('src/types/supabase.ts', data.types);
