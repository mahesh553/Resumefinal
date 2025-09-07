import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminSecurity } from '../AdminSecurity';
import { toast } from '@/components/ui/Toast';

// Mock the hooks
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

// Mock data
const mockSecurityEvents = [
  {
    id: 'event-1',
    type: 'login',
    user: { id: 'user-1', email: 'admin@example.com', role: 'admin' },
    timestamp: new Date('2024-01-10T10:00:00Z'),
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    description: 'Admin user successful login',
    severity: 'low',
  },
  {
    id: 'event-2',
    type: 'failed_login',
    user: { id: 'user-2', email: 'user@example.com', role: 'user' },
    timestamp: new Date('2024-01-09T15:30:00Z'),
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0',
    description: 'Failed login attempt - invalid password',
    severity: 'medium',
  },
];

const mockActiveSessions = [
  {
    id: 'session-1',
    userId: 'user-1',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    location: 'New York, NY',
    createdAt: new Date('2024-01-10T09:00:00Z'),
    lastActivity: new Date('2024-01-10T10:30:00Z'),
    isCurrentSession: true,
  },
  {
    id: 'session-2',
    userId: 'user-2',
    userEmail: 'user@example.com',
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0',
    location: 'San Francisco, CA',
    createdAt: new Date('2024-01-09T14:00:00Z'),
    lastActivity: new Date('2024-01-10T09:45:00Z'),
    isCurrentSession: false,
  },
];

const mockSecuritySettings = {
  maxLoginAttempts: 5,
  lockoutDuration: 300000,
  sessionTimeout: 3600000,
  requireMFA: false,
  passwordMinLength: 8,
  passwordRequireSpecial: true,
  passwordRequireNumbers: true,
  passwordRequireUppercase: true,
  loginNotifications: true,
  suspiciousActivityAlerts: true,
};

const mockSecurityStats = {
  totalLogins: 150,
  failedLogins: 12,
  activeSessions: 2,
  securityIncidents: 3,
  lastSecurityScan: new Date('2024-01-10T08:00:00Z'),
};

