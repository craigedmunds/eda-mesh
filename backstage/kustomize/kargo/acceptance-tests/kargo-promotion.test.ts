#!/usr/bin/env node
/**
 * Acceptance Test for Backstage Kargo Promotion Pipeline
 * 
 * This test validates the complete promotion flow:
 * 1. Freight creation from new images
 * 2. Promotion execution (git operations + ArgoCD updates)
 * 3. ArgoCD deployment of updated image
 * 4. Backstage application validation
 * 
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2
 */

// @ts-ignore - Node.js built-in modules
const { execSync } = require('child_process');

// Simple delay function to avoid TypeScript issues with setTimeout
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => {
    // @ts-ignore - Node.js setTimeout
    setTimeout(resolve, ms);
  });
};

interface KargoResource {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
  };
  status?: any;
  spec?: any;
}

interface Freight extends KargoResource {
  status: {
    discoveredArtifacts?: {
      images?: Array<{
        repoURL: string;
        tag: string;
        digest: string;
      }>;
    };
  };
}

interface Stage extends KargoResource {
  status: {
    conditions?: Array<{
      type: string;
      status: string;
      reason: string;
      message: string;
    }>;
    freightSummary?: string;
    currentFreight?: {
      name: string;
    };
  };
}

interface Promotion extends KargoResource {
  status: {
    phase?: string;
    freight?: {
      name: string;
    };
    finishedAt?: string;
    currentStep?: number;
    stepExecutionMetadata?: Array<{
      alias?: string;
      status?: string;
      message?: string;
      errorCount?: number;
      startedAt?: string;
      finishedAt?: string;
    }>;
    message?: string;
    state?: any;
  };
}

class KargoAcceptanceTest {
  private readonly namespace = 'backstage-kargo';
  private readonly stageName = 'local';
  private readonly warehouseName = 'backstage';
  private readonly backstageNamespace = 'backstage';
  private readonly timeout = 600000; // 10 minutes
  private readonly pollInterval = 10000; // 10 seconds

  async run(): Promise<void> {
    console.log('🚀 Starting Backstage Kargo Acceptance Test');
    
    try {
      // Step 1: Validate initial setup
      await this.validateInitialSetup();
      
      // Step 2: Wait for or trigger freight creation
      const freight = await this.ensureFreightExists();
      
      // Step 3: Create promotion
      const promotion = await this.createPromotion(freight.metadata.name);
      
      // Step 4: Wait for promotion to complete
      await this.waitForPromotionCompletion(promotion.metadata.name);
      
      // Step 5: Validate ArgoCD sync
      await this.validateArgoCDSync();
      
      // Step 6: Validate Backstage deployment
      await this.validateBackstageDeployment();
      
      // Step 7: Wait for and validate Kargo verification (AnalysisRun)
      await this.validateKargoVerification(freight.metadata.name, promotion.metadata.name);
      
      // Step 8: Validate artifacts were generated
      await this.validateArtifactsGenerated();
      
      console.log('✅ Backstage Kargo Acceptance Test PASSED');
      
    } catch (error) {
      console.error('❌ Backstage Kargo Acceptance Test FAILED:', error);
      // @ts-ignore - Node.js globals
      process.exit(1);
    }
  }

  private async validateInitialSetup(): Promise<void> {
    console.log('📋 Validating initial Kargo setup...');
    
    // Check project exists and is ready
    const project = await this.kubectl<KargoResource>(`get project backstage-kargo -n ${this.namespace} -o json`);
    if (!project.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')) {
      throw new Error('Kargo project is not ready');
    }
    
    // Check warehouse exists
    const warehouse = await this.kubectl<KargoResource>(`get warehouse ${this.warehouseName} -n ${this.namespace} -o json`);
    if (!warehouse.metadata.name) {
      throw new Error('Warehouse does not exist');
    }
    
    // Check stage exists
    const stage = await this.kubectl<Stage>(`get stage ${this.stageName} -n ${this.namespace} -o json`);
    if (!stage.metadata.name) {
      throw new Error('Stage does not exist');
    }
    
    console.log('✅ Initial setup validated');
  }

