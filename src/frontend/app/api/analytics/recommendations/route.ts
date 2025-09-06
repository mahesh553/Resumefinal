import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // skill, industry, timing, format

    // Make request to backend API to get AI recommendations
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${backendUrl}/analytics/recommendations?type=${type}`,
      {
        method: "GET",
        headers: {
          Authorization: request.headers.get("Authorization") || "",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to fetch recommendations" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: "Recommendations retrieved successfully",
      data: data,
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching recommendations" },
      { status: 500 }
    );
  }
}
