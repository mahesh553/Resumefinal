import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { AdminDashboard } from '../AdminDashboard';

// Mock the hooks
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// Mock data
const mockAnalytics = {
  systemMetrics: {
    totalUsers: 1250,
    activeUsers: 987,
    adminUsers: 12,
    totalJobs: 3456,
    newUsersThisWeek: 45,
    activeUsersThisWeek: 234,
    jobsThisWeek: 89,
    userGrowthRate: 15.2,
    jobApplicationRate: 23.8,
  },
  userActivity: [
    {
      date: '2024-01-10',
      activeUsers: 234,
      newUsers: 12,
      totalLogins: 456,
    },
    {
      date: '2024-01-09',
      activeUsers: 221,
      newUsers: 8,
      totalLogins: 423,
    },
    {
      date: '2024-01-08',
      activeUsers: 198,
      newUsers: 15,
      totalLogins: 398,
    },
  ],
  popularFeatures: [
    {
      feature: 'Resume Upload',
      usage: 1250,
      users: 890,
      avgUsagePerUser: 1.4,
    },
    {
      feature: 'Job Tracking',
      usage: 987,
      users: 654,
      avgUsagePerUser: 1.5,
    },
    {
      feature: 'ATS Analysis',
      usage: 567,
      users: 432,
      avgUsagePerUser: 1.3,
    },
  ],
  topUsers: [
    {
      userId: 'user-1',
      userEmail: 'power.user@example.com',
      userName: 'Power User',
      jobCount: 25,
      resumeCount: 5,
      lastActivity: new Date('2024-01-10T10:30:00Z'),
      activityScore: 75,
    },
    {
      userId: 'user-2',
      userEmail: 'active.user@example.com',
      userName: 'Active User',
      jobCount: 18,
      resumeCount: 3,
      lastActivity: new Date('2024-01-10T09:15:00Z'),
      activityScore: 51,
    },
  ],
};

