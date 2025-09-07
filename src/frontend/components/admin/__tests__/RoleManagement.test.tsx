import { permissionApi } from "@/lib/permissionApi";
import type { Permission, Role, UserWithRole } from "@/types/permissions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { RoleManagement } from "../RoleManagement";
// Mock functions for Jest
const mockFn = jest.fn;
const vi = { fn: mockFn, clearAllMocks: jest.clearAllMocks };

// Export Jest globals
export { beforeEach, describe, expect, it } from "@jest/globals";

// Mock the permission API
jest.mock("@/lib/permissionApi", () => ({
  permissionApi: {
    getRoles: jest.fn(),
    getPermissions: jest.fn(),
    getRoleUsers: jest.fn(),
    createRole: jest.fn(),
    updateRole: jest.fn(),
    deleteRole: jest.fn(),
    updateRolePermissions: jest.fn(),
  },
}));

// Mock the toast notifications
jest.mock("@/components/ui/Toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  PlusIcon: () => <div data-testid="plus-icon" />,
  PencilIcon: () => <div data-testid="pencil-icon" />,
  TrashIcon: () => <div data-testid="trash-icon" />,
  MagnifyingGlassIcon: () => <div data-testid="search-icon" />,
  KeyIcon: () => <div data-testid="key-icon" />,
  UsersIcon: () => <div data-testid="users-icon" />,
}));

