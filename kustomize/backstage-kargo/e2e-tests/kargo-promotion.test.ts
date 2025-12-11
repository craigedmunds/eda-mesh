#!/usr/bin/env node
/**
 * E2E Test for Backstage Kargo Promotion Pipeline
 * 
 * This test validates the complete promotion flow:
 * 1. Freight creation from new images
 * 2. Promotion execution (git operations + ArgoCD updates)
 * 3. ArgoCD deployment of updated image
 * 4. Backstage application validation
 * 
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2
 */

import { execSync } from 'child_process';
import { setTimeout } from 'timers/promises';

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
  };
}

class KargoE2ETest {
  private readonly namespace = 'backstage-kargo';
  private readonly stageName = 'local';
  private readonly warehouseName = 'backstage';
  private readonly backstageNamespace = 'backstage';
  private readonly timeout = 600000; // 10 minutes
  private readonly pollInterval = 10000; // 10 seconds

  async run(): Promise<void> {
    console.log('🚀 Starting Backstage Kargo E2E Test');
    
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
      
      console.log('✅ Backstage Kargo E2E Test PASSED');
      
    } catch (error) {
      console.error('❌ Backstage Kargo E2E Test FAILED:', error);
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
      
      await setTimeout(this.pollInterval);
    }
    
    throw new Error('Timeout waiting for freight creation');
  }

  private async createPromotion(freightName: string): Promise<Promotion> {
    console.log(`🚀 Creating promotion for freight: ${freightName}`);
    
    const promotionName = `e2e-test-${Date.now()}`;
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
              path: './repo/kustomize/backstage/overlays/local',
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
              message: 'Update backstage image to ${{ imageFrom("ghcr.io/craigedmunds/backstage").Tag }} - Automated E2E test promotion by Kargo'
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
    while (Date.now() - startTime < this.timeout) {
      try {
        const promotion = await this.kubectl<Promotion>(`get promotion ${promotionName} -n ${this.namespace} -o json`);
        
        if (promotion.status?.phase === 'Succeeded') {
          console.log('✅ Promotion completed successfully');
          return;
        }
        
        if (promotion.status?.phase === 'Failed' || promotion.status?.phase === 'Errored') {
          throw new Error(`Promotion failed with phase: ${promotion.status.phase}`);
        }
        
        // Log current status
        if (promotion.status?.phase) {
          console.log(`📊 Promotion status: ${promotion.status.phase}`);
        }
        
      } catch (error) {
        console.log(`⚠️  Error checking promotion status: ${error}`);
      }
      
      await setTimeout(this.pollInterval);
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
      
      await setTimeout(this.pollInterval);
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
      
      await setTimeout(this.pollInterval);
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
        await setTimeout(5000);
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
if (require.main === module) {
  const test = new KargoE2ETest();
  test.run().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { KargoE2ETest };