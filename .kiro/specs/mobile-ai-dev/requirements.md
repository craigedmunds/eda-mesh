# Requirements Document

## Introduction

The Mobile AI Development Gateway is a system that provides a mobile-accessible, chat-based interface for building software projects using cloud-hosted AI models, while enforcing a structured software development lifecycle with explicit approvals, guardrails, and Git-native state management.

## Glossary

- **Gateway**: The chat gateway service that routes requests, enforces lifecycle rules, and manages project context
- **Project**: A Git repository or subdirectory containing an .ai/ directory with project specifications
- **Lifecycle_Stage**: One of the sequential development phases: requirements, design, tasks, implementation, review
- **State_File**: The state.yaml file that contains the authoritative representation of current project state
- **Approval**: A Git commit that represents explicit human approval for stage transitions or artifacts
- **AI_Model**: Cloud-hosted language models (Claude, ChatGPT, etc.) accessed via APIs
- **Lobe_Chat**: The open-source chat UI and plugin host used as the presentation layer
- **Repo_Intelligence**: Headless service providing semantic repository understanding and diff-only code generation

## Requirements

### Requirement 1: Mobile-First Development Interface

**User Story:** As a developer, I want to build software projects entirely from my mobile device, so that I can be productive regardless of location or available hardware.

#### Acceptance Criteria

1. WHEN a user accesses the system from a mobile browser, THE Gateway SHALL provide a fully functional chat interface
2. WHEN a user initiates a development task, THE Gateway SHALL support asynchronous workflows without requiring continuous interaction
3. THE Gateway SHALL render all project artifacts (markdown, diffs, diagrams) in a mobile-optimized format
4. WHEN a user switches between projects, THE Gateway SHALL maintain separate context for each project
5. THE Gateway SHALL provide one-tap approval actions for stage transitions and artifact approvals

### Requirement 2: Git-Native State Management

**User Story:** As a project stakeholder, I want all project state and history to be stored in Git, so that the project is fully auditable and reconstructable.

#### Acceptance Criteria

1. THE Gateway SHALL store all project specifications in the .ai/ directory within the Git repository
2. WHEN a lifecycle stage transition occurs, THE Gateway SHALL require a Git commit that modifies state.yaml
3. WHEN an approval is granted, THE Gateway SHALL represent it as a Git commit with structured metadata
4. THE Gateway SHALL NOT maintain any hidden or external state required to reconstruct project history
5. WHEN a project is accessed, THE Gateway SHALL load context exclusively from the Git repository contents

### Requirement 3: Structured Development Lifecycle

**User Story:** As a development team lead, I want AI assistance to follow a structured development process, so that software quality and governance requirements are met.

#### Acceptance Criteria

1. THE Gateway SHALL enforce the sequential lifecycle stages: requirements → design → tasks → implementation → review
2. WHEN AI attempts to perform an action, THE Gateway SHALL restrict capabilities based on the current lifecycle stage
3. WHEN a stage transition is requested, THE Gateway SHALL require explicit human approval via Git commit
4. THE Gateway SHALL prevent modification of approved artifacts unless the lifecycle is explicitly reset
5. WHEN CI validation fails, THE Gateway SHALL block progression to the next stage

### Requirement 4: AI Model Integration and Guardrails

**User Story:** As a developer, I want to use AI as a constrained contributor, so that I maintain control over the development process while benefiting from AI assistance.

#### Acceptance Criteria

1. WHEN in requirements stage, THE Gateway SHALL limit AI to text generation capabilities only
2. WHEN in design stage, THE Gateway SHALL allow AI text generation and diagram creation
3. WHEN in tasks stage, THE Gateway SHALL allow AI repository reading and task generation
4. WHEN in implementation stage, THE Gateway SHALL allow AI diff generation and pull request creation
5. WHEN in review stage, THE Gateway SHALL allow AI to access CI status and provide summaries
6. THE Gateway SHALL generate code only as diffs, never as direct file modifications
7. THE Gateway SHALL NOT allow AI to push directly to protected branches or bypass GitOps workflows

