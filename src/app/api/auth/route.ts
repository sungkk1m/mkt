import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "비밀번호를 입력해주세요" },
        { status: 400 }
      );
    }

    const isValid = password === process.env.ADMIN_PASSWORD;

    if (isValid) {
      // Return the collect API key so the authenticated client can use it
      return NextResponse.json({ success: true, apiKey: process.env.COLLECT_API_KEY });
    }

    return NextResponse.json({ success: false });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "서버 에러" },
      { status: 500 }
    );
  }
}
