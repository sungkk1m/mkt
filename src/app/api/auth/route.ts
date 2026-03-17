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

    return NextResponse.json({ success: isValid });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "서버 에러" },
      { status: 500 }
    );
  }
}
