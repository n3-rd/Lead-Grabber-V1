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
    TELNYX_RECEIVING_NUMBER: string;
    TELNYX_CONNECTION_ID: string;
    TELNYX_MESSAGING_PROFILE_ID: string;
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;
    TWILIO_ENABLED: string;
    POCKETBASE_URL: string;
    NODE_ENV: string;
    PUBLIC_BASE_URL: string;
    PUBLIC_ENV: string;
  }
} 