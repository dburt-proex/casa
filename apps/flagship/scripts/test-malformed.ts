import { geminiService } from '../src/server/services/gemini.js';
import { backendBridge } from '../src/server/services/backendBridge.js';

// We need to test executeTool, but it's not exported.
// We can test it indirectly by mocking backendBridge or just testing the API.
// Let's just test it by calling geminiService.handleChat with a prompt that forces a malformed call.

async function testMalformedInputs() {
  console.log('Testing malformed tool inputs...');
  
  // This is a bit tricky to test reliably via the model because the model might correct the input.
  // Let's just create a test function that imports the file and extracts the executeTool function if possible,
  // or we can just test it by modifying the file temporarily.
  
  // Actually, we can just test the backendBridge validation directly.
  try {
    console.log('\nTesting runDryRun with missing policyId...');
    await backendBridge.runDryRun({ policyId: undefined as any, parameters: {}, environment: 'staging' });
  } catch (e: any) {
    console.log('Caught expected error:', e.message || e.issues);
  }

  try {
    console.log('\nTesting runDryRun with invalid environment...');
    await backendBridge.runDryRun({ policyId: 'POL-102', parameters: {}, environment: 'invalid' as any });
  } catch (e: any) {
    console.log('Caught expected error:', e.message || e.issues);
  }
}

testMalformedInputs();