describe('AdminSecurity Component', () => {
  const mockQueryClient = {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  };

  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseQueryClient.mockReturnValue(mockQueryClient);
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      error: null,
    } as any);
  });

  describe('Initial Render', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockSecurityEvents,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockActiveSessions,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecuritySettings,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecurityStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should render the main security dashboard', () => {
      render(<AdminSecurity />);
      
      expect(screen.getByText('Security Overview')).toBeInTheDocument();
      expect(screen.getByText('Security Events')).toBeInTheDocument();
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
      expect(screen.getByText('Security Settings')).toBeInTheDocument();
    });

    it('should display security statistics', () => {
      render(<AdminSecurity />);
      
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Logins
      expect(screen.getByText('12')).toBeInTheDocument(); // Failed Logins
      expect(screen.getByText('2')).toBeInTheDocument(); // Active Sessions
      expect(screen.getByText('3')).toBeInTheDocument(); // Security Incidents
    });

    it('should calculate and display security score', () => {
      render(<AdminSecurity />);
      
      // Security score should be calculated based on incidents vs logins
      // Formula: Math.max(0, 100 - (incidents / (totalLogins / 100)) * 10)
      const expectedScore = Math.max(0, 100 - (3 / (150 / 100)) * 10);
      expect(screen.getByText(`${expectedScore}%`)).toBeInTheDocument();
    });
  });

  describe('Security Events', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockSecurityEvents,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockActiveSessions,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecuritySettings,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecurityStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should display security events in a table', () => {
      render(<AdminSecurity />);
      
      expect(screen.getByText('Admin user successful login')).toBeInTheDocument();
      expect(screen.getByText('Failed login attempt - invalid password')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should filter events by severity', async () => {
      render(<AdminSecurity />);
      
      const severityFilter = screen.getByDisplayValue('all');
      fireEvent.change(severityFilter, { target: { value: 'medium' } });
      
      // Should trigger a new query with the filter
      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalledWith(
          expect.arrayContaining(['securityEvents']),
          expect.any(Function),
          expect.objectContaining({
            refetchOnWindowFocus: false,
          })
        );
      });
    });

    it('should show event details modal when clicking on an event', async () => {
      render(<AdminSecurity />);
      
      const eventRow = screen.getByText('Admin user successful login').closest('tr');
      if (eventRow) {
        fireEvent.click(eventRow);
      }
      
      await waitFor(() => {
        expect(screen.getByText('Event Details')).toBeInTheDocument();
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      });
    });

    it('should refresh events when refresh button is clicked', async () => {
      render(<AdminSecurity />);
      
      const refreshButton = screen.getByText('Refresh Events');
      fireEvent.click(refreshButton);
      
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(['securityEvents']);
    });
  });

  describe('Active Sessions', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockSecurityEvents,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockActiveSessions,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecuritySettings,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecurityStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should display active sessions', () => {
      render(<AdminSecurity />);
      
      expect(screen.getByText('New York, NY')).toBeInTheDocument();
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('Current Session')).toBeInTheDocument();
    });

    it('should show session details modal when clicking on a session', async () => {
      render(<AdminSecurity />);
      
      const sessionRow = screen.getByText('admin@example.com').closest('tr');
      if (sessionRow) {
        fireEvent.click(sessionRow);
      }
      
      await waitFor(() => {
        expect(screen.getByText('Session Details')).toBeInTheDocument();
      });
    });

    it('should handle session termination', async () => {
      render(<AdminSecurity />);
      
      // Find the terminate button for a non-current session
      const terminateButtons = screen.getAllByText('Terminate');
      const nonCurrentSessionButton = terminateButtons.find(button => 
        !button.closest('tr')?.querySelector('[data-testid="current-session"]')
      );
      
      if (nonCurrentSessionButton) {
        fireEvent.click(nonCurrentSessionButton);
        
        expect(mockMutate).toHaveBeenCalledWith('session-2');
      }
    });

    it('should disable terminate button for current session', () => {
      render(<AdminSecurity />);
      
      const currentSessionRow = screen.getByText('Current Session').closest('tr');
      const terminateButton = within(currentSessionRow!).getByText('Terminate');
      
      expect(terminateButton).toBeDisabled();
    });
  });

  describe('Security Settings', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockSecurityEvents,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockActiveSessions,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecuritySettings,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecurityStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should display current security settings', () => {
      render(<AdminSecurity />);
      
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Max Login Attempts
      expect(screen.getByDisplayValue('8')).toBeInTheDocument(); // Password Min Length
    });

    it('should update security settings when form is submitted', async () => {
      render(<AdminSecurity />);
      
      const maxAttemptsInput = screen.getByDisplayValue('5');
      fireEvent.change(maxAttemptsInput, { target: { value: '10' } });
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          maxLoginAttempts: 10,
        })
      );
    });

    it('should toggle boolean settings', async () => {
      render(<AdminSecurity />);
      
      const mfaCheckbox = screen.getByRole('checkbox', { name: /require mfa/i });
      fireEvent.click(mfaCheckbox);
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          requireMFA: true,
        })
      );
    });
  });

  describe('Security Scan', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockSecurityEvents,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockActiveSessions,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecuritySettings,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecurityStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should trigger security scan when button is clicked', async () => {
      render(<AdminSecurity />);
      
      const scanButton = screen.getByText('Run Security Scan');
      fireEvent.click(scanButton);
      
      expect(mockMutate).toHaveBeenCalled();
    });

    it('should show last scan time when available', () => {
      render(<AdminSecurity />);
      
      expect(screen.getByText(/Last scan:/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when data is being fetched', () => {
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
        } as any)
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

      render(<AdminSecurity />);
      
      expect(screen.getByText('Loading security data...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when security events fail to load', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: new Error('Failed to fetch security events'),
        } as any)
        .mockReturnValueOnce({
          data: mockActiveSessions,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecuritySettings,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecurityStats,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminSecurity />);
      
      expect(screen.getByText(/Failed to load security events/)).toBeInTheDocument();
    });

    it('should handle mutation errors gracefully', async () => {
      const mockMutationWithError = jest.fn().mockImplementation(() => {
        throw new Error('Update failed');
      });

      mockUseMutation.mockReturnValue({
        mutate: mockMutationWithError,
        isLoading: false,
        error: new Error('Update failed'),
      } as any);

      mockUseQuery
        .mockReturnValueOnce({
          data: mockSecurityEvents,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockActiveSessions,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecuritySettings,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecurityStats,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminSecurity />);
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      expect(mockMutationWithError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: mockSecurityEvents,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockActiveSessions,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecuritySettings,
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockSecurityStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it('should have proper ARIA labels for form elements', () => {
      render(<AdminSecurity />);
      
      expect(screen.getByLabelText(/max login attempts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password min length/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /require mfa/i })).toBeInTheDocument();
    });

    it('should have proper table headers', () => {
      render(<AdminSecurity />);
      
      expect(screen.getByRole('columnheader', { name: /type/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /user/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /timestamp/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<AdminSecurity />);
      
      const firstInput = screen.getByDisplayValue('5');
      firstInput.focus();
      expect(firstInput).toHaveFocus();
      
      fireEvent.keyDown(firstInput, { key: 'Tab' });
      // Next focusable element should receive focus
    });
  });
});