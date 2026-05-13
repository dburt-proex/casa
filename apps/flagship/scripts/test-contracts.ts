import { backendBridge } from '../src/server/services/backendBridge.js';

async function testContracts() {
  console.log('Testing backend bridge contracts...');
  
  try {
    console.log('\n1. fetchDashboard');
    const dashboard = await backendBridge.getDashboard();
    console.log('Success:', dashboard);
  } catch (e: any) {
    console.error('Failed:', e.message);
  }

  try {
    console.log('\n2. fetchBoundaryStress');
    const stress = await backendBridge.getBoundaryStress();
    console.log('Success:', stress);
  } catch (e: any) {
    console.error('Failed:', e.message);
  }

  try {
    console.log('\n3. runPolicyDryRun');
    const dryRun = await backendBridge.runDryRun({ policyId: 'POL-102', parameters: {}, environment: 'staging' });
    console.log('Success:', dryRun);
  } catch (e: any) {
    console.error('Failed:', e.message);
  }

  try {
    console.log('\n4. replayDecision');
    const replay = await backendBridge.replayDecision('DEC-999');
    console.log('Success:', replay);
  } catch (e: any) {
    console.error('Failed:', e.message);
  }
}

testContracts();
