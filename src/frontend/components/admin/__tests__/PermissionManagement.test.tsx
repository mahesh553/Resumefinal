import { permissionApi } from "@/lib/permissionApi";
import type { Permission } from "@/types/permissions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { PermissionManagement } from "../PermissionManagement";
// Mock functions for Jest
const mockFn = jest.fn;
const vi = { fn: mockFn, clearAllMocks: jest.clearAllMocks };

// Export Jest globals
export { beforeEach, describe, expect, it } from "@jest/globals";

// Mock the permission API
jest.mock("@/lib/permissionApi", () => ({
  permissionApi: {
    getPermissions: jest.fn(),
    createPermission: jest.fn(),
    updatePermission: jest.fn(),
    deletePermission: jest.fn(),
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
  {
    id: "3",
    action: "delete",
    resource: "user",
    name: "Delete User",
    description: "Allows deleting users",
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

describe("PermissionManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (permissionApi.getPermissions as any).mockResolvedValue(mockPermissions);
  });

  it("renders permission management interface", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    expect(screen.getByText("Permission Management")).toBeInTheDocument();
    expect(
      screen.getByText("Manage system permissions and access controls")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search permissions...")
    ).toBeInTheDocument();
    expect(screen.getByText("Add Permission")).toBeInTheDocument();
  });

  it("displays permissions in a table", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
      expect(screen.getByText("Access Admin Panel")).toBeInTheDocument();
      expect(screen.getByText("Delete User")).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText("Permission")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Resource")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("filters permissions by search term", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search permissions...");
    fireEvent.change(searchInput, { target: { value: "Admin" } });

    await waitFor(() => {
      expect(screen.getByText("Access Admin Panel")).toBeInTheDocument();
      expect(screen.queryByText("Create User")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete User")).not.toBeInTheDocument();
    });
  });

  it("filters permissions by action", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    const actionFilter = screen.getByDisplayValue("All Actions");
    fireEvent.change(actionFilter, { target: { value: "create" } });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
      expect(screen.queryByText("Access Admin Panel")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete User")).not.toBeInTheDocument();
    });
  });

  it("filters permissions by status", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue("All Status");
    fireEvent.change(statusFilter, { target: { value: "false" } });

    await waitFor(() => {
      expect(screen.getByText("Delete User")).toBeInTheDocument();
      expect(screen.queryByText("Create User")).not.toBeInTheDocument();
      expect(screen.queryByText("Access Admin Panel")).not.toBeInTheDocument();
    });
  });

  it("opens create permission modal", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    const addButton = screen.getByText("Add Permission");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Permission")).toBeInTheDocument();
      expect(screen.getByLabelText("Action")).toBeInTheDocument();
      expect(screen.getByLabelText("Resource")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });
  });

  it("validates create permission form", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    const addButton = screen.getByText("Add Permission");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Permission")).toBeInTheDocument();
    });

    const createButton = screen.getByText("Create Permission");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Action is required")).toBeInTheDocument();
      expect(screen.getByText("Resource is required")).toBeInTheDocument();
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("creates a new permission", async () => {
    const newPermission = {
      id: "4",
      action: "update",
      resource: "user",
      name: "Update User",
      description: "Allows updating user information",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (permissionApi.createPermission as any).mockResolvedValue(newPermission);

    render(<PermissionManagement />, { wrapper: createWrapper() });

    const addButton = screen.getByText("Add Permission");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Permission")).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText("Action"), {
      target: { value: "update" },
    });
    fireEvent.change(screen.getByLabelText("Resource"), {
      target: { value: "user" },
    });
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Update User" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Allows updating user information" },
    });

    const createButton = screen.getByText("Create Permission");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(permissionApi.createPermission).toHaveBeenCalledWith({
        action: "update",
        resource: "user",
        name: "Update User",
        description: "Allows updating user information",
        isActive: true,
      });
    });
  });

  it("opens edit permission modal", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId("pencil-icon");
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Edit Permission")).toBeInTheDocument();
      expect(screen.getByDisplayValue("create")).toBeInTheDocument();
      expect(screen.getByDisplayValue("user")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Create User")).toBeInTheDocument();
    });
  });

  it("updates a permission", async () => {
    (permissionApi.updatePermission as any).mockResolvedValue({});

    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId("pencil-icon");
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Edit Permission")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Create User");
    fireEvent.change(nameInput, { target: { value: "Create New User" } });

    const updateButton = screen.getByText("Update Permission");
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(permissionApi.updatePermission).toHaveBeenCalledWith("1", {
        name: "Create New User",
        description: "Allows creating new users",
        isActive: true,
      });
    });
  });

  it("opens delete confirmation modal", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId("trash-icon");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete Permission")).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete the permission/)
      ).toBeInTheDocument();
      expect(
        screen.getByText("Create User", { selector: "strong" })
      ).toBeInTheDocument();
    });
  });

  it("deletes a permission", async () => {
    (permissionApi.deletePermission as any).mockResolvedValue({});

    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId("trash-icon");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete Permission")).toBeInTheDocument();
    });

    const confirmDeleteButton = screen.getByText("Delete Permission");
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(permissionApi.deletePermission).toHaveBeenCalledWith("1");
    });
  });

  it("displays loading state", () => {
    (permissionApi.getPermissions as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<PermissionManagement />, { wrapper: createWrapper() });

    expect(screen.getByText("Loading permissions...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("displays error state", async () => {
    (permissionApi.getPermissions as any).mockRejectedValue(
      new Error("Failed to fetch")
    );

    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load permissions")
      ).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("displays empty state when no permissions found", async () => {
    (permissionApi.getPermissions as any).mockResolvedValue([]);

    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No permissions found")).toBeInTheDocument();
    });
  });

  it("shows correct badge colors for actions", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    // Check that action badges are rendered
    const createBadge = screen.getByText("create");
    const readBadge = screen.getByText("read");
    const deleteBadge = screen.getByText("delete");

    expect(createBadge).toHaveClass("bg-green-100", "text-green-800");
    expect(readBadge).toHaveClass("bg-blue-100", "text-blue-800");
    expect(deleteBadge).toHaveClass("bg-red-100", "text-red-800");
  });

  it("shows correct status badges", async () => {
    render(<PermissionManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    const activeBadges = screen.getAllByText("Active");
    const inactiveBadge = screen.getByText("Inactive");

    expect(activeBadges[0]).toHaveClass("bg-green-100", "text-green-800");
    expect(inactiveBadge).toHaveClass("bg-red-100", "text-red-800");
  });
});
