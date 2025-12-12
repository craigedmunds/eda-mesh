import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { imageFactoryApiRef } from '../../api';
import { EnrollImageDialog } from './EnrollImageDialog';

const mockImageFactoryApi = {
  getImageVersions: jest.fn(),
  enrollImage: jest.fn(),
};

describe('EnrollImageDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the enrollment form when open', () => {
    render(
      <TestApiProvider apis={[[imageFactoryApiRef, mockImageFactoryApi]]}>
        <EnrollImageDialog open={true} onClose={() => {}} />
      </TestApiProvider>
    );

    expect(screen.getByText('Enroll New Managed Image')).toBeInTheDocument();
    expect(screen.getByLabelText(/Image Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registry/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repository/)).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    render(
      <TestApiProvider apis={[[imageFactoryApiRef, mockImageFactoryApi]]}>
        <EnrollImageDialog open={true} onClose={() => {}} />
      </TestApiProvider>
    );

    // Try to submit with empty form
    const enrollButton = screen.getByText('Enroll Image');
    fireEvent.click(enrollButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('validates image name format', async () => {
    render(
      <TestApiProvider apis={[[imageFactoryApiRef, mockImageFactoryApi]]}>
        <EnrollImageDialog open={true} onClose={() => {}} />
      </TestApiProvider>
    );

    // Enter invalid image name
    const nameInput = screen.getByLabelText(/Image Name/);
    fireEvent.change(nameInput, { target: { value: 'Invalid_Name!' } });

    const enrollButton = screen.getByText('Enroll Image');
    fireEvent.click(enrollButton);

    await waitFor(() => {
      expect(screen.getByText(/Name must contain only lowercase letters, numbers, and hyphens/)).toBeInTheDocument();
    });
  });

  it('calls enrollImage API on valid form submission', async () => {
    mockImageFactoryApi.enrollImage.mockResolvedValue({
      success: true,
      pullRequestUrl: 'https://github.com/test/repo/pull/123',
    });

    render(
      <TestApiProvider apis={[[imageFactoryApiRef, mockImageFactoryApi]]}>
        <EnrollImageDialog open={true} onClose={() => {}} />
      </TestApiProvider>
    );

    // Fill out valid form data
    fireEvent.change(screen.getByLabelText(/Image Name/), { target: { value: 'test-image' } });
    fireEvent.change(screen.getByLabelText(/Registry/), { target: { value: 'ghcr.io' } });
    fireEvent.change(screen.getByLabelText(/Repository/), { target: { value: 'test/test-image' } });
    fireEvent.change(screen.getByLabelText(/Source Repository/), { target: { value: 'test/repo' } });
    fireEvent.change(screen.getByLabelText(/Workflow Name/), { target: { value: 'build.yml' } });

    const enrollButton = screen.getByText('Enroll Image');
    fireEvent.click(enrollButton);

    await waitFor(() => {
      expect(mockImageFactoryApi.enrollImage).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-image',
          registry: 'ghcr.io',
          repository: 'test/test-image',
          source: expect.objectContaining({
            repo: 'test/repo',
            workflow: 'build.yml',
          }),
        })
      );
    });
  });

  it('displays success message with PR URL after successful enrollment', async () => {
    const prUrl = 'https://github.com/test/repo/pull/123';
    mockImageFactoryApi.enrollImage.mockResolvedValue({
      success: true,
      pullRequestUrl: prUrl,
    });

    render(
      <TestApiProvider apis={[[imageFactoryApiRef, mockImageFactoryApi]]}>
        <EnrollImageDialog open={true} onClose={() => {}} />
      </TestApiProvider>
    );

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/Image Name/), { target: { value: 'test-image' } });
    fireEvent.change(screen.getByLabelText(/Registry/), { target: { value: 'ghcr.io' } });
    fireEvent.change(screen.getByLabelText(/Repository/), { target: { value: 'test/test-image' } });
    fireEvent.change(screen.getByLabelText(/Source Repository/), { target: { value: 'test/repo' } });
    fireEvent.change(screen.getByLabelText(/Workflow Name/), { target: { value: 'build.yml' } });

    fireEvent.click(screen.getByText('Enroll Image'));

    await waitFor(() => {
      expect(screen.getByText('Enrollment Successful!')).toBeInTheDocument();
      expect(screen.getByText(prUrl)).toBeInTheDocument();
    });
  });

  it('displays error message on API failure', async () => {
    const errorMessage = 'Image already exists';
    mockImageFactoryApi.enrollImage.mockRejectedValue(new Error(errorMessage));

    render(
      <TestApiProvider apis={[[imageFactoryApiRef, mockImageFactoryApi]]}>
        <EnrollImageDialog open={true} onClose={() => {}} />
      </TestApiProvider>
    );

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/Image Name/), { target: { value: 'test-image' } });
    fireEvent.change(screen.getByLabelText(/Registry/), { target: { value: 'ghcr.io' } });
    fireEvent.change(screen.getByLabelText(/Repository/), { target: { value: 'test/test-image' } });
    fireEvent.change(screen.getByLabelText(/Source Repository/), { target: { value: 'test/repo' } });
    fireEvent.change(screen.getByLabelText(/Workflow Name/), { target: { value: 'build.yml' } });

    fireEvent.click(screen.getByText('Enroll Image'));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('does not render when closed', () => {
    render(
      <TestApiProvider apis={[[imageFactoryApiRef, mockImageFactoryApi]]}>
        <EnrollImageDialog open={false} onClose={() => {}} />
      </TestApiProvider>
    );

    expect(screen.queryByText('Enroll New Managed Image')).not.toBeInTheDocument();
  });
});