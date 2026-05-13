import { executeTool } from '../src/server/services/gemini.js';

async function testFunctionCallingFormat() {
  console.log('Testing Gemini function-calling format regression...');
  
  const mockCall = {
    id: 'call_123',
    name: 'fetchDashboard',
    args: {}
  };

  const result = await executeTool(mockCall);
  
  const functionResponse = {
    functionResponse: {
      id: mockCall.id,
      name: mockCall.name,
      response: result
    }
  };

  console.log('Formatted Function Response:', JSON.stringify(functionResponse, null, 2));

  if (!functionResponse.functionResponse.id) {
    console.error('Regression: Missing id in functionResponse');
    process.exit(1);
  }
  if (!functionResponse.functionResponse.name) {
    console.error('Regression: Missing name in functionResponse');
    process.exit(1);
  }
  if (!functionResponse.functionResponse.response) {
    console.error('Regression: Missing response in functionResponse');
    process.exit(1);
  }

  console.log('Regression test passed.');
}

testFunctionCallingFormat();
