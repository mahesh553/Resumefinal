import { fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/router";
import { AdminSidebar } from "../AdminSidebar";

// Mock next/router
const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("AdminSidebar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
      pathname: "/admin",
      route: "/admin",
      query: {},
      asPath: "/admin",
      replace: jest.fn(),
      reload: jest.fn(),
      prefetch: jest.fn(),
    } as any);
  });

  describe("Initial Render", () => {
    it("should render the sidebar with logo and navigation", () => {
      render(<AdminSidebar />);

      expect(screen.getByText("QoderResume")).toBeInTheDocument();
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    it("should display all navigation items", () => {
      render(<AdminSidebar />);

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("Analytics")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.getByText("Security")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();
    });

    it("should have proper navigation icons", () => {
      render(<AdminSidebar />);

      const dashboardIcon = screen.getByTestId("dashboard-icon");
      const usersIcon = screen.getByTestId("users-icon");
      const analyticsIcon = screen.getByTestId("analytics-icon");
      const systemIcon = screen.getByTestId("system-icon");
      const securityIcon = screen.getByTestId("security-icon");
      const settingsIcon = screen.getByTestId("settings-icon");
      const reportsIcon = screen.getByTestId("reports-icon");

      expect(dashboardIcon).toBeInTheDocument();
      expect(usersIcon).toBeInTheDocument();
      expect(analyticsIcon).toBeInTheDocument();
      expect(systemIcon).toBeInTheDocument();
      expect(securityIcon).toBeInTheDocument();
      expect(settingsIcon).toBeInTheDocument();
      expect(reportsIcon).toBeInTheDocument();
    });
  });

  describe("Navigation Behavior", () => {
    it("should highlight the active navigation item", () => {
      mockUseRouter.mockReturnValue({
        ...mockUseRouter(),
        pathname: "/admin/users",
      } as any);

      render(<AdminSidebar />);

      const usersNavItem = screen.getByText("Users").closest("li");
      expect(usersNavItem).toHaveClass("active");
    });

    it("should navigate to dashboard when clicked", () => {
      render(<AdminSidebar />);

      const dashboardLink = screen.getByText("Dashboard");
      fireEvent.click(dashboardLink);

      expect(mockPush).toHaveBeenCalledWith("/admin");
    });

    it("should navigate to users page when clicked", () => {
      render(<AdminSidebar />);

      const usersLink = screen.getByText("Users");
      fireEvent.click(usersLink);

      expect(mockPush).toHaveBeenCalledWith("/admin/users");
    });

    it("should navigate to analytics page when clicked", () => {
      render(<AdminSidebar />);

      const analyticsLink = screen.getByText("Analytics");
      fireEvent.click(analyticsLink);

      expect(mockPush).toHaveBeenCalledWith("/admin/analytics");
    });

    it("should navigate to system monitoring page when clicked", () => {
      render(<AdminSidebar />);

      const systemLink = screen.getByText("System");
      fireEvent.click(systemLink);

      expect(mockPush).toHaveBeenCalledWith("/admin/system");
    });

    it("should navigate to security page when clicked", () => {
      render(<AdminSidebar />);

      const securityLink = screen.getByText("Security");
      fireEvent.click(securityLink);

      expect(mockPush).toHaveBeenCalledWith("/admin/security");
    });

    it("should navigate to settings page when clicked", () => {
      render(<AdminSidebar />);

      const settingsLink = screen.getByText("Settings");
      fireEvent.click(settingsLink);

      expect(mockPush).toHaveBeenCalledWith("/admin/settings");
    });

    it("should navigate to reports page when clicked", () => {
      render(<AdminSidebar />);

      const reportsLink = screen.getByText("Reports");
      fireEvent.click(reportsLink);

      expect(mockPush).toHaveBeenCalledWith("/admin/reports");
    });
  });

  describe("Active State Detection", () => {
    const testCases = [
      { pathname: "/admin", expectedActive: "Dashboard" },
      { pathname: "/admin/users", expectedActive: "Users" },
      { pathname: "/admin/analytics", expectedActive: "Analytics" },
      { pathname: "/admin/system", expectedActive: "System" },
      { pathname: "/admin/security", expectedActive: "Security" },
      { pathname: "/admin/settings", expectedActive: "Settings" },
      { pathname: "/admin/reports", expectedActive: "Reports" },
    ];

    testCases.forEach(({ pathname, expectedActive }) => {
      it(`should highlight ${expectedActive} when on ${pathname}`, () => {
        mockUseRouter.mockReturnValue({
          ...mockUseRouter(),
          pathname,
        } as any);

        render(<AdminSidebar />);

        const activeNavItem = screen.getByText(expectedActive).closest("li");
        expect(activeNavItem).toHaveClass("active");
      });
    });

    it("should handle nested routes correctly", () => {
      mockUseRouter.mockReturnValue({
        ...mockUseRouter(),
        pathname: "/admin/users/123/edit",
      } as any);

      render(<AdminSidebar />);

      const usersNavItem = screen.getByText("Users").closest("li");
      expect(usersNavItem).toHaveClass("active");
    });
  });

  describe("Responsive Behavior", () => {
    it("should be collapsible on mobile", () => {
      render(<AdminSidebar />);

      const sidebar = screen.getByTestId("admin-sidebar");
      expect(sidebar).toHaveClass("sidebar-collapsed"); // Initially collapsed on mobile
    });

    it("should have toggle button for mobile", () => {
      render(<AdminSidebar />);

      const toggleButton = screen.getByRole("button", {
        name: /toggle sidebar/i,
      });
      expect(toggleButton).toBeInTheDocument();
    });

    it("should expand sidebar when toggle is clicked", () => {
      render(<AdminSidebar />);

      const toggleButton = screen.getByRole("button", {
        name: /toggle sidebar/i,
      });
      const sidebar = screen.getByTestId("admin-sidebar");

      fireEvent.click(toggleButton);
      expect(sidebar).toHaveClass("sidebar-expanded");

      fireEvent.click(toggleButton);
      expect(sidebar).toHaveClass("sidebar-collapsed");
    });

    it("should show tooltips when collapsed", () => {
      render(<AdminSidebar />);

      // Simulate collapsed state
      const sidebar = screen.getByTestId("admin-sidebar");
      fireEvent.mouseEnter(sidebar);

      const dashboardLink = screen.getByText("Dashboard");
      fireEvent.mouseEnter(dashboardLink);

      expect(
        screen.getByRole("tooltip", { name: /dashboard/i })
      ).toBeInTheDocument();
    });
  });

  describe("User Profile Section", () => {
    it("should display admin user profile", () => {
      render(<AdminSidebar />);

      expect(screen.getByText("Admin User")).toBeInTheDocument();
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    it("should have profile dropdown", () => {
      render(<AdminSidebar />);

      const profileButton = screen.getByRole("button", { name: /admin user/i });
      fireEvent.click(profileButton);

      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    it("should handle logout action", () => {
      render(<AdminSidebar />);

      const profileButton = screen.getByRole("button", { name: /admin user/i });
      fireEvent.click(profileButton);

      const logoutButton = screen.getByText("Logout");
      fireEvent.click(logoutButton);

      // Should navigate to logout route or call logout function
      expect(mockPush).toHaveBeenCalledWith("/logout");
    });
  });

  describe("System Status Indicator", () => {
    it("should display system status", () => {
      render(<AdminSidebar />);

      expect(screen.getByTestId("system-status")).toBeInTheDocument();
    });

    it("should show healthy status", () => {
      render(<AdminSidebar />);

      const statusIndicator = screen.getByTestId("system-status");
      expect(statusIndicator).toHaveClass("status-healthy");
      expect(screen.getByText("System Online")).toBeInTheDocument();
    });

    it("should show warning status when provided", () => {
      // Mock props for warning status
      render(<AdminSidebar systemStatus="warning" />);

      const statusIndicator = screen.getByTestId("system-status");
      expect(statusIndicator).toHaveClass("status-warning");
      expect(screen.getByText("System Warning")).toBeInTheDocument();
    });

    it("should show critical status when provided", () => {
      // Mock props for critical status
      render(<AdminSidebar systemStatus="critical" />);

      const statusIndicator = screen.getByTestId("system-status");
      expect(statusIndicator).toHaveClass("status-critical");
      expect(screen.getByText("System Critical")).toBeInTheDocument();
    });
  });

  describe("Badge Notifications", () => {
    it("should display notification badges", () => {
      render(<AdminSidebar />);

      // Should show notification count for relevant sections
      const usersBadge = screen.getByText("3"); // 3 new user registrations
      const systemBadge = screen.getByText("1"); // 1 system alert

      expect(usersBadge).toBeInTheDocument();
      expect(systemBadge).toBeInTheDocument();
    });

    it("should update badge counts dynamically", () => {
      const { rerender } = render(
        <AdminSidebar notifications={{ users: 3, system: 1 }} />
      );

      expect(screen.getByText("3")).toBeInTheDocument();

      // Update notifications
      rerender(<AdminSidebar notifications={{ users: 5, system: 2 }} />);

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should hide badges when count is zero", () => {
      render(<AdminSidebar notifications={{ users: 0, system: 0 }} />);

      const usersBadge = screen.queryByTestId("users-badge");
      const systemBadge = screen.queryByTestId("system-badge");

      expect(usersBadge).not.toBeInTheDocument();
      expect(systemBadge).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should support keyboard navigation through menu items", () => {
      render(<AdminSidebar />);

      const dashboardLink = screen.getByText("Dashboard");
      dashboardLink.focus();
      expect(dashboardLink).toHaveFocus();

      // Tab to next item
      fireEvent.keyDown(dashboardLink, { key: "Tab" });
      const usersLink = screen.getByText("Users");
      expect(usersLink).toHaveFocus();
    });

    it("should activate navigation items with Enter key", () => {
      render(<AdminSidebar />);

      const usersLink = screen.getByText("Users");
      usersLink.focus();
      fireEvent.keyDown(usersLink, { key: "Enter" });

      expect(mockPush).toHaveBeenCalledWith("/admin/users");
    });

    it("should activate navigation items with Space key", () => {
      render(<AdminSidebar />);

      const analyticsLink = screen.getByText("Analytics");
      analyticsLink.focus();
      fireEvent.keyDown(analyticsLink, { key: " " });

      expect(mockPush).toHaveBeenCalledWith("/admin/analytics");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<AdminSidebar />);

      expect(
        screen.getByRole("navigation", { name: /admin navigation/i })
      ).toBeInTheDocument();
    });

    it("should have accessible navigation links", () => {
      render(<AdminSidebar />);

      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      const usersLink = screen.getByRole("link", { name: /users/i });
      const analyticsLink = screen.getByRole("link", { name: /analytics/i });

      expect(dashboardLink).toBeInTheDocument();
      expect(usersLink).toBeInTheDocument();
      expect(analyticsLink).toBeInTheDocument();
    });

    it("should indicate current page to screen readers", () => {
      mockUseRouter.mockReturnValue({
        ...mockUseRouter(),
        pathname: "/admin/users",
      } as any);

      render(<AdminSidebar />);

      const usersLink = screen.getByRole("link", { name: /users/i });
      expect(usersLink).toHaveAttribute("aria-current", "page");
    });

    it("should have proper heading structure", () => {
      render(<AdminSidebar />);

      expect(
        screen.getByRole("heading", { level: 2, name: /qoderresume/i })
      ).toBeInTheDocument();
    });

    it("should support high contrast mode", () => {
      render(<AdminSidebar />);

      const sidebar = screen.getByTestId("admin-sidebar");
      expect(sidebar).toHaveClass("high-contrast-ready");
    });
  });

  describe("Theme Support", () => {
    it("should support light theme", () => {
      render(<AdminSidebar theme="light" />);

      const sidebar = screen.getByTestId("admin-sidebar");
      expect(sidebar).toHaveClass("theme-light");
    });

    it("should support dark theme", () => {
      render(<AdminSidebar theme="dark" />);

      const sidebar = screen.getByTestId("admin-sidebar");
      expect(sidebar).toHaveClass("theme-dark");
    });

    it("should default to system theme", () => {
      render(<AdminSidebar />);

      const sidebar = screen.getByTestId("admin-sidebar");
      expect(sidebar).toHaveClass("theme-auto");
    });
  });
});
