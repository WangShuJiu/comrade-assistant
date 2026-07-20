import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, unlink, readdir, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

const MAX_PDF_PAGES = 10;
const PDF_DPI = 150;

async function isPdftocairoAvailable(): Promise<boolean> {
  try {
    await execFileAsync("pdftocairo", ["-v"]);
    return true;
  } catch {
    return false;
  }
}

export async function pdfToImages(
  pdfBase64: string,
  maxPages: number = MAX_PDF_PAGES
): Promise<{ base64: string; mimeType: string }[]> {
  const available = await isPdftocairoAvailable();
  if (!available) {
    throw new Error(
      "pdftocairo 未安装。请安装 poppler-utils: apt install poppler-utils / brew install poppler / apk add poppler-utils"
    );
  }

  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
  const pdfBuffer = Buffer.from(cleanBase64, "base64");

  const tmpDir = join(tmpdir(), `pdf-${randomUUID()}`);
  const pdfPath = join(tmpDir, "input.pdf");

  try {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(pdfPath, pdfBuffer);

    await execFileAsync("pdftocairo", [
      "-png",
      "-r", String(PDF_DPI),
      "-l", String(maxPages),
      pdfPath,
      join(tmpDir, "page"),
    ], { timeout: 30000 });

    const files = await readdir(tmpDir);
    const pageFiles = files
      .filter((f) => /^page-\d+\.png$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)![0]);
        const nb = parseInt(b.match(/\d+/)![0]);
        return na - nb;
      });

    if (pageFiles.length === 0) {
      throw new Error("PDF 转换失败：未生成任何页面图片");
    }

    const images = await Promise.all(
      pageFiles.map(async (f) => {
        const buf = await readFile(join(tmpDir, f));
        return {
          base64: buf.toString("base64"),
          mimeType: "image/png" as const,
        };
      })
    );

    return images;
  } finally {
    for (const f of await readdir(tmpDir).catch(() => [])) {
      await unlink(join(tmpDir, f)).catch(() => {});
    }
  }
}