### Requirement 5: Project Context Isolation

**User Story:** As a developer working on multiple projects, I want strict context isolation between projects, so that AI assistance doesn't leak information or make incorrect assumptions.

#### Acceptance Criteria

1. WHEN a chat session is initiated, THE Gateway SHALL bind it to exactly one project
2. WHEN AI processes a request, THE Gateway SHALL load context only from files within the project's defined scope
3. THE Gateway SHALL NOT share context, history, or state between different projects
4. WHEN switching projects, THE Gateway SHALL clear all previous project context from AI memory
5. THE Gateway SHALL enforce project scope boundaries defined in `project.yaml` using included and excluded path patterns
6. WHEN a project attempts to access files outside its scope, THE Gateway SHALL reject the operation

### Requirement 6: Authentication and Security

**User Story:** As a system administrator, I want secure access controls and audit trails, so that the system meets enterprise security requirements.

#### Acceptance Criteria

1. THE Gateway SHALL require authenticated access for all operations
2. WHEN authentication tokens are issued, THE Gateway SHALL use short-lived tokens with automatic expiration
3. THE Gateway SHALL NOT expose secrets or sensitive configuration to AI models
4. WHEN AI actions are performed, THE Gateway SHALL create traceable audit logs via Git history
5. THE Gateway SHALL store secrets exclusively in secure secret stores, not in Git repositories

### Requirement 7: Git Operations and Pull Request Workflow

**User Story:** As a developer, I want AI to create pull requests for code changes, so that I can review and approve changes before they are merged.

#### Acceptance Criteria

1. WHEN AI generates code changes, THE Gateway SHALL create them as pull requests on feature branches
2. THE Gateway SHALL have read access to repository contents for context understanding
3. THE Gateway SHALL NOT force push or merge without explicit human approval
4. WHEN creating pull requests, THE Gateway SHALL include structured commit messages with AI action metadata
5. THE Gateway SHALL respect protected branch policies and mandatory CI requirements

### Requirement 8: Kubernetes Runtime Observability

**User Story:** As a developer, I want AI to help me understand the runtime state of my applications, so that I can troubleshoot issues and monitor deployments.

#### Acceptance Criteria

1. THE Gateway SHALL provide AI read-only access to Kubernetes deployment status
2. WHEN queried about application health, THE Gateway SHALL summarize pod health and restart information
3. THE Gateway SHALL provide access to summarized application logs for troubleshooting
4. THE Gateway SHALL NOT allow any write operations to Kubernetes resources
5. WHEN runtime changes are needed, THE Gateway SHALL enforce GitOps workflows for all modifications

### Requirement 9: CI/CD Integration and Validation

**User Story:** As a development team, I want automated validation of lifecycle compliance, so that governance rules are consistently enforced.

#### Acceptance Criteria

1. WHEN code changes are proposed before implementation stage, THE CI_Pipeline SHALL reject the changes
2. WHEN specification changes are proposed after approval, THE CI_Pipeline SHALL reject the changes
3. WHEN invalid lifecycle transitions are attempted, THE CI_Pipeline SHALL block the transition
4. WHEN CI validation fails, THE Gateway SHALL prevent progression but MAY propose corrective changes
5. THE CI_Pipeline SHALL validate that all AI-generated changes follow diff-only patterns

### Requirement 10: Multi-Model AI Support

**User Story:** As a developer, I want to use different AI models for different tasks, so that I can leverage the strengths of each model type.

#### Acceptance Criteria

1. THE Gateway SHALL support routing requests to multiple hosted AI models (Claude, ChatGPT, others)
2. WHEN a project is configured, THE Gateway SHALL respect model preferences specified in project.yaml
3. THE Gateway SHALL provide a model-agnostic interface that supports future AI model additions
4. WHEN model routing occurs, THE Gateway SHALL maintain consistent context and capability restrictions
5. THE Gateway SHALL log which model was used for each AI action for audit purposes