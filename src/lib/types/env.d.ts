/// <reference types="vite/client" />

// Extend the NodeJS namespace with our environment variables
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }
  interface ImportMetaEnv {
    TELNYX_API_KEY: string;
    TELNYX_PHONE_NUMBER: string;
    TELNYX_CONNECTION_ID: string;
    TELNYX_MESSAGING_PROFILE_ID: string;
    GROQ_API_KEY: string;
    POCKETBASE_URL: string;
    NODE_ENV: string;
    PUBLIC_BASE_URL: string;
    PUBLIC_ENV: string;
  }
} 