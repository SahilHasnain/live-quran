const { Client, Storage } = require('node-appwrite');

// Hardcoded credentials
const APPWRITE_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '698e91f800372012b43e';
const APPWRITE_API_KEY = 'standard_da657bf87fd39c46b341ff12e23c10e35208dc0f4bd8feacdfc5364a9a5f42a2d27d55805b28bf541b9b323ef26cd0f2487c1494f916fe6d6617a003b45fa1c6870593a73068b85da49c3965e5dfc4de026d4aebe194dc52a774120ce4e0d76885c91cfa9bb5fe7a4c7938d21f91871a1987ff82398a202ea676d4e6e0b951f6';

const BUCKET_IDS = {
  tafseer: '698e92c5001a5b8a75c0',
  tilawat: '69958cf3001a3bb3e6dd',
  translation: '6995f0f4002cb3539d2a'
};

async function testBucket(bucketName, bucketId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${bucketName.toUpperCase()} bucket: ${bucketId}`);
  console.log('='.repeat(60));
  
  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const storage = new Storage(client);
    
    console.log('✓ Client initialized');
    console.log('✓ Fetching files from bucket...');
    
    const response = await storage.listFiles(bucketId);
    
    console.log(`✓ Success! Found ${response.files.length} files`);
    console.log(`  Total files in bucket: ${response.total}`);
    
    if (response.files.length > 0) {
      console.log('\nFirst 5 files:');
      response.files.slice(0, 5).forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.$id})`);
        console.log(`     Size: ${(file.sizeOriginal / 1024 / 1024).toFixed(2)} MB`);
      });
    } else {
      console.log('\n⚠ WARNING: Bucket is empty!');
    }
    
    return response.files.length;
    
  } catch (error) {
    console.error(`✗ ERROR: ${error.message}`);
    if (error.code) console.error(`  Code: ${error.code}`);
    if (error.response) console.error(`  Response:`, error.response);
    return 0;
  }
}

async function main() {
  console.log('\n🔍 APPWRITE STORAGE BUCKET TEST');
  console.log('================================\n');
  console.log(`Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`API Key: ${APPWRITE_API_KEY.substring(0, 20)}...`);
  
  const results = {};
  
  for (const [name, id] of Object.entries(BUCKET_IDS)) {
    results[name] = await testBucket(name, id);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  for (const [name, count] of Object.entries(results)) {
    const status = count > 0 ? '✓' : '✗';
    console.log(`${status} ${name.padEnd(15)}: ${count} files`);
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
