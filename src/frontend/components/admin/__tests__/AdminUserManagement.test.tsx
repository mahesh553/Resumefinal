import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { AdminUserManagement } from "../AdminUserManagement";

// Mock the hooks
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;

// Mock data
const mockUsers = [
  {
    id: "user-1",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "user",
    isActive: true,
    createdAt: new Date("2024-01-01T10:00:00Z"),
    lastLoginAt: new Date("2024-01-10T09:30:00Z"),
    emailVerifiedAt: new Date("2024-01-01T10:30:00Z"),
  },
  {
    id: "user-2",
    email: "jane.smith@example.com",
    firstName: "Jane",
    lastName: "Smith",
    role: "admin",
    isActive: true,
    createdAt: new Date("2023-12-15T14:20:00Z"),
    lastLoginAt: new Date("2024-01-09T16:45:00Z"),
    emailVerifiedAt: new Date("2023-12-15T14:45:00Z"),
  },
  {
    id: "user-3",
    email: "inactive.user@example.com",
    firstName: "Inactive",
    lastName: "User",
    role: "user",
    isActive: false,
    createdAt: new Date("2023-11-20T08:15:00Z"),
    lastLoginAt: null,
    emailVerifiedAt: null,
  },
];

const mockUserStats = {
  total: 1250,
  active: 987,
  inactive: 263,
  admins: 12,
  verified: 1100,
  unverified: 150,
  newThisWeek: 45,
  newThisMonth: 189,
};

