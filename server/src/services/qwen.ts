const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com";

export interface QwenMessage {
  role: "user" | "assistant" | "system";
  content: string | QwenContentPart[];
}

export interface QwenContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface QwenChatResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export async function callQwenVL(
  apiKey: string,
  model: string,
  messages: QwenMessage[],
  maxTokens: number = 2000
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const response = await fetch(`${DASHSCOPE_BASE}/compatible-mode/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qwen API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as QwenChatResponse;
  return {
    content: data.choices[0]?.message?.content || "",
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

export interface WanxTaskResponse {
  output: {
    task_id: string;
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  };
  request_id: string;
}

export interface WanxResultResponse {
  output: {
    task_id: string;
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
    results?: {
      url: string;
      code?: string;
      message?: string;
    }[];
    code?: string;
    message?: string;
  };
  usage: {
    image_count: number;
  };
}

export async function submitWanxTask(
  apiKey: string,
  prompt: string,
  size: string = "1024*1024",
  n: number = 1
): Promise<string> {
  const response = await fetch(
    `${DASHSCOPE_BASE}/api/v1/services/aigc/text2image/image-synthesis`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wanx-v1",
        input: { prompt },
        parameters: { size, n },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Wanx API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as WanxTaskResponse;
  return data.output.task_id;
}

export async function pollWanxTask(
  apiKey: string,
  taskId: string,
  maxAttempts: number = 60
): Promise<WanxResultResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${DASHSCOPE_BASE}/api/v1/tasks/${taskId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wanx poll error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as WanxResultResponse;

    if (data.output.task_status === "SUCCEEDED") {
      return data;
    }
    if (data.output.task_status === "FAILED") {
      throw new Error(`Wanx task failed: ${data.output.message || "Unknown error"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Wanx task timed out");
}
