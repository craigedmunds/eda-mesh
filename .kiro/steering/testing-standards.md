# Testing Standards and Process

## Test Quality Standards

### Clean Test Output
- **Encourage meaningful test output**: Logs that provide insight into test behavior are valuable
- **Suppress framework noise**: React warnings, deprecation notices, and other framework chatter should be suppressed in test output
- **Focus on signal over noise**: Test output should clearly show what's being tested and any failures

### Test Layer Strategy

#### Unit Tests
- **Mock all dependencies**: External APIs, databases, file systems, and other services must be mocked
- **Test in isolation**: Each unit should be tested independently of its dependencies
- **Fast execution**: Unit tests should run quickly without network calls or I/O operations
- **High coverage**: Aim for comprehensive coverage of business logic and edge cases

#### Integration Tests
- **Test component interaction**: Verify that frontend and backend components work together correctly
- **Real component integration**: Use actual components but mock external services
- **API contract validation**: Ensure frontend and backend agree on data formats and endpoints
- **Limited scope**: Focus on critical integration points, not full system flows

#### Acceptance Tests
- **Minimal but critical**: Keep acceptance tests to a small, focused set that validates core user journeys & requirements
- **Real system validation**: Test against actual deployed systems
- **User perspective**: Test from the user's point of view, not internal implementation details
- **Success gate**: Acceptance tests are the final validation before considering work complete

## Success Criteria

### Definition of Done
1. **Unit tests pass**: All business logic is validated in isolation
2. **Integration tests pass**: Component interactions work correctly
3. **Acceptance tests pass**: Critical user flows work end-to-end
4. **Only then celebrate success**: Do not consider work complete until all test layers pass

### Test Execution Order
1. Run unit tests first (fastest feedback)
2. Run integration tests second (moderate feedback)
3. Run acceptance tests last (comprehensive validation)
4. All layers must pass before deployment or completion

## Implementation Guidelines

### Test Organization
- Co-locate unit tests with source code using `.test.ts` suffix
- Place integration tests in dedicated `integration/` directories
- Keep acceptance tests separate directories, usually `tests/acceptance/` 
- Use descriptive test names that explain the behavior being tested

### Mocking Strategy
- Mock external dependencies at the boundary (APIs, databases, file systems)
- Use consistent mocking patterns across the codebase
- Prefer dependency injection to enable easier mocking
- Document mock behavior and assumptions

### Test Data Management
- Use factories or builders for test data creation
- Isolate test data to prevent cross-test contamination
- Clean up test data after each test run
- Use realistic but anonymized data for testing

## Quality Gates

### Before Code Review
- All unit tests must pass
- New code must have corresponding unit tests
- Integration tests for modified components must pass

### Before Deployment
- Complete test suite must pass (unit + integration + acceptance)
- No test warnings or errors in output
- Performance tests (if applicable) must meet thresholds

### Continuous Integration
- Tests run automatically on every commit
- Failed tests block merging
- Test results are clearly reported and actionable

## Anti-Patterns to Avoid

- **Don't skip acceptance validation**: Unit and integration tests alone are insufficient
- **Don't ignore test warnings**: Clean up noisy test output
- **Don't mock everything in integration tests**: Some real components should interact
- **Don't write too many acceptance tests**: Keep them focused and maintainable
- **Don't celebrate before acceptance passes**: Premature success declarations lead to production issues
- **Don't invent new test mechanisms or setups unless confirmed**: The test structure is deliberate, if you think new things are needed, cover it in the design.md & seek confirmation before continuing.