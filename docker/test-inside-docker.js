console.log('=== DOCKER CONTAINER DEBUG ===\n');

// Test 1: Check if node-appwrite is available
console.log('Test 1: Checking node-appwrite package...');
try {
  const { Client, Storage, Query } = require('node-appwrite');
  console.log('✓ node-appwrite loaded successfully');
  console.log('  Client:', typeof Client);
  console.log('  Storage:', typeof Storage);
  console.log('  Query:', typeof Query);
} catch (error) {
  console.error('✗ Failed to load node-appwrite:', error.message);
  process.exit(1);
}

// Test 2: Check environment variables
console.log('\nTest 2: Environment variables...');
console.log('  STREAM_NAME:', process.env.STREAM_NAME || 'NOT SET');
console.log('  APPWRITE_ENDPOINT:', process.env.APPWRITE_ENDPOINT || 'NOT SET');
console.log('  APPWRITE_PROJECT_ID:', process.env.APPWRITE_PROJECT_ID || 'NOT SET');
console.log('  APPWRITE_API_KEY:', process.env.APPWRITE_API_KEY ? 'SET (length: ' + process.env.APPWRITE_API_KEY.length + ')' : 'NOT SET');
console.log('  APPWRITE_BUCKET_ID:', process.env.APPWRITE_BUCKET_ID || 'NOT SET');

// Test 3: Try to connect to Appwrite
console.log('\nTest 3: Connecting to Appwrite...');

const { Client, Storage, Query } = require('node-appwrite');

const APPWRITE_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '698e91f800372012b43e';
const APPWRITE_API_KEY = 'standard_da657bf87fd39c46b341ff12e23c10e35208dc0f4bd8feacdfc5364a9a5f42a2d27d55805b28bf541b9b323ef26cd0f2487c1494f916fe6d6617a003b45fa1c6870593a73068b85da49c3965e5dfc4de026d4aebe194dc52a774120ce4e0d76885c91cfa9bb5fe7a4c7938d21f91871a1987ff82398a202ea676d4e6e0b951f6';

const BUCKET_IDS = {
  tafseer: '698e92c5001a5b8a75c0',
  tilawat: '69958cf3001a3bb3e6dd',
  translation: '6995f0f4002cb3539d2a'
};

const streamName = process.env.STREAM_NAME || 'tilawat';
const bucketId = BUCKET_IDS[streamName];

console.log('  Stream:', streamName);
console.log('  Bucket ID:', bucketId);

async function test() {
  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const storage = new Storage(client);
    
    console.log('✓ Client created');
    
    console.log('\nTest 4: Fetching files from bucket...');
    const response = await storage.listFiles(bucketId, [Query.limit(5000)]);
    
    console.log('✓ SUCCESS!');
    console.log('  Files returned:', response.files.length);
    console.log('  Total in bucket:', response.total);
    
    if (response.files.length > 0) {
      console.log('\nFirst 3 files:');
      response.files.slice(0, 3).forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.name} (${file.$id})`);
      });
    }
    
  } catch (error) {
    console.error('✗ FAILED:', error.message);
    console.error('  Type:', error.type);
    console.error('  Code:', error.code);
    if (error.response) {
      console.error('  Response:', JSON.stringify(error.response, null, 2));
    }
  }
}

test();
