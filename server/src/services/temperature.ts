interface Category {
  key: string;
  label: string;
  cnLabel: string;
  temp: number;
  systemPrompt: string;
  keywords: string[];
}

const CATEGORIES: Category[] = [
  {
    key: "代码编程",
    label: "computer programming, coding, debugging, or software development task",
    cnLabel: "写代码、编程、调试、软件开发",
    temp: 0.05,
    systemPrompt:
      "你是一位资深软件工程师，精通多种编程语言和系统架构。回答需要精确、代码示例正确可用，简洁直接，不添加无关解释。",
    keywords: [
      "代码", "编程", "bug", "调试", "debug", "函数", "function", "api",
      "算法", "algorithm", "重构", "refactor", "报错", "异常", "exception",
      "编译", "compile", "部署", "deploy", "数据库", "database", "sql",
      "接口", "http", "前端", "后端", "fullstack", "react", "vue",
      "python", "java", "typescript", "golang", "rust", "性能优化",
      "并发", "线程", "内存", "泄漏", "leak", "单元测试", "test",
      "正则", "regex", "json", "yaml", "docker", "kubernetes", "k8s",
      "linux", "git", "commit", "分支", "merge", "pr",
    ],
  },
  {
    key: "事实知识",
    label: "factual question requiring a precise, accurate, verifiable answer",
    cnLabel: "查询事实、知识问答、定义、百科",
    temp: 0.1,
    systemPrompt:
      "你是一位知识渊博的百科全书助手。回答必须基于可验证的事实，准确、简洁、客观。不确定的内容请明确指出，不要虚构信息。",
    keywords: [
      "什么是", "定义", "定义是", "谁", "who", "哪里", "where",
      "什么时候", "when", "多少", "how many", "how much",
      "区别", "difference", "对比", "compare", "分类", "category",
      "历史", "history", "百科", "encyclopedia", "事实", "fact",
      "记录", "record", "排名", "rank", "统计", "statistics",
      "世界上", "最大", "最小", "第一个", "首次", "首都",
      "人口", "面积", "成立", "出生", "去世",
    ],
  },
  {
    key: "翻译",
    label: "language translation between different languages",
    cnLabel: "语言翻译、中英互译、多语言转换",
    temp: 0.1,
    systemPrompt:
      "你是一位专业翻译。请忠实、准确地将内容翻译为目标语言，保持原文意思、语气和风格。直接输出译文，不添加解释或注释。",
    keywords: [
      "翻译", "translate", "翻译成", "译成", "译为", "英译", "中译",
      "日译", "韩译", "用中文", "用英文", "用日语", "in chinese",
      "in english", "in japanese", "to chinese", "to english",
      "这段话", "这段文字", "帮我翻",
    ],
  },
  {
    key: "学术科研",
    label: "academic research, scientific inquiry, or scholarly writing",
    cnLabel: "学术研究、论文写作、科学实验、理论推导",
    temp: 0.15,
    systemPrompt:
      "你是一位严谨的学术研究者。回答需要逻辑严密、有据可查，使用正式的学术写作风格。涉及数据和研究结论请说明依据。",
    keywords: [
      "论文", "研究", "学术", "科研", "文献", "综述", "引用", "reference",
      "实验", "数据", "假设", "hypothesis", "结论", "conclusion",
      "定理", "theorem", "证明", "prove", "推导", "推导出",
      "科学", "science", "物理", "physics", "化学", "chemistry",
      "生物", "biology", "数学", "math", "统计学",
      "期刊", "journal", "doi", "arxiv", "论文写作", "发表",
      "摘要", "abstract", "方法论", "methodology",
      "机器学习", "深度学习", "神经网络", "人工智能", "大模型",
      "nlp", "计算机视觉", "自然语言处理", "强化学习",
      "transformer", "llm", "gpt", "bert", "fine-tune",
    ],
  },
  {
    key: "健康医疗",
    label: "health advice, medical information, or healthcare guidance",
    cnLabel: "健康建议、医疗咨询、健身运动、养生保健",
    temp: 0.2,
    systemPrompt:
      "你是一位负责任的健康顾问。回答需基于循证医学常识，谨慎专业。遇到严重症状或急症务必强调及时就医，不要给出确定性诊断。",
    keywords: [
      "健康", "医疗", "医院", "医生", "药物", "药品", "症状", "symptom",
      "疾病", "治疗", "手术", "体检", "化验", "血压", "血糖",
      "睡眠", "失眠", "营养", "维生素", "减肥", "减脂",
      "运动", "锻炼", "健身", "跑步", "瑜伽", "心理", "焦虑",
      "抑郁", "中医", "养生", "按摩", "针灸",
    ],
  },
  {
    key: "学习教育",
    label: "educational explanation, learning new concepts, or tutoring a student",
    cnLabel: "学习新知识、教程讲解、作业辅导、考试备考",
    temp: 0.3,
    systemPrompt:
      "你是一位耐心且善于启发的导师。请用通俗易懂的语言解释复杂概念，循序渐进、多举例子，确保学习者能真正理解。",
    keywords: [
      "学会", "教我", "入门", "新手", "小白", "初学者",
      "教程", "tutorial", "讲解", "通俗", "简单", "易懂",
      "概念", "原理", "基础知识", "零基础", "怎么学",
      "考试", "题目", "习题", "作业", "homework", "答案",
      "阅读", "理解", "总结", "摘要", "笔记", "note",
      "英语学习", "日语学习", "背单词", "语法", "口语",
      "考研", "高考", "四六级", "托福", "雅思",
    ],
  },
  {
    key: "分析推理",
    label: "logical analysis, critical thinking, or step-by-step reasoning",
    cnLabel: "逻辑分析、推理判断、利弊权衡、策略建议",
    temp: 0.4,
    systemPrompt:
      "你是一位逻辑严密的策略分析师。请多角度拆解问题，权衡利弊，给出有深度、有洞察力的分析和建议。推理过程清晰可追溯。",
    keywords: [
      "分析", "analyz", "评估", "evaluate", "推理", "reason",
      "逻辑", "logic", "判断", "judge", "权衡", "利弊",
      "优缺点", "pros and cons", "选择", "建议", "recommend",
      "方案", "策略", "strategy", "优化", "optimize",
      "设计", "design", "架构", "architecture",
      "排查", "定位", "根因", "原因分析", "调查", "investigate",
    ],
  },
  {
    key: "办公效率",
    label: "office work, professional document, or business communication",
    cnLabel: "办公文档、邮件报告、演示汇报、项目管理",
    temp: 0.5,
    systemPrompt:
      "你是一位高效专业的办公助手。输出内容直接可用、格式规范、语言得体。善于撰写各类文档、邮件、报告、演示材料等。",
    keywords: [
      "工作", "办公", "报告", "report", "邮件", "email",
      "会议", "纪要", "记录", "周报", "日报", "月报",
      "ppt", "演示", "presentation", "演讲稿", "speech",
      "简历", "resume", "cv", "面试", "interview",
      "合同", "协议", "文档", "公文", "通知", "公告",
      "项目管理", "进度", "计划", "规划", "schedule",
      "kpi", "okr", "目标", "复盘", "review",
      "excel", "图表", "流程图", "思维导图",
    ],
  },
  {
    key: "生活饮食",
    label: "daily life advice, food, recipes, travel, or lifestyle tips",
    cnLabel: "日常生活、美食推荐、旅游攻略、购物穿搭",
    temp: 0.6,
    systemPrompt:
      "你是一位热爱生活的朋友，对美食、旅行、穿搭等都有独到品味。推荐要具体、接地气、个性化，像朋友聊天一样自然分享。",
    keywords: [
      "生活", "日常", "推荐", "推荐一下", "有什么", "哪些",
      "好吃", "美食", "食谱", "recipe", "做菜", "烹饪",
      "餐厅", "外卖", "咖啡", "茶", "旅游", "旅行", "景点",
      "酒店", "机票", "签证", "攻略", "穿搭", "时尚",
      "家居", "装修", "家电", "购物", "买什么", "值得买",
      "宠物", "植物", "花", "天气",
      "周末", "假期", "去哪", "玩",
    ],
  },
  {
    key: "日常闲聊",
    label: "casual conversation, small talk, or general social chat",
    cnLabel: "日常聊天、寒暄问候、心情分享、闲聊交流",
    temp: 0.7,
    systemPrompt:
      "你是一位友善、幽默、有温度的聊天伙伴。回答自然流畅，不端着不装，像朋友一样聊天。可以适当表达观点和情绪。",
    keywords: [
      "你好", "嗨", "hi", "hello", "聊天", "聊", "闲聊",
      "心情", "感觉", "无聊", "有趣", "哈哈", "谢谢", "thanks",
      "再见", "bye", "晚安", "早安", "你是谁", "你是",
      "怎么样", "还好吗", "今天", "最近", "听说",
      "看法", "觉得", "认为", "聊聊",
    ],
  },
  {
    key: "营销文案",
    label: "marketing copywriting, advertising content, or promotional writing",
    cnLabel: "广告文案、营销推广、品牌宣传、种草带货",
    temp: 0.9,
    systemPrompt:
      "你是一位资深文案策划，文字有感染力、抓眼球。擅长标题党、金句、卖点提炼和场景化表达，适当使用修辞手法让人过目不忘。",
    keywords: [
      "营销", "文案", "广告", "广告语", "slogan", "推广", "宣传",
      "品牌", "产品", "爆款", "卖点", "种草", "带货", "直播",
      "公众号", "小红书", "抖音", "微博", "自媒体",
      "标题", "吸引", "点击", "转化", "活动", "促销",
      "copy", "软文", "推文", "海报", "口号",
      "朋友圈", "短视频", "脚本", "宣传语",
    ],
  },
  {
    key: "艺术创意",
    label: "creative writing, poetry, storytelling, or artistic expression",
    cnLabel: "诗歌创作、故事编写、文学写作、艺术创意",
    temp: 1.2,
    systemPrompt:
      "你是一位富有灵气和想象力的创作者。文笔优美、意境深远，擅长诗歌、文学、故事创作。敢于突破常规，用独特的视角和语言打动人心。",
    keywords: [
      "诗", "诗歌", "词", "绝句", "律诗", "对联", "散文",
      "故事", "小说", "童话", "寓言", "剧本", "歌词", "作曲",
      "创作", "写一首", "写一篇", "写一个", "编一个", "编故事",
      "想象", "幻想", "虚构", "科幻", "玄幻", "武侠",
      "画", "绘画", "设计", "配色", "灵感", "brainstorm",
      "头脑风暴", "创意", "点子", "角色", "世界观", "设定",
      "比喻", "拟人", "夸张", "描写", "描写一下",
    ],
  },
];

