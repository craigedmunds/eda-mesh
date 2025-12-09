/**
 * Validation schemas and functions for enrollment data
 *
 * @packageDocumentation
 */

/**
 * Enrollment data for a new managed image
 *
 * @public
 */
export interface EnrollmentData {
  name: string;
  registry: string;
  repository: string;
  source: {
    provider: 'github' | 'gitlab';
    repo: string;
    branch: string;
    dockerfile: string;
    workflow: string;
  };
  rebuildPolicy: {
    delay: string;
    autoRebuild: boolean;
  };
  metadata?: {
    title?: string;
    description?: string;
    owner?: string;
    system?: string;
    lifecycle?: string;
  };
}

/**
 * Validation error details
 *
 * @public
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 *
 * @public
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate enrollment data
 *
 * @param data - The enrollment data to validate
 * @returns Validation result with any errors
 *
 * @public
 */
export function validateEnrollmentData(
  data: Partial<EnrollmentData>,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name
  if (!data.name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (!/^[a-z0-9-]+$/.test(data.name)) {
    errors.push({
      field: 'name',
      message: 'Name must contain only lowercase letters, numbers, and hyphens',
    });
  }

  // Validate registry
  if (!data.registry) {
    errors.push({ field: 'registry', message: 'Registry is required' });
  } else if (!/^[a-z0-9.-]+$/.test(data.registry)) {
    errors.push({
      field: 'registry',
      message: 'Registry must be a valid domain name',
    });
  }

  // Validate repository
  if (!data.repository) {
    errors.push({ field: 'repository', message: 'Repository is required' });
  } else if (!/^[a-z0-9/_-]+$/.test(data.repository)) {
    errors.push({
      field: 'repository',
      message: 'Repository must contain only lowercase letters, numbers, slashes, hyphens, and underscores',
    });
  }

  // Validate source
  if (!data.source) {
    errors.push({ field: 'source', message: 'Source information is required' });
  } else {
    if (!data.source.provider) {
      errors.push({
        field: 'source.provider',
        message: 'Source provider is required',
      });
    } else if (!['github', 'gitlab'].includes(data.source.provider)) {
      errors.push({
        field: 'source.provider',
        message: 'Source provider must be either "github" or "gitlab"',
      });
    }

    if (!data.source.repo) {
      errors.push({
        field: 'source.repo',
        message: 'Source repository is required',
      });
    }

    if (!data.source.branch) {
      errors.push({
        field: 'source.branch',
        message: 'Source branch is required',
      });
    }

    if (!data.source.dockerfile) {
      errors.push({
        field: 'source.dockerfile',
        message: 'Dockerfile path is required',
      });
    }

    if (!data.source.workflow) {
      errors.push({
        field: 'source.workflow',
        message: 'Workflow name is required',
      });
    }
  }

  // Validate rebuild policy
  if (!data.rebuildPolicy) {
    errors.push({
      field: 'rebuildPolicy',
      message: 'Rebuild policy is required',
    });
  } else {
    if (!data.rebuildPolicy.delay) {
      errors.push({
        field: 'rebuildPolicy.delay',
        message: 'Rebuild delay is required',
      });
    } else if (!/^\d+[dhm]$/.test(data.rebuildPolicy.delay)) {
      errors.push({
        field: 'rebuildPolicy.delay',
        message: 'Rebuild delay must be in format: number followed by d (days), h (hours), or m (minutes). Example: 7d, 24h, 30m',
      });
    }

    if (typeof data.rebuildPolicy.autoRebuild !== 'boolean') {
      errors.push({
        field: 'rebuildPolicy.autoRebuild',
        message: 'Auto-rebuild must be a boolean value',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse rebuild delay string to milliseconds
 *
 * @param delay - Delay string (e.g., "7d", "24h", "30m")
 * @returns Delay in milliseconds
 *
 * @public
 */
export function parseRebuildDelay(delay: string): number {
  const match = delay.match(/^(\d+)([dhm])$/);
  if (!match) {
    throw new Error(`Invalid delay format: ${delay}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days to milliseconds
    case 'h':
      return value * 60 * 60 * 1000; // hours to milliseconds
    case 'm':
      return value * 60 * 1000; // minutes to milliseconds
    default:
      throw new Error(`Invalid delay unit: ${unit}`);
  }
}

/**
 * Format milliseconds to rebuild delay string
 *
 * @param milliseconds - Delay in milliseconds
 * @returns Delay string (e.g., "7d", "24h", "30m")
 *
 * @public
 */
export function formatRebuildDelay(milliseconds: number): string {
  const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
  if (days > 0 && milliseconds % (24 * 60 * 60 * 1000) === 0) {
    return `${days}d`;
  }

  const hours = Math.floor(milliseconds / (60 * 60 * 1000));
  if (hours > 0 && milliseconds % (60 * 60 * 1000) === 0) {
    return `${hours}h`;
  }

  const minutes = Math.floor(milliseconds / (60 * 1000));
  return `${minutes}m`;
}
