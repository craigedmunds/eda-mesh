import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { NotFoundError, ConflictError } from '@backstage/errors';
import { type EnrollmentData } from '@internal/backstage-plugin-image-factory-common';
import fetch from 'node-fetch';
import * as yaml from 'js-yaml';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  imagesYamlPath: string;
}

interface GitHubFileResponse {
  content: string;
  sha: string;
}

export class GitHubService {
  private readonly config: GitHubConfig;
  private readonly apiBase = 'https://api.github.com';

  constructor(
    private readonly logger: LoggerService,
    config: Config,
  ) {
    const gitRepoUrl = config.getString('imageFactory.gitRepo');
    const match = gitRepoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) {
      throw new Error(
        `Invalid GitHub repository URL: ${gitRepoUrl}. Expected format: https://github.com/owner/repo.git`,
      );
    }

    this.config = {
      token: config.getString('imageFactory.github.token'),
      owner: match[1],
      repo: match[2],
      branch: config.getString('imageFactory.gitBranch'),
      imagesYamlPath: config.getString('imageFactory.imagesYamlPath'),
    };

    this.logger.info('GitHub service initialized', {
      owner: this.config.owner,
      repo: this.config.repo,
      branch: this.config.branch,
    });
  }

  async createEnrollmentPR(data: EnrollmentData): Promise<string> {
    const branchName = `enroll-image-${data.name}-${Date.now()}`;

    try {
      // 1. Get the base branch reference
      const baseRef = await this.getReference(this.config.branch);

      // 2. Create a new branch
      await this.createBranch(branchName, baseRef.sha);

      // 3. Get current images.yaml content
      const currentFile = await this.getFileContent(
        this.config.imagesYamlPath,
        this.config.branch,
      );

      // 4. Parse and update images.yaml
      const images = yaml.load(currentFile.content) as any[];
      
      // Check if image already exists
      if (images.some(img => img.name === data.name)) {
        throw new ConflictError(
          `Image '${data.name}' is already enrolled`,
        );
      }

      // Add new image
      const newImage = {
        name: data.name,
        registry: data.registry,
        repository: data.repository,
        source: {
          provider: data.source.provider,
          repo: data.source.repo,
          branch: data.source.branch,
          dockerfile: data.source.dockerfile,
          workflow: data.source.workflow,
        },
        rebuildDelay: data.rebuildPolicy.delay,
        autoRebuild: data.rebuildPolicy.autoRebuild,
      };

      images.push(newImage);

      // 5. Commit the updated file
      const updatedContent = yaml.dump(images, {
        indent: 2,
        lineWidth: -1,
      });

      await this.updateFile(
        this.config.imagesYamlPath,
        updatedContent,
        `Enroll image: ${data.name}`,
        branchName,
        currentFile.sha,
      );

      // 6. Create pull request
      const prUrl = await this.createPullRequest(
        branchName,
        this.config.branch,
        data,
      );

      return prUrl;
    } catch (error) {
      // Clean up branch if PR creation failed
      try {
        await this.deleteBranch(branchName);
      } catch (cleanupError) {
        this.logger.warn('Failed to clean up branch after error', {
          branch: branchName,
          error: String(cleanupError),
        });
      }
      throw error;
    }
  }

  private async getReference(ref: string): Promise<{ sha: string }> {
    const url = `${this.apiBase}/repos/${this.config.owner}/${this.config.repo}/git/ref/heads/${ref}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new NotFoundError(
        `Failed to get reference '${ref}': ${response.statusText}`,
      );
    }

    const data = (await response.json()) as any;
    return { sha: data.object.sha };
  }

  private async createBranch(
    branchName: string,
    sha: string,
  ): Promise<void> {
    const url = `${this.apiBase}/repos/${this.config.owner}/${this.config.repo}/git/refs`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create branch '${branchName}': ${response.statusText} - ${errorText}`,
      );
    }
  }

  private async getFileContent(
    path: string,
    ref: string,
  ): Promise<GitHubFileResponse> {
    const url = `${this.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${ref}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new NotFoundError(
        `Failed to get file '${path}': ${response.statusText}`,
      );
    }

    const data = (await response.json()) as any;
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return {
      content,
      sha: data.sha,
    };
  }

  private async updateFile(
    path: string,
    content: string,
    message: string,
    branch: string,
    sha: string,
  ): Promise<void> {
    const url = `${this.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
    const encodedContent = Buffer.from(content).toString('base64');

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        content: encodedContent,
        branch,
        sha,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update file '${path}': ${response.statusText} - ${errorText}`,
      );
    }
  }

  private async createPullRequest(
    head: string,
    base: string,
    data: EnrollmentData,
  ): Promise<string> {
    const url = `${this.apiBase}/repos/${this.config.owner}/${this.config.repo}/pulls`;

    const title = `Enroll image: ${data.name}`;
    const body = this.generatePRBody(data);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create pull request: ${response.statusText} - ${errorText}`,
      );
    }

    const pr = (await response.json()) as any;
    return pr.html_url;
  }

  private async deleteBranch(branchName: string): Promise<void> {
    const url = `${this.apiBase}/repos/${this.config.owner}/${this.config.repo}/git/refs/heads/${branchName}`;
    await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  private generatePRBody(data: EnrollmentData): string {
    return `## Image Enrollment Request

This PR enrolls a new managed image in the Image Factory system.

### Image Details

- **Name:** ${data.name}
- **Registry:** ${data.registry}
- **Repository:** ${data.repository}

### Source Information

- **Provider:** ${data.source.provider}
- **Repository:** ${data.source.repo}
- **Branch:** ${data.source.branch}
- **Dockerfile:** ${data.source.dockerfile}
- **Workflow:** ${data.source.workflow}

### Rebuild Policy

- **Delay:** ${data.rebuildPolicy.delay}
- **Auto-rebuild:** ${data.rebuildPolicy.autoRebuild ? 'Enabled' : 'Disabled'}

${data.metadata?.description ? `\n### Description\n\n${data.metadata.description}` : ''}

---

*This PR was automatically created by the Image Factory backend plugin.*
`;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `token ${this.config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }
}
