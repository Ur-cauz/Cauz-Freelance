import { NextResponse } from "next/server";

// Temporarily disabled while lead delivery moves from MongoDB to Discord.
export async function POST() {
  return NextResponse.json({ error: "Contact form is temporarily unavailable." }, { status: 503 });
}