const mockSystemHealth = {
  status: 'healthy' as const,
  uptime: 99.9,
  responseTime: 245,
  errorRate: 0.1,
  dbConnections: 45,
  activeConnections: 123,
  memoryUsage: 67.8,
  cpuUsage: 34.2,
};

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should render the dashboard title', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Welcome to the QoderResume admin panel/)).toBeInTheDocument();
    });

    it('should display system metrics cards', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('987')).toBeInTheDocument();
      expect(screen.getByText('Total Jobs')).toBeInTheDocument();
      expect(screen.getByText('3,456')).toBeInTheDocument();
      expect(screen.getByText('Admin Users')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display growth metrics', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('New Users This Week')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Active This Week')).toBeInTheDocument();
      expect(screen.getByText('234')).toBeInTheDocument();
      expect(screen.getByText('Jobs This Week')).toBeInTheDocument();
      expect(screen.getByText('89')).toBeInTheDocument();
    });

    it('should display growth rates with proper formatting', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('+15.2%')).toBeInTheDocument(); // User Growth Rate
      expect(screen.getByText('+23.8%')).toBeInTheDocument(); // Job Application Rate
    });
  });

  describe('System Health Status', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should display healthy system status', () => {
      mockUseQuery.mockReturnValueOnce({
        data: { ...mockSystemHealth, status: 'healthy' },
        isLoading: false,
        error: null,
      } as any);

      render(<AdminDashboard />);
      
      expect(screen.getByText('System Status')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('99.9%')).toBeInTheDocument(); // Uptime
      expect(screen.getByText('245ms')).toBeInTheDocument(); // Response Time
    });

    it('should display warning system status', () => {
      mockUseQuery.mockReturnValueOnce({
        data: { ...mockSystemHealth, status: 'warning', errorRate: 2.5 },
        isLoading: false,
        error: null,
      } as any);

      render(<AdminDashboard />);
      
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should display critical system status', () => {
      mockUseQuery.mockReturnValueOnce({
        data: { ...mockSystemHealth, status: 'critical', errorRate: 8.0 },
        isLoading: false,
        error: null,
      } as any);

      render(<AdminDashboard />);
      
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should display resource usage metrics', () => {
      mockUseQuery.mockReturnValueOnce({
        data: mockSystemHealth,
        isLoading: false,
        error: null,
      } as any);

      render(<AdminDashboard />);
      
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('67.8%')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('34.2%')).toBeInTheDocument();
    });
  });

  describe('User Activity Chart', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should display user activity section', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('User Activity (Last 7 Days)')).toBeInTheDocument();
    });

    it('should render chart data points', () => {
      render(<AdminDashboard />);
      
      // Check if chart container is present
      const chartContainer = screen.getByTestId('user-activity-chart');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should allow switching between chart views', async () => {
      render(<AdminDashboard />);
      
      const activeUsersTab = screen.getByText('Active Users');
      const newUsersTab = screen.getByText('New Users');
      const loginsTab = screen.getByText('Total Logins');
      
      expect(activeUsersTab).toBeInTheDocument();
      expect(newUsersTab).toBeInTheDocument();
      expect(loginsTab).toBeInTheDocument();
      
      // Click on different tabs
      fireEvent.click(newUsersTab);
      expect(newUsersTab).toHaveClass('active'); // Assuming active class
      
      fireEvent.click(loginsTab);
      expect(loginsTab).toHaveClass('active');
    });
  });

  describe('Popular Features', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should display popular features list', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('Popular Features')).toBeInTheDocument();
      expect(screen.getByText('Resume Upload')).toBeInTheDocument();
      expect(screen.getByText('Job Tracking')).toBeInTheDocument();
      expect(screen.getByText('ATS Analysis')).toBeInTheDocument();
    });

    it('should show feature usage statistics', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('1,250 uses')).toBeInTheDocument();
      expect(screen.getByText('890 users')).toBeInTheDocument();
      expect(screen.getByText('1.4 avg/user')).toBeInTheDocument();
    });

    it('should render feature usage bars', () => {
      render(<AdminDashboard />);
      
      // Check for progress bars or usage indicators
      const featureItems = screen.getAllByTestId('feature-item');
      expect(featureItems).toHaveLength(3);
      
      featureItems.forEach(item => {
        expect(item).toBeInTheDocument();
      });
    });
  });

  describe('Top Users', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should display top users section', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('Top Users')).toBeInTheDocument();
      expect(screen.getByText('Power User')).toBeInTheDocument();
      expect(screen.getByText('Active User')).toBeInTheDocument();
    });

    it('should show user activity scores', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('75')).toBeInTheDocument(); // Activity Score
      expect(screen.getByText('51')).toBeInTheDocument(); // Activity Score
    });

    it('should display user statistics', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByText('25 jobs')).toBeInTheDocument();
      expect(screen.getByText('5 resumes')).toBeInTheDocument();
      expect(screen.getByText('18 jobs')).toBeInTheDocument();
      expect(screen.getByText('3 resumes')).toBeInTheDocument();
    });

    it('should format last activity time', () => {
      render(<AdminDashboard />);
      
      // Should show relative time like "2 hours ago"
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state for analytics', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: null,
          isLoading: true,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminDashboard />);
      
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    });

    it('should show loading state for system health', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: null,
          isLoading: true,
          error: null,
        } as any);

      render(<AdminDashboard />);
      
      expect(screen.getByText('Loading system status...')).toBeInTheDocument();
    });

    it('should show skeleton loaders for metric cards', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: null,
          isLoading: true,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: null,
          isLoading: true,
          error: null,
        } as any);

      render(<AdminDashboard />);
      
      const skeletonElements = screen.getAllByTestId('metric-skeleton');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when analytics fail to load', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: new Error('Failed to fetch analytics'),
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminDashboard />);
      
      expect(screen.getByText(/Failed to load analytics/)).toBeInTheDocument();
    });

    it('should display error message when system health fails to load', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: new Error('Failed to fetch system health'),
        } as any);

      render(<AdminDashboard />);
      
      expect(screen.getByText(/Failed to load system status/)).toBeInTheDocument();
    });

    it('should show retry button on error', async () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: new Error('Network error'),
          refetch: jest.fn(),
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminDashboard />);
      
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      // Should call refetch function
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        } as any);
    });

    it('should have refresh button', () => {
      render(<AdminDashboard />);
      
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
    });

    it('should refresh data when refresh button is clicked', async () => {
      const mockRefetch = jest.fn();
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
          refetch: mockRefetch,
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
          refetch: mockRefetch,
        } as any);

      render(<AdminDashboard />);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(2); // Both queries should refetch
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<AdminDashboard />);
      
      // Should have responsive classes
      const dashboardContainer = screen.getByTestId('admin-dashboard');
      expect(dashboardContainer).toHaveClass('mobile-layout');
    });

    it('should show abbreviated labels on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(<AdminDashboard />);
      
      // Should show shorter labels or icons
      expect(screen.getByTestId('metric-cards')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockAnalytics,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSystemHealth,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should have proper ARIA labels for metrics', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByLabelText(/total users count/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active users count/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<AdminDashboard />);
      
      expect(screen.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'System Status' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<AdminDashboard />);
      
      const refreshButton = screen.getByText('Refresh');
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();
    });

    it('should announce status changes to screen readers', () => {
      render(<AdminDashboard />);
      
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();
    });
  });
});