const mockPermissions: Permission[] = [
  {
    id: "1",
    action: "create",
    resource: "user",
    name: "Create User",
    description: "Allows creating new users",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    action: "read",
    resource: "admin_panel",
    name: "Access Admin Panel",
    description: "Allows access to admin panel",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockRoles: Role[] = [
  {
    id: "1",
    name: "admin",
    displayName: "Administrator",
    description: "Full system access",
    type: "admin",
    scope: "global",
    isActive: true,
    isDefault: false,
    isSystemRole: true,
    priority: 100,
    permissions: mockPermissions,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "moderator",
    displayName: "Content Moderator",
    description: "Can moderate content",
    type: "moderator",
    scope: "organization",
    isActive: true,
    isDefault: false,
    isSystemRole: false,
    priority: 50,
    permissions: [mockPermissions[1]],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "user",
    displayName: "Regular User",
    description: "Basic user access",
    type: "user",
    scope: "global",
    isActive: true,
    isDefault: true,
    isSystemRole: true,
    priority: 10,
    permissions: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockUsers: UserWithRole[] = [
  {
    id: "1",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    isActive: true,
    role: "admin",
    createdAt: new Date().toISOString(),
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("RoleManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (permissionApi.getRoles as any).mockResolvedValue(mockRoles);
    (permissionApi.getPermissions as any).mockResolvedValue(mockPermissions);
    (permissionApi.getRoleUsers as any).mockResolvedValue(mockUsers);
  });

  it("renders role management interface", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    expect(screen.getByText("Role Management")).toBeInTheDocument();
    expect(
      screen.getByText("Manage user roles and their permissions")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search roles...")).toBeInTheDocument();
    expect(screen.getByText("Add Role")).toBeInTheDocument();
  });

  it("displays roles in a table", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
      expect(screen.getByText("Content Moderator")).toBeInTheDocument();
      expect(screen.getByText("Regular User")).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Scope")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Permissions")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("shows role details correctly", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    // Check role details
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("Full system access")).toBeInTheDocument();
    expect(screen.getByText("2 permissions")).toBeInTheDocument();
    expect(screen.getByText("System Role")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("filters roles by search term", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search roles...");
    fireEvent.change(searchInput, { target: { value: "Moderator" } });

    await waitFor(() => {
      expect(screen.getByText("Content Moderator")).toBeInTheDocument();
      expect(screen.queryByText("Administrator")).not.toBeInTheDocument();
      expect(screen.queryByText("Regular User")).not.toBeInTheDocument();
    });
  });

  it("filters roles by type", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const typeFilter = screen.getByDisplayValue("All Types");
    fireEvent.change(typeFilter, { target: { value: "admin" } });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
      expect(screen.queryByText("Content Moderator")).not.toBeInTheDocument();
      expect(screen.queryByText("Regular User")).not.toBeInTheDocument();
    });
  });

  it("filters roles by scope", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Content Moderator")).toBeInTheDocument();
    });

    const scopeFilter = screen.getByDisplayValue("All Scopes");
    fireEvent.change(scopeFilter, { target: { value: "organization" } });

    await waitFor(() => {
      expect(screen.getByText("Content Moderator")).toBeInTheDocument();
      expect(screen.queryByText("Administrator")).not.toBeInTheDocument();
      expect(screen.queryByText("Regular User")).not.toBeInTheDocument();
    });
  });

  it("opens create role modal", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    const addButton = screen.getByText("Add Role");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Role")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Type")).toBeInTheDocument();
      expect(screen.getByLabelText("Scope")).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });
  });

  it("validates create role form", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    const addButton = screen.getByText("Add Role");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Role")).toBeInTheDocument();
    });

    const createButton = screen.getByText("Create Role");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Display name is required")).toBeInTheDocument();
    });
  });

  it("validates role name format", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    const addButton = screen.getByText("Add Role");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Role")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, {
      target: { value: "invalid name with spaces" },
    });

    const createButton = screen.getByText("Create Role");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Name must contain only letters, numbers, underscores, and hyphens"
        )
      ).toBeInTheDocument();
    });
  });

  it("creates a new role", async () => {
    const newRole = {
      id: "4",
      name: "editor",
      displayName: "Content Editor",
      description: "Can edit content",
      type: "custom",
      scope: "global",
      isActive: true,
      isDefault: false,
      isSystemRole: false,
      priority: 30,
      permissions: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (permissionApi.createRole as any).mockResolvedValue(newRole);

    render(<RoleManagement />, { wrapper: createWrapper() });

    const addButton = screen.getByText("Add Role");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Role")).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "editor" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Content Editor" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Can edit content" },
    });

    const createButton = screen.getByText("Create Role");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(permissionApi.createRole).toHaveBeenCalledWith({
        name: "editor",
        displayName: "Content Editor",
        description: "Can edit content",
        type: "custom",
        scope: "global",
        isActive: true,
        isDefault: false,
        priority: 0,
      });
    });
  });

  it("opens edit role modal", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId("pencil-icon");
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Edit Role")).toBeInTheDocument();
      expect(screen.getByDisplayValue("admin")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Administrator")).toBeInTheDocument();
    });
  });

  it("opens permissions management modal", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const permissionButtons = screen.getAllByTestId("key-icon");
    fireEvent.click(permissionButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Manage Permissions - Administrator")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Currently has 2 permissions")
      ).toBeInTheDocument();
    });
  });

  it("opens users view modal", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const usersButtons = screen.getAllByTestId("users-icon");
    fireEvent.click(usersButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Users with Role: Administrator")
      ).toBeInTheDocument();
      expect(screen.getByText("Admin User")).toBeInTheDocument();
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    });
  });

  it("manages role permissions", async () => {
    (permissionApi.updateRolePermissions as any).mockResolvedValue({});

    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const permissionButtons = screen.getAllByTestId("key-icon");
    fireEvent.click(permissionButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Manage Permissions - Administrator")
      ).toBeInTheDocument();
    });

    // Toggle a permission
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    const updateButton = screen.getByText("Update Permissions");
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(permissionApi.updateRolePermissions).toHaveBeenCalled();
    });
  });

  it("does not show delete button for system roles", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const firstRowActions = screen.getAllByTestId("trash-icon");
    // System roles should not have delete buttons, so there should be fewer delete buttons than total roles
    expect(firstRowActions.length).toBeLessThan(mockRoles.length);
  });

  it("opens delete confirmation modal for non-system roles", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Content Moderator")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId("trash-icon");
    fireEvent.click(deleteButtons[0]); // Click on moderator role delete button

    await waitFor(() => {
      expect(screen.getByText("Delete Role")).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete the role/)
      ).toBeInTheDocument();
    });
  });

  it("deletes a role", async () => {
    (permissionApi.deleteRole as any).mockResolvedValue({});

    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Content Moderator")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId("trash-icon");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete Role")).toBeInTheDocument();
    });

    const confirmDeleteButton = screen.getByText("Delete Role");
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(permissionApi.deleteRole).toHaveBeenCalledWith("2");
    });
  });

  it("shows correct badge colors for role types", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const adminBadge = screen.getByText("admin");
    const moderatorBadge = screen.getByText("moderator");
    const userBadge = screen.getByText("user");

    expect(adminBadge).toHaveClass("bg-purple-100", "text-purple-800");
    expect(moderatorBadge).toHaveClass("bg-blue-100", "text-blue-800");
    expect(userBadge).toHaveClass("bg-green-100", "text-green-800");
  });

  it("shows correct badge colors for scopes", async () => {
    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    const globalBadges = screen.getAllByText("global");
    const organizationBadge = screen.getByText("organization");

    expect(globalBadges[0]).toHaveClass("bg-indigo-100", "text-indigo-800");
    expect(organizationBadge).toHaveClass("bg-teal-100", "text-teal-800");
  });

  it("displays loading state", () => {
    (permissionApi.getRoles as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<RoleManagement />, { wrapper: createWrapper() });

    expect(screen.getByText("Loading roles...")).toBeInTheDocument();
  });

  it("displays error state", async () => {
    (permissionApi.getRoles as any).mockRejectedValue(
      new Error("Failed to fetch")
    );

    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Failed to load roles")).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("displays empty state when no roles found", async () => {
    (permissionApi.getRoles as any).mockResolvedValue([]);

    render(<RoleManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No roles found")).toBeInTheDocument();
    });
  });
});
