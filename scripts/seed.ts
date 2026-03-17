import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { advertisers, adCreatives } from "../src/lib/db/schema";

async function seed() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    console.error("DATABASE_URL 환경변수를 설정해주세요");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  console.log("시드 데이터 삽입 시작...");

  // Create advertisers
  const advData = [
    { name: "넥슨", pageId: "nexon_kr", genre: "RPG", country: "KR" },
    { name: "데브시스터즈", pageId: "devsisters", genre: "캐주얼", country: "KR" },
    { name: "miHoYo", pageId: "mihoyo_global", genre: "RPG", country: "KR" },
  ];

  const insertedAdv = [];
  for (const adv of advData) {
    const result = await db
      .insert(advertisers)
      .values(adv)
      .returning({ id: advertisers.id });
    insertedAdv.push({ ...adv, id: result[0].id });
    console.log(`광고주 생성: ${adv.name} (ID: ${result[0].id})`);
  }

  // Ad templates
  const adTemplates = [
    // Nexon ads
    [
      {
        textBody: "메이플스토리 신규 캐릭터 업데이트! 지금 바로 만나보세요.",
        textTitle: "메이플스토리",
        mediaType: "image",
        platform: "facebook",
      },
      {
        textBody: "던전앤파이터 모바일 사전예약 시작! 풍성한 보상이 기다립니다.",
        textTitle: "던전앤파이터 모바일",
        mediaType: "video",
        platform: "instagram",
      },
      {
        textBody: "바람의나라: 연 - 대규모 업데이트 기념 이벤트 진행 중",
        textTitle: "바람의나라: 연",
        mediaType: "image",
        platform: "facebook",
      },
      {
        textBody: "FC 온라인 시즌 업데이트! 새로운 선수 카드를 확인하세요.",
        textTitle: "FC 온라인",
        mediaType: "carousel",
        platform: "facebook",
      },
      {
        textBody: "넥슨 플레이 - 다양한 게임을 한 곳에서. 신규 가입 혜택!",
        textTitle: "넥슨 플레이",
        mediaType: "video",
        platform: "instagram",
      },
    ],
    // Devsisters ads
    [
      {
        textBody: "쿠키런: 킹덤 신규 쿠키 출시! 한정 이벤트 진행 중 🍪",
        textTitle: "쿠키런: 킹덤",
        mediaType: "image",
        platform: "facebook",
      },
      {
        textBody: "쿠키런: 오븐브레이크 시즌 8 시작! 새로운 모험이 펼쳐집니다.",
        textTitle: "쿠키런: 오븐브레이크",
        mediaType: "video",
        platform: "facebook",
      },
      {
        textBody: "데브시스터즈의 새로운 게임! 사전등록하고 보상 받으세요.",
        textTitle: "데브시스터즈 신작",
        mediaType: "image",
        platform: "instagram",
      },
      {
        textBody: "쿠키런: 킹덤 길드전 시즌 오픈! 최강 길드에 도전하세요.",
        textTitle: "쿠키런: 킹덤 길드전",
        mediaType: "carousel",
        platform: "facebook",
      },
      {
        textBody: "쿠키런 유니버스 확장! 새로운 세계관을 경험해보세요.",
        textTitle: "쿠키런 유니버스",
        mediaType: "image",
        platform: "facebook",
      },
    ],
    // miHoYo ads
    [
      {
        textBody: "원신 4.5 업데이트 - 새로운 지역과 캐릭터를 만나보세요!",
        textTitle: "원신",
        mediaType: "video",
        platform: "facebook",
      },
      {
        textBody: "붕괴: 스타레일 신규 캐릭터 등장! 은하를 여행하세요 ✨",
        textTitle: "붕괴: 스타레일",
        mediaType: "image",
        platform: "instagram",
      },
      {
        textBody: "젠레스 존 제로 - 도시 속 모험이 시작됩니다. 지금 다운로드!",
        textTitle: "젠레스 존 제로",
        mediaType: "video",
        platform: "facebook",
      },
      {
        textBody: "원신 협주 이벤트 진행 중! 친구와 함께 도전하세요.",
        textTitle: "원신 이벤트",
        mediaType: "carousel",
        platform: "facebook",
      },
      {
        textBody: "HoYoverse 특별 방송 예고! 새로운 소식을 가장 먼저 확인하세요.",
        textTitle: "HoYoverse",
        mediaType: "image",
        platform: "instagram",
      },
    ],
  ];

  // Insert ads
  for (let i = 0; i < insertedAdv.length; i++) {
    const adv = insertedAdv[i];
    const templates = adTemplates[i];

    for (let j = 0; j < templates.length; j++) {
      const t = templates[j];
      const daysAgo = Math.floor(Math.random() * 30);
      const firstSeen = new Date();
      firstSeen.setDate(firstSeen.getDate() - daysAgo);

      await db.insert(adCreatives).values({
        advertiserId: adv.id,
        source: "meta",
        externalId: `seed_${adv.pageId}_${j}`,
        textBody: t.textBody,
        textTitle: t.textTitle,
        textDescription: `${t.textTitle} - 지금 바로 플레이하세요!`,
        snapshotUrl: `https://www.facebook.com/ads/library/?id=${Date.now()}${j}`,
        mediaType: t.mediaType,
        mediaUrls: JSON.stringify([
          `https://picsum.photos/400/300?random=${i * 5 + j + 1}`,
        ]),
        thumbnailUrl: `https://picsum.photos/400/300?random=${i * 5 + j + 1}`,
        platform: t.platform,
        country: "KR",
        firstSeen: firstSeen.toISOString().split("T")[0],
        lastSeen: new Date().toISOString().split("T")[0],
        isActive: Math.random() > 0.3 ? 1 : 0,
      });
    }
    console.log(`${adv.name}: 광고 5개 생성 완료`);
  }

  console.log("\n시드 데이터 삽입 완료! 총 15개 광고가 생성되었습니다.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("시드 실패:", err);
  process.exit(1);
});
