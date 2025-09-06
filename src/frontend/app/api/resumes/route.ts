import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Make request to backend API to get user's resumes
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/resumes`, {
      method: "GET",
      headers: {
        Authorization: request.headers.get("Authorization") || "",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to fetch resumes" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: "Resumes retrieved successfully",
      data: data,
    });
  } catch (error) {
    console.error("Get resumes error:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching resumes" },
      { status: 500 }
    );
  }
}
