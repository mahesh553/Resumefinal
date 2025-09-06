import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, resumeId } = await request.json();

    if (!jobDescription || !resumeId) {
      return NextResponse.json(
        { message: "Job description and resume ID are required" },
        { status: 400 }
      );
    }

    // Make request to backend API to analyze job match
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/analysis/job-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") || "",
      },
      body: JSON.stringify({
        jobDescription,
        resumeId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Job matching analysis failed" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: "Job matching analysis completed successfully",
      data: data,
    });
  } catch (error) {
    console.error("Job matching analysis error:", error);
    return NextResponse.json(
      { message: "An error occurred during job matching analysis" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";

    // Make request to backend API to get job match history
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${backendUrl}/analysis/job-matches?page=${page}&limit=${limit}`,
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
        { message: data.message || "Failed to fetch job match history" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: "Job match history retrieved successfully",
      data: data,
    });
  } catch (error) {
    console.error("Job match history error:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching job match history" },
      { status: 500 }
    );
  }
}