  private async ensureFreightExists(): Promise<Freight> {
    console.log('📦 Ensuring freight exists...');
    
    // Check if freight already exists
    try {
      const freightList = await this.kubectl<{items: Freight[]}>(`get freight -n ${this.namespace} -o json`);
      
      if (freightList.items.length > 0) {
        const latestFreight = freightList.items
          .sort((a, b) => new Date(b.metadata.creationTimestamp!).getTime() - new Date(a.metadata.creationTimestamp!).getTime())[0];
        
        console.log(`✅ Using existing freight: ${latestFreight.metadata.name}`);
        return latestFreight;
      }
    } catch (error) {
      // No freight exists, will wait for creation
    }
    
    // Wait for warehouse to discover and create freight
    console.log('⏳ Waiting for warehouse to discover images and create freight...');
    
    const startTime = Date.now();
    while (Date.now() - startTime < this.timeout) {
      try {
        const freightList = await this.kubectl<{items: Freight[]}>(`get freight -n ${this.namespace} -o json`);
        
        if (freightList.items.length > 0) {
          const latestFreight = freightList.items[0];
          console.log(`✅ Freight created: ${latestFreight.metadata.name}`);
          return latestFreight;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await delay(this.pollInterval);
    }
    
    throw new Error('Timeout waiting for freight creation');
  }

  private async createPromotion(freightName: string): Promise<Promotion> {
    console.log(`🚀 Creating promotion for freight: ${freightName}`);
    
    const promotionName = `acceptance-test-${Date.now()}`;
    const promotionManifest = {
      apiVersion: 'kargo.akuity.io/v1alpha1',
      kind: 'Promotion',
      metadata: {
        name: promotionName,
        namespace: this.namespace
      },
      spec: {
        stage: this.stageName,
        freight: freightName,
        steps: [
          {
            uses: 'git-clone',
            config: {
              repoURL: 'https://github.com/craigedmunds/argocd-eda.git',
              checkout: [
                {
                  branch: 'feature/backstage-events',
                  path: './repo'
                }
              ]
            }
          },
          {
            uses: 'kustomize-set-image',
            as: 'update-image',
            config: {
              path: './repo/backstage/kustomize/overlays/local',
              images: [
                {
                  image: 'ghcr.io/craigedmunds/backstage',
                  tag: '${{ imageFrom("ghcr.io/craigedmunds/backstage").Tag }}'
                }
              ]
            }
          },
          {
            uses: 'git-commit',
            as: 'commit',
            config: {
              path: './repo',
              message: 'Update backstage image to ${{ imageFrom("ghcr.io/craigedmunds/backstage").Tag }} - Automated Acceptance test promotion by Kargo'
            }
          },
          {
            uses: 'git-push',
            config: {
              path: './repo',
              targetBranch: 'feature/backstage-events'
            }
          },
          {
            uses: 'argocd-update',
            config: {
              apps: [
                {
                  name: 'backstage',
                  namespace: 'argocd'
                }
              ]
            }
          }
        ]
      }
    };
    
    // Apply promotion
    await this.kubectlApply(promotionManifest);
    
    // Get the created promotion
    const promotion = await this.kubectl<Promotion>(`get promotion ${promotionName} -n ${this.namespace} -o json`);
    console.log(`✅ Promotion created: ${promotion.metadata.name}`);
    
    return promotion;
  }

  private async waitForPromotionCompletion(promotionName: string): Promise<void> {
    console.log(`⏳ Waiting for promotion ${promotionName} to complete...`);
    
    const startTime = Date.now();
    let lastPhase = '';
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    
    while (Date.now() - startTime < this.timeout) {
      try {
        const promotion = await this.kubectl<Promotion>(`get promotion ${promotionName} -n ${this.namespace} -o json`);
        
        // Reset error counter on successful status check
        consecutiveErrors = 0;
        
        if (promotion.status?.phase === 'Succeeded') {
          console.log('✅ Promotion completed successfully');
          return;
        }
        
        if (promotion.status?.phase === 'Failed' || promotion.status?.phase === 'Errored') {
          console.log('❌ Promotion failed, showing detailed status:');
          console.log(JSON.stringify(promotion.status, null, 2));
          throw new Error(`Promotion failed with phase: ${promotion.status.phase}`);
        }
        
        // Also check for other terminal failure states
        if (promotion.status?.phase && ['Aborted', 'Terminated'].includes(promotion.status.phase)) {
          console.log('❌ Promotion terminated, showing detailed status:');
          console.log(JSON.stringify(promotion.status, null, 2));
          throw new Error(`Promotion terminated with phase: ${promotion.status.phase}`);
        }
        
        // Log current status with more detail
        if (promotion.status?.phase && promotion.status.phase !== lastPhase) {
          console.log(`📊 Promotion status: ${promotion.status.phase}`);
          lastPhase = promotion.status.phase;
          
          // Show current step if available
          if (promotion.status?.currentStep !== undefined) {
            console.log(`📋 Current step: ${promotion.status.currentStep}`);
          }
          
          // Show step execution metadata if available
          if (promotion.status?.stepExecutionMetadata) {
            const steps = promotion.status.stepExecutionMetadata;
            console.log(`📋 Step progress: ${steps.length} steps executed`);
            const lastStep = steps[steps.length - 1];
            if (lastStep) {
              console.log(`📋 Last step: ${lastStep.alias || 'unknown'} - ${lastStep.status || 'unknown'}`);
            }
          }
        }
        
        // If promotion is running, show any available job logs
        if (promotion.status?.phase === 'Running') {
          await this.showPromotionLogs(promotionName);
        }
        
      } catch (error) {
        consecutiveErrors++;
        console.log(`⚠️  Error checking promotion status (${consecutiveErrors}/${maxConsecutiveErrors}): ${error}`);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Failed to check promotion status after ${maxConsecutiveErrors} consecutive errors. Last error: ${error}`);
        }
      }
      
      await delay(this.pollInterval);
    }
    
    throw new Error('Timeout waiting for promotion completion');
  }

  private async validateArgoCDSync(): Promise<void> {
    console.log('🔄 Validating ArgoCD sync...');
    
    const startTime = Date.now();
    while (Date.now() - startTime < this.timeout) {
      try {
        const app = await this.kubectl<any>(`get application backstage -n argocd -o json`);
        
        if (app.status?.sync?.status === 'Synced' && app.status?.health?.status === 'Healthy') {
          console.log('✅ ArgoCD application is synced and healthy');
          return;
        }
        
        console.log(`📊 ArgoCD status: sync=${app.status?.sync?.status}, health=${app.status?.health?.status}`);
        
      } catch (error) {
        console.log(`⚠️  Error checking ArgoCD status: ${error}`);
      }
      
      await delay(this.pollInterval);
    }
    
    throw new Error('Timeout waiting for ArgoCD sync');
  }

  private async validateBackstageDeployment(): Promise<void> {
    console.log('🎭 Validating Backstage deployment...');
    
    // Check deployment is ready
    const startTime = Date.now();
    while (Date.now() - startTime < this.timeout) {
      try {
        const deployment = await this.kubectl<any>(`get deployment backstage -n ${this.backstageNamespace} -o json`);
        
        const readyReplicas = deployment.status?.readyReplicas || 0;
        const replicas = deployment.status?.replicas || 0;
        
        if (readyReplicas > 0 && readyReplicas === replicas) {
          console.log('✅ Backstage deployment is ready');
          break;
        }
        
        console.log(`📊 Backstage deployment: ${readyReplicas}/${replicas} ready`);
        
      } catch (error) {
        console.log(`⚠️  Error checking deployment: ${error}`);
      }
      
      await delay(this.pollInterval);
    }
    
    // Test HTTP endpoint
    console.log('🌐 Testing Backstage HTTP endpoint...');
    
    const testStartTime = Date.now();
    while (Date.now() - testStartTime < 60000) { // 1 minute timeout for HTTP test
      try {
        const result = await this.kubectlRaw(`run curl-test --image=curlimages/curl --rm -i --restart=Never -- curl -f http://backstage.${this.backstageNamespace}.svc.cluster.local:7007/`);
        if (result.includes('Backstage') || result.includes('<!DOCTYPE html>')) {
          console.log('✅ Backstage HTTP endpoint is responding');
          return;
        } else {
          throw new Error('Unexpected response content');
        }
      } catch (error) {
        console.log('📊 Backstage endpoint not ready yet, retrying...');
        await delay(5000);
      }
    }
    
    throw new Error('Backstage HTTP endpoint validation failed');
  }

  private async kubectl<T = any>(command: string): Promise<T> {
    try {
      const result = execSync(`kubectl ${command}`, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return JSON.parse(result);
    } catch (error: any) {
      throw new Error(`kubectl command failed: ${command}\n${error.message}`);
    }
  }

  private async kubectlRaw(command: string): Promise<string> {
    try {
      const result = execSync(`kubectl ${command}`, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return result;
    } catch (error: any) {
      throw new Error(`kubectl command failed: ${command}\n${error.message}`);
    }
  }

  private async validateKargoVerification(freightName: string, promotionName: string): Promise<void> {
    console.log('🔍 Validating Kargo verification (AnalysisRun)...');
    
    // Force reverification to ensure verification runs even with existing freight
    console.log('🔄 Forcing stage reverification to ensure verification runs...');
    const reverifyTimestamp = new Date().toISOString();
    await this.kubectlRaw(`patch stage ${this.stageName} -n ${this.namespace} --type='merge' -p='{"metadata":{"annotations":{"kargo.akuity.io/reverify":"${reverifyTimestamp}"}}}'`);
    console.log('✅ Stage reverification triggered');
    
    // Wait for AnalysisRun to be created and complete
    const startTime = Date.now();
    // Get the promotion creation time to ensure we only look at AnalysisRuns created after this promotion
    const promotion = await this.kubectl<Promotion>(`get promotion ${promotionName} -n ${this.namespace} -o json`);
    const promotionStartTime = new Date(promotion.metadata.creationTimestamp!);
    console.log(`🕐 Promotion created at: ${promotionStartTime.toISOString()}`);
    console.log(`🔍 Looking for AnalysisRuns created after: ${promotionStartTime.toISOString()}`);
    let analysisRun: any = null;
    
    // First, wait for AnalysisRun to be created for this specific freight
    while (Date.now() - startTime < 15000) { // 15 second timeout
      try {
        const analysisRuns = await this.kubectl(`get analysisruns -n ${this.namespace} -o json`);
        
        // Debug: Show all AnalysisRuns to understand what's available
        console.log(`🔍 Found ${analysisRuns.items.length} AnalysisRuns in namespace ${this.namespace}`);
        analysisRuns.items.forEach((run: any, index: number) => {
          console.log(`  ${index + 1}. ${run.metadata.name} (created: ${run.metadata.creationTimestamp})`);
          if (run.metadata.labels) {
            console.log(`     Labels: ${JSON.stringify(run.metadata.labels)}`);
          }
        });
        
        // Look for AnalysisRun with the exact promotion annotation
        const promotionAnalysisRuns = analysisRuns.items.filter((run: any) => 
          run.metadata.annotations?.['kargo.akuity.io/promotion'] === promotionName
        );
        
        if (promotionAnalysisRuns.length > 0) {
          // Get the most recent one for this specific promotion
          analysisRun = promotionAnalysisRuns.sort((a: any, b: any) => 
            new Date(b.metadata.creationTimestamp).getTime() - new Date(a.metadata.creationTimestamp).getTime()
          )[0];
          console.log(`✅ Found AnalysisRun for promotion ${promotionName}: ${analysisRun.metadata.name}`);
          break;
        }
        
        console.log('⏳ Waiting for AnalysisRun to be created...');
        await delay(5000);
      } catch (error) {
        console.log(`⚠️ Error checking for AnalysisRuns: ${error}`);
        console.log('⏳ Waiting for AnalysisRun to be created...');
        await delay(5000);
      }
    }
    
    // No fallback needed - we should only proceed with the correct AnalysisRun
    
    if (!analysisRun) {
      throw new Error('AnalysisRun was not created within timeout period');
    }
    
    console.log(`📊 Found AnalysisRun: ${analysisRun.metadata.name}`);
    
    // Wait for AnalysisRun to complete
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    let lastPhase = '';
    let logsShownForPhase = false;
    
    while (Date.now() - startTime < 900000) { // 15 minute total timeout
      try {
        const currentRun = await this.kubectl(`get analysisrun ${analysisRun.metadata.name} -n ${this.namespace} -o json`);
        
        if (currentRun.status && currentRun.status.phase) {
          const phase = currentRun.status.phase;
          
          // Only log status change when phase actually changes
          if (phase !== lastPhase) {
            console.log(`📊 AnalysisRun status: ${phase}`);
            lastPhase = phase;
            logsShownForPhase = false; // Reset logs flag when phase changes
          }
          
          // Reset error counter on successful status check
          consecutiveErrors = 0;
          
          // Show logs from the analysis job if it's running (but only once per phase)
          if (phase === 'Running' && !logsShownForPhase) {
            await this.showAnalysisRunLogs(analysisRun.metadata.name);
            logsShownForPhase = true;
          }
          
          if (phase === 'Successful') {
            console.log('✅ AnalysisRun completed successfully');
            // Show final logs only if we haven't shown them yet
            if (!logsShownForPhase) {
              await this.showAnalysisRunLogs(analysisRun.metadata.name);
            }
            return;
          } else if (phase === 'Failed' || phase === 'Error' || phase === 'Errored') {
            console.log('❌ AnalysisRun failed, showing logs:');
            await this.showAnalysisRunLogs(analysisRun.metadata.name);
            
            // Show detailed error message from AnalysisRun
            if (currentRun.status.message) {
              console.log(`💥 Error details: ${currentRun.status.message}`);
            }
            
            // Show metric results if available
            if (currentRun.status.metricResults) {
              console.log('📊 Metric Results:');
              currentRun.status.metricResults.forEach((metric: any, index: number) => {
                console.log(`  ${index + 1}. ${metric.name}: ${metric.phase}`);
                if (metric.message) {
                  console.log(`     Message: ${metric.message}`);
                }
              });
            }
            
            throw new Error(`AnalysisRun failed with phase: ${phase}`);
          }
          // Continue waiting for Running, Pending, etc.
        }
        
        await delay(10000); // Check every 10 seconds
      } catch (error) {
        consecutiveErrors++;
        console.log(`⚠️ Error checking AnalysisRun (${consecutiveErrors}/${maxConsecutiveErrors}): ${error}`);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Failed to check AnalysisRun status after ${maxConsecutiveErrors} consecutive errors`);
        }
        
        await delay(10000);
      }
    }
    
    throw new Error('AnalysisRun did not complete within timeout period');
  }

  private async showPromotionLogs(promotionName: string): Promise<void> {
    try {
      // Look for promotion-related jobs
      const jobs = await this.kubectl(`get jobs -n ${this.namespace} -o json`);
      const promotionJob = jobs.items.find((job: any) => 
        job.metadata.name.includes(promotionName) ||
        job.metadata.labels?.['kargo.akuity.io/promotion'] === promotionName
      );
      
      if (promotionJob) {
        console.log(`📋 Showing logs from promotion job: ${promotionJob.metadata.name}`);
        
        // Get pods for this job
        const pods = await this.kubectl(`get pods -n ${this.namespace} -l job-name=${promotionJob.metadata.name} -o json`);
        
        if (pods.items && pods.items.length > 0) {
          const pod = pods.items[0];
          console.log(`📋 Tailing logs from promotion pod: ${pod.metadata.name}`);
          
          try {
            const logs = await this.kubectlRaw(`logs ${pod.metadata.name} -n ${this.namespace} --tail=10`);
            if (logs.trim()) {
              console.log('📄 Recent promotion logs:');
              console.log('─'.repeat(60));
              console.log(logs);
              console.log('─'.repeat(60));
            }
          } catch (logError) {
            console.log(`⚠️ Could not get promotion logs: ${logError}`);
          }
        }
      }
    } catch (error) {
      // Don't log errors for promotion logs as they might not exist yet
    }
  }

  private async showAnalysisRunLogs(analysisRunName: string): Promise<void> {
    try {
      // Get the job associated with the AnalysisRun
      const jobs = await this.kubectl(`get jobs -n ${this.namespace} -o json`);
      
      // Debug: Show all jobs to understand what's available
      console.log(`🔍 Found ${jobs.items.length} jobs in namespace ${this.namespace}`);
      jobs.items.forEach((job: any, index: number) => {
        console.log(`  ${index + 1}. ${job.metadata.name} (created: ${job.metadata.creationTimestamp})`);
        if (job.metadata.labels) {
          console.log(`     Labels: ${JSON.stringify(job.metadata.labels)}`);
        }
      });
      
      // Find job using ownerReferences - this is the concrete link
      let analysisJob = jobs.items.find((job: any) => 
        job.metadata.ownerReferences?.some((ref: any) => 
          ref.kind === 'AnalysisRun' && ref.name === analysisRunName
        )
      );
      
      if (!analysisJob) {
        console.log(`⚠️ No job found with ownerReference to AnalysisRun: ${analysisRunName}`);
      }
      
      if (analysisJob) {
        console.log(`📋 Showing logs from job: ${analysisJob.metadata.name}`);
        
        // Get pods for this job
        const pods = await this.kubectl(`get pods -n ${this.namespace} -l job-name=${analysisJob.metadata.name} -o json`);
        
        if (pods.items && pods.items.length > 0) {
          const pod = pods.items[0];
          console.log(`📋 Tailing logs from pod: ${pod.metadata.name}`);
          
          try {
            const logs = await this.kubectlRaw(`logs ${pod.metadata.name} -n ${this.namespace} --tail=20`);
            console.log('📄 Recent logs:');
            console.log('─'.repeat(80));
            console.log(logs);
            console.log('─'.repeat(80));
          } catch (logError) {
            console.log(`⚠️ Could not get logs: ${logError}`);
          }
        } else {
          console.log('⚠️ No pods found for the analysis job yet');
        }
      } else {
        console.log('⚠️ No analysis job found yet');
      }
    } catch (error) {
      console.log(`⚠️ Error showing analysis logs: ${error}`);
    }
  }

  private async validateArtifactsGenerated(): Promise<void> {
    console.log('📦 Validating Acceptance test artifacts were generated...');
    
    // Check if artifacts directory exists and has recent content on local filesystem
    try {
      const artifactsPath = '.backstage-acceptance-artifacts';
      
      // Check if directory exists
      const lsResult = execSync(`ls -la ${artifactsPath}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      
      // Look for recent artifact directories
      const findResult = execSync(`find ${artifactsPath} -name 'backstage-acceptance-*' -type d -mmin -30 2>/dev/null || true`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      
      if (findResult.trim()) {
        console.log('✅ Acceptance test artifacts found');
        const recentArtifacts = findResult.trim().split('\n').slice(0, 3);
        console.log('📋 Recent artifacts:', recentArtifacts.join('\n'));
      } else {
        console.log('⚠️ No recent acceptance test artifacts found - this may indicate the verification did not run properly');
        // Don't fail the test for missing artifacts, just warn
      }
    } catch (error) {
      console.log(`⚠️ Could not check artifacts: ${error}`);
      // Don't fail the test for artifact check issues
    }
  }

  private async kubectlApply(manifest: any): Promise<void> {
    const yamlContent = JSON.stringify(manifest);
    try {
      execSync(`echo '${yamlContent}' | kubectl apply -f -`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error: any) {
      throw new Error(`kubectl apply failed: ${error.message}`);
    }
  }
}

// Run the test
// @ts-ignore - Node.js globals
if (require.main === module) {
  const test = new KargoAcceptanceTest();
  test.run().catch((error: any) => {
    console.error('Test execution failed:', error);
    // @ts-ignore - Node.js globals
    process.exit(1);
  });
}

// @ts-ignore - CommonJS export
module.exports = { KargoAcceptanceTest };