describe("AdminUserManagement Component", () => {
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

  describe("Initial Render", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 3, page: 1, limit: 10 },
          },
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it("should render the user management interface", () => {
      render(<AdminUserManagement />);

      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(
        screen.getByText("Manage user accounts, roles, and permissions")
      ).toBeInTheDocument();
    });

    it("should display user statistics", () => {
      render(<AdminUserManagement />);

      expect(screen.getByText("Total Users")).toBeInTheDocument();
      expect(screen.getByText("1,250")).toBeInTheDocument();
      expect(screen.getByText("Active Users")).toBeInTheDocument();
      expect(screen.getByText("987")).toBeInTheDocument();
      expect(screen.getByText("Admin Users")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("should show add user button", () => {
      render(<AdminUserManagement />);

      expect(screen.getByText("Add User")).toBeInTheDocument();
    });

    it("should display search and filter controls", () => {
      render(<AdminUserManagement />);

      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
      expect(screen.getByText("All Users")).toBeInTheDocument(); // Filter dropdown
      expect(screen.getByText("All Roles")).toBeInTheDocument(); // Role filter
    });
  });

  describe("User Table", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 3, page: 1, limit: 10 },
          },
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it("should display user data in table format", () => {
      render(<AdminUserManagement />);

      expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should show user status indicators", () => {
      render(<AdminUserManagement />);

      const activeIndicators = screen.getAllByText("Active");
      const inactiveIndicators = screen.getAllByText("Inactive");

      expect(activeIndicators.length).toBeGreaterThan(0);
      expect(inactiveIndicators.length).toBeGreaterThan(0);
    });

    it("should display user roles", () => {
      render(<AdminUserManagement />);

      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("should show verification status", () => {
      render(<AdminUserManagement />);

      const verifiedBadges = screen.getAllByText("Verified");
      const unverifiedBadges = screen.getAllByText("Unverified");

      expect(verifiedBadges.length).toBe(2);
      expect(unverifiedBadges.length).toBe(1);
    });

    it("should display formatted dates", () => {
      render(<AdminUserManagement />);

      // Should show relative dates like "3 days ago"
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it("should have action buttons for each user", () => {
      render(<AdminUserManagement />);

      const editButtons = screen.getAllByText("Edit");
      const deleteButtons = screen.getAllByText("Delete");

      expect(editButtons.length).toBe(3);
      expect(deleteButtons.length).toBe(3);
    });
  });

  describe("Search and Filter", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 3, page: 1, limit: 10 },
          },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it("should filter users by search term", async () => {
      render(<AdminUserManagement />);

      const searchInput = screen.getByPlaceholderText(/search users/i);
      fireEvent.change(searchInput, { target: { value: "john" } });

      await waitFor(() => {
        // Should trigger a new query with search parameter
        expect(mockUseQuery).toHaveBeenCalledWith(
          expect.arrayContaining(["users"]),
          expect.any(Function),
          expect.any(Object)
        );
      });
    });

    it("should filter users by status", async () => {
      render(<AdminUserManagement />);

      const statusFilter = screen.getByDisplayValue("All Users");
      fireEvent.change(statusFilter, { target: { value: "active" } });

      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalled();
      });
    });

    it("should filter users by role", async () => {
      render(<AdminUserManagement />);

      const roleFilter = screen.getByDisplayValue("All Roles");
      fireEvent.change(roleFilter, { target: { value: "admin" } });

      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalled();
      });
    });

    it("should clear search when clear button is clicked", async () => {
      render(<AdminUserManagement />);

      const searchInput = screen.getByPlaceholderText(/search users/i);
      fireEvent.change(searchInput, { target: { value: "test" } });

      const clearButton = screen.getByText("Clear");
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue("");
    });
  });

  describe("User Actions", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 3, page: 1, limit: 10 },
          },
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it("should open add user modal when add button is clicked", async () => {
      render(<AdminUserManagement />);

      const addButton = screen.getByText("Add User");
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("Add New User")).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      });
    });

    it("should open edit user modal when edit button is clicked", async () => {
      render(<AdminUserManagement />);

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument();
        expect(
          screen.getByDisplayValue("john.doe@example.com")
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
      });
    });

    it("should handle user creation", async () => {
      render(<AdminUserManagement />);

      const addButton = screen.getByText("Add User");
      fireEvent.click(addButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        const firstNameInput = screen.getByLabelText(/first name/i);
        const lastNameInput = screen.getByLabelText(/last name/i);

        fireEvent.change(emailInput, {
          target: { value: "new.user@example.com" },
        });
        fireEvent.change(firstNameInput, { target: { value: "New" } });
        fireEvent.change(lastNameInput, { target: { value: "User" } });

        const createButton = screen.getByText("Create User");
        fireEvent.click(createButton);

        expect(mockMutate).toHaveBeenCalledWith({
          email: "new.user@example.com",
          firstName: "New",
          lastName: "User",
          role: "user", // Default role
        });
      });
    });

    it("should handle user update", async () => {
      render(<AdminUserManagement />);

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const firstNameInput = screen.getByDisplayValue("John");
        fireEvent.change(firstNameInput, { target: { value: "Johnny" } });

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        expect(mockMutate).toHaveBeenCalledWith({
          id: "user-1",
          firstName: "Johnny",
          lastName: "Doe",
          email: "john.doe@example.com",
          role: "user",
          isActive: true,
        });
      });
    });

    it("should confirm user deletion", async () => {
      render(<AdminUserManagement />);

      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Delete User")).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to delete/)
        ).toBeInTheDocument();
      });

      const confirmButton = screen.getByText("Delete");
      fireEvent.click(confirmButton);

      expect(mockMutate).toHaveBeenCalledWith("user-1");
    });

    it("should toggle user status", async () => {
      render(<AdminUserManagement />);

      // Find the toggle button for an active user
      const userRow = screen.getByText("john.doe@example.com").closest("tr");
      const toggleButton = within(userRow!).getByText("Deactivate");

      fireEvent.click(toggleButton);

      expect(mockMutate).toHaveBeenCalledWith({
        id: "user-1",
        isActive: false,
      });
    });

    it("should change user role", async () => {
      render(<AdminUserManagement />);

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const roleSelect = screen.getByDisplayValue("user");
        fireEvent.change(roleSelect, { target: { value: "admin" } });

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            role: "admin",
          })
        );
      });
    });
  });

  describe("Pagination", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 100, page: 1, limit: 10, totalPages: 10 },
          },
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it("should display pagination controls", () => {
      render(<AdminUserManagement />);

      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument(); // Current page
    });

    it("should handle page navigation", async () => {
      render(<AdminUserManagement />);

      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalledWith(
          expect.arrayContaining(["users"]),
          expect.any(Function),
          expect.objectContaining({
            queryKey: expect.arrayContaining([
              expect.objectContaining({ page: 2 }),
            ]),
          })
        );
      });
    });

    it("should change items per page", async () => {
      render(<AdminUserManagement />);

      const itemsPerPageSelect = screen.getByDisplayValue("10");
      fireEvent.change(itemsPerPageSelect, { target: { value: "25" } });

      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalledWith(
          expect.arrayContaining(["users"]),
          expect.any(Function),
          expect.objectContaining({
            queryKey: expect.arrayContaining([
              expect.objectContaining({ limit: 25 }),
            ]),
          })
        );
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading state when fetching users", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: null,
          isLoading: true,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminUserManagement />);

      expect(screen.getByText("Loading users...")).toBeInTheDocument();
    });

    it("should show skeleton loaders for user table", () => {
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

      render(<AdminUserManagement />);

      const skeletonRows = screen.getAllByTestId("user-skeleton");
      expect(skeletonRows.length).toBeGreaterThan(0);
    });

    it("should disable actions during mutations", () => {
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isLoading: true,
        error: null,
      } as any);

      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 3, page: 1, limit: 10 },
          },
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminUserManagement />);

      const editButtons = screen.getAllByText("Edit");
      expect(editButtons[0]).toBeDisabled();
    });
  });

  describe("Error Handling", () => {
    it("should display error message when users fail to load", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: new Error("Failed to fetch users"),
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminUserManagement />);

      expect(screen.getByText(/Failed to load users/)).toBeInTheDocument();
    });

    it("should handle validation errors in user form", async () => {
      render(<AdminUserManagement />);

      const addButton = screen.getByText("Add User");
      fireEvent.click(addButton);

      await waitFor(() => {
        const createButton = screen.getByText("Create User");
        fireEvent.click(createButton); // Submit empty form

        expect(screen.getByText(/Email is required/)).toBeInTheDocument();
        expect(screen.getByText(/First name is required/)).toBeInTheDocument();
        expect(screen.getByText(/Last name is required/)).toBeInTheDocument();
      });
    });

    it("should display mutation errors", async () => {
      const mockMutationWithError = jest
        .fn()
        .mockRejectedValue(new Error("Email already exists"));

      mockUseMutation.mockReturnValue({
        mutate: mockMutationWithError,
        isLoading: false,
        error: new Error("Email already exists"),
      } as any);

      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 3, page: 1, limit: 10 },
          },
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);

      render(<AdminUserManagement />);

      expect(screen.getByText(/Email already exists/)).toBeInTheDocument();
    });
  });

  describe("Bulk Actions", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 3, page: 1, limit: 10 },
          },
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it("should allow selecting multiple users", () => {
      render(<AdminUserManagement />);

      const selectAllCheckbox = screen.getByRole("checkbox", {
        name: /select all/i,
      });
      fireEvent.click(selectAllCheckbox);

      const userCheckboxes = screen.getAllByRole("checkbox");
      // Should select all user checkboxes (excluding the select all checkbox)
      expect(userCheckboxes.filter((cb) => cb.checked).length).toBe(
        userCheckboxes.length
      );
    });

    it("should show bulk action menu when users are selected", async () => {
      render(<AdminUserManagement />);

      const userCheckboxes = screen.getAllByRole("checkbox");
      fireEvent.click(userCheckboxes[1]); // Select first user

      await waitFor(() => {
        expect(screen.getByText("Bulk Actions")).toBeInTheDocument();
        expect(screen.getByText("Delete Selected")).toBeInTheDocument();
        expect(screen.getByText("Activate Selected")).toBeInTheDocument();
        expect(screen.getByText("Deactivate Selected")).toBeInTheDocument();
      });
    });

    it("should handle bulk deletion", async () => {
      render(<AdminUserManagement />);

      const userCheckboxes = screen.getAllByRole("checkbox");
      fireEvent.click(userCheckboxes[1]); // Select first user
      fireEvent.click(userCheckboxes[2]); // Select second user

      const bulkDeleteButton = screen.getByText("Delete Selected");
      fireEvent.click(bulkDeleteButton);

      await waitFor(() => {
        expect(screen.getByText(/delete 2 users/)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText("Delete Users");
      fireEvent.click(confirmButton);

      expect(mockMutate).toHaveBeenCalledWith(["user-1", "user-2"]);
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            users: mockUsers,
            pagination: { total: 3, page: 1, limit: 10 },
          },
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: mockUserStats,
          isLoading: false,
          error: null,
        } as any);
    });

    it("should have proper ARIA labels for form elements", () => {
      render(<AdminUserManagement />);

      expect(screen.getByLabelText(/search users/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by role/i)).toBeInTheDocument();
    });

    it("should have accessible table headers", () => {
      render(<AdminUserManagement />);

      expect(
        screen.getByRole("columnheader", { name: /name/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /email/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /role/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /status/i })
      ).toBeInTheDocument();
    });

    it("should support keyboard navigation in forms", async () => {
      render(<AdminUserManagement />);

      const addButton = screen.getByText("Add User");
      fireEvent.click(addButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        emailInput.focus();
        expect(emailInput).toHaveFocus();

        fireEvent.keyDown(emailInput, { key: "Tab" });
        const firstNameInput = screen.getByLabelText(/first name/i);
        expect(firstNameInput).toHaveFocus();
      });
    });

    it("should announce status changes to screen readers", () => {
      render(<AdminUserManagement />);

      const statusRegion = screen.getByRole("status");
      expect(statusRegion).toBeInTheDocument();
    });
  });
});