function pickTopCategory(scores: number[]): { idx: number; score: number } {
  let topIdx = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[topIdx]) {
      topIdx = i;
    }
  }
  return { idx: topIdx, score: scores[topIdx] };
}

const PY_SERVICE_URL = process.env.PY_SERVICE_URL || "http://127.0.0.1:8765";

function classifyByKeywords(query: string): { idx: number; score: number } {
  const q = query.toLowerCase();
  const scores = CATEGORIES.map((cat) => {
    const matchCount = cat.keywords.filter((kw) => q.includes(kw)).length;
    return cat.keywords.length > 0 ? matchCount / Math.min(cat.keywords.length, 20) : 0;
  });
  const top = pickTopCategory(scores);
  const cat = CATEGORIES[top.idx];
  const hits = cat.keywords.filter((kw) => q.includes(kw));
  console.log(
    `[temperature] 关键词 → ${cat.key} (${cat.temp})${hits.length > 0 ? ", 命中: " + hits.join(", ") : " (无匹配)"}`
  );
  return top;
}

async function classifyByPython(query: string): Promise<{ idx: number; score: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${PY_SERVICE_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        labels: CATEGORIES.map((c) => c.cnLabel),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = (await res.json()) as { top_idx: number; scores: number[] };

    const cat = CATEGORIES[data.top_idx];
    const details = CATEGORIES.map((c, i) =>
      `${c.key}:${data.scores[i].toFixed(3)}`
    ).join(" | ");
    console.log(
      `[temperature] Python模型 → ${cat.key} (${cat.temp}), scores: ${details}`
    );
    return { idx: data.top_idx, score: data.scores[data.top_idx] };
  } catch (err) {
    console.warn("[temperature] Python服务不可用，回退到关键词:", (err as Error).message);
    return null;
  }
}

export async function getTemperatureAndPrompt(query: string): Promise<{
  temperature: number;
  systemPrompt: string;
  category: string;
}> {
  let topIdx: number;

  const pyResult = await classifyByPython(query);
  if (pyResult && pyResult.score >= 0.3) {
    topIdx = pyResult.idx;
  } else if (pyResult) {
    console.log(`[temperature] 模型置信度过低 (${pyResult.score.toFixed(3)} < 0.3)，启用关键词纠正`);
    const kwResult = classifyByKeywords(query);
    topIdx = kwResult.idx;
  } else {
    const kwResult = classifyByKeywords(query);
    topIdx = kwResult.idx;
  }

  const cat = CATEGORIES[topIdx];
  return { temperature: cat.temp, systemPrompt: cat.systemPrompt, category: cat.key };
}

export async function getTemperature(query: string): Promise<number> {
  const result = await getTemperatureAndPrompt(query);
  return result.temperature;
}
