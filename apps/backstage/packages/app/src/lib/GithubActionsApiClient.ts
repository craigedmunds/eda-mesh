import { DiscoveryApi } from '@backstage/core-plugin-api';
import { GithubActionsApi } from '@backstage/plugin-github-actions';
import { Octokit } from '@octokit/rest';

/**
 * Custom GitHub Actions API client that uses backend proxy authentication
 * instead of requiring user-level GitHub OAuth.
 * 
 * The proxy backend adds the GitHub token from environment variables.
 */
export class GithubActionsApiClient implements GithubActionsApi {
  private readonly discoveryApi: DiscoveryApi;

  constructor(options: {
    discoveryApi: DiscoveryApi;
  }) {
    this.discoveryApi = options.discoveryApi;
  }

  private async getOctokit(): Promise<Octokit> {
    console.log('[GithubActionsApiClient] Getting Octokit client via backend proxy...');
    
    // Get the proxy base URL from discovery
    const proxyUrl = await this.discoveryApi.getBaseUrl('proxy');
    
    console.log('[GithubActionsApiClient] Proxy URL:', proxyUrl);
    
    // Use the backend proxy endpoint
    // The proxy will add the Authorization header with the GitHub token from env vars
    return new Octokit({
      baseUrl: `${proxyUrl}/github-api`,
      // Don't set auth here - the proxy adds it
    });
  }

  async reRunWorkflow(options: {
    hostname?: string;
    owner: string;
    repo: string;
    runId: number;
  }): Promise<any> {
    const octokit = await this.getOctokit();
    
    return await octokit.actions.reRunWorkflow({
      owner: options.owner,
      repo: options.repo,
      run_id: options.runId,
    });
  }

  async listWorkflowRuns(options: {
    hostname?: string;
    owner: string;
    repo: string;
    pageSize?: number;
    page?: number;
    branch?: string;
  }): Promise<any> {
    console.log('🚀 [GithubActionsApiClient] listWorkflowRuns called with:', options);
    console.log('🚀 [GithubActionsApiClient] This means the GitHub Actions component is trying to fetch data!');
    
    try {
      const octokit = await this.getOctokit();
      
      console.log('[GithubActionsApiClient] Making request to GitHub API...');
      console.log('[GithubActionsApiClient] Request params:', {
        owner: options.owner,
        repo: options.repo,
        per_page: options.pageSize,
        page: options.page,
        branch: options.branch,
      });
      
      const result = await octokit.actions.listWorkflowRunsForRepo({
        owner: options.owner,
        repo: options.repo,
        per_page: options.pageSize,
        page: options.page,
        branch: options.branch,
      });
      
      console.log('[GithubActionsApiClient] ✅ Request successful!');
      console.log('[GithubActionsApiClient] Total workflow runs:', result.data.total_count);
      console.log('[GithubActionsApiClient] Workflow runs returned:', result.data.workflow_runs?.length);
      console.log('[GithubActionsApiClient] First few runs:', result.data.workflow_runs?.slice(0, 3).map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
      })));
      
      return result;
    } catch (error) {
      console.error('[GithubActionsApiClient] ❌ Error fetching workflow runs:', error);
      console.error('[GithubActionsApiClient] Error details:', {
        message: (error as any).message,
        status: (error as any).status,
        response: (error as any).response?.data,
      });
      throw error;
    }
  }

  async getWorkflow(options: {
    hostname?: string;
    owner: string;
    repo: string;
    id: number;
  }): Promise<any> {
    const octokit = await this.getOctokit();
    
    return await octokit.actions.getWorkflow({
      owner: options.owner,
      repo: options.repo,
      workflow_id: options.id,
    });
  }

  async getWorkflowRun(options: {
    hostname?: string;
    owner: string;
    repo: string;
    id: number;
  }): Promise<any> {
    const octokit = await this.getOctokit();
    
    return await octokit.actions.getWorkflowRun({
      owner: options.owner,
      repo: options.repo,
      run_id: options.id,
    });
  }

  async listJobsForWorkflowRun(options: {
    hostname?: string;
    owner: string;
    repo: string;
    id: number;
    pageSize?: number;
    page?: number;
  }): Promise<any> {
    const octokit = await this.getOctokit();
    
    return await octokit.actions.listJobsForWorkflowRun({
      owner: options.owner,
      repo: options.repo,
      run_id: options.id,
      per_page: options.pageSize,
      page: options.page,
    });
  }

  async downloadJobLogsForWorkflowRun(options: {
    hostname?: string;
    owner: string;
    repo: string;
    runId: number;
  }): Promise<any> {
    const octokit = await this.getOctokit();
    
    return await octokit.actions.downloadWorkflowRunLogs({
      owner: options.owner,
      repo: options.repo,
      run_id: options.runId,
    });
  }

  async listBranches(options: {
    hostname?: string;
    owner: string;
    repo: string;
  }): Promise<any> {
    const octokit = await this.getOctokit();
    
    return await octokit.repos.listBranches({
      owner: options.owner,
      repo: options.repo,
    });
  }

  async getDefaultBranch(options: {
    hostname?: string;
    owner: string;
    repo: string;
  }): Promise<string> {
    const octokit = await this.getOctokit();
    
    const response = await octokit.repos.get({
      owner: options.owner,
      repo: options.repo,
    });
    
    return response.data.default_branch;
  }
}
