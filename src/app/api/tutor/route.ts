import { getConcept } from "@/data/track";

export const dynamic = "force-static";

type TutorConfig = {
  provider: "doubao" | "openai";
  key: string;
  base: string;
  model: string;
};

function tutorConfig(): TutorConfig | null {
  const doubaoKey = process.env.DOUBAO_API_KEY?.trim();
  if (doubaoKey) {
    return {
      provider: "doubao",
      key: doubaoKey,
      base: (process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, ""),
      model: process.env.DOUBAO_MODEL?.trim() || process.env.TUTOR_MODEL?.trim() || "",
    };
  }

  const tutorKey = process.env.TUTOR_API_KEY?.trim();
  if (tutorKey) {
    return {
      provider: "openai",
      key: tutorKey,
      base: (process.env.TUTOR_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: process.env.TUTOR_MODEL?.trim() || "gpt-4o-mini",
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      provider: "openai",
      key: openaiKey,
      base: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };
  }

  return null;
}

export async function GET() {
  const config = tutorConfig();
  if (!config) {
    return Response.json({
      configured: false,
      provider: "script",
      reason: "未配置密钥。讲解、追问和要点对照都由本地小练完成。",
    });
  }
  if (!config.model) {
    return Response.json({
      configured: false,
      provider: config.provider,
      reason: "密钥已经有了，还差模型名。豆包请设置 DOUBAO_MODEL 为火山方舟的接入点 ID。",
    });
  }
  return Response.json({
    configured: true,
    provider: config.provider,
    reason: "讲解仍用本地稿。你提问和复述之后，追问与反馈会交给模型。",
  });
}

type Body = {
  kind?: "answer" | "feedback";
  conceptId?: number;
  question?: string;
  userText?: string;
};

export async function POST(request: Request) {
  const config = tutorConfig();
  if (!config?.model) {
    return Response.json({ ok: false, mode: "script" });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "请求不是 JSON" }, { status: 400 });
  }

  const concept = getConcept(Number(body.conceptId));
  if (!concept) {
    return Response.json({ ok: false, error: "没有这个概念" }, { status: 404 });
  }

  const points = concept.points.map((point, index) => `${index}. ${point.text}`).join("\n");
  const system =
    body.kind === "feedback"
      ? "你是学习教练小练。根据用户的复述，判断他碰到了哪些要点。只输出 JSON：{\"covered\":[0],\"tip\":\"一句中文，50字以内，告诉他下次怎么讲\"}。covered 是讲到的要点下标。不要输出别的文字。"
      : "你是学习教练小练，用口语回答用户刚打断时提的问题。两句以内，中文，围绕这个概念，不要跑题，不要列清单。";

  const user =
    body.kind === "feedback"
      ? `概念：${concept.title}\n定义：${concept.definition}\n要点：\n${points}\n\n用户的复述：\n${body.userText?.trim() || "（没有说话）"}`
      : `概念：${concept.title}\n定义：${concept.definition}\n要点：\n${points}\n\n用户的问题：${body.question?.trim() || "没听清"}`;

  try {
    const response = await fetch(`${config.base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return Response.json({ ok: false, mode: "script" });
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) return Response.json({ ok: false, mode: "script" });

    if (body.kind === "feedback") {
      const parsed = parseFeedback(content);
      if (!parsed) return Response.json({ ok: false, mode: "script" });
      return Response.json({ ok: true, ...parsed });
    }

    return Response.json({ ok: true, text: content.replace(/^["「]|["」]$/g, "").slice(0, 280) });
  } catch {
    return Response.json({ ok: false, mode: "script" });
  }
}

function parseFeedback(content: string): { covered: number[]; tip: string } | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { covered?: unknown; tip?: unknown };
    const covered = Array.isArray(parsed.covered)
      ? parsed.covered.filter((item): item is number => Number.isInteger(item) && item >= 0 && item <= 3)
      : [];
    const tip = typeof parsed.tip === "string" ? parsed.tip.trim().slice(0, 80) : "";
    return { covered: [...new Set(covered)], tip };
  } catch {
    return null;
  }
}
