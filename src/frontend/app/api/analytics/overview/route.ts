import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";

    // Make request to backend API to get analytics data
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
    const response = await fetch(
      `${backendUrl}/analytics/overview?timeRange=${timeRange}`,
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
        { message: data.message || "Failed to fetch analytics data" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: "Analytics data retrieved successfully",
      data: data,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching analytics data" },
      { status: 500 }
    );
  }
}
