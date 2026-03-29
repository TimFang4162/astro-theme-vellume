import { spawn } from "node:child_process";
import path from "node:path";
import { escapeXml, stripXmlPreamble } from "./utils";

const typstCache = new Map<string, string>();
const mermaidCache = new Map<string, string>();

const mermaidConfigPath = path.resolve(
  process.cwd(),
  "src/markdown/mermaid.config.json",
);

function runCommand(
  command: string,
  args: string[],
  input: string,
  timeoutMs = 30_000,
) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `${command} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`,
        ),
      );
    });

    child.stdin.end(input);
  });
}

export function createCompileErrorSvg(title: string, detail: string) {
  const lines = detail.split(/\r?\n/);
  const lineHeight = 20;
  const padding = 24;
  const titleBlockHeight = 44;
  const contentHeight = Math.max(lines.length, 1) * lineHeight;
  const height = padding * 2 + titleBlockHeight + contentHeight;
  const safeTitle = escapeXml(title);
  const safeLines = (lines.length ? lines : ["Unknown error"]).map(escapeXml);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 ${height}" width="960" height="${height}" role="img" aria-labelledby="compile-error-title compile-error-detail">`,
    `<title id="compile-error-title">${safeTitle}</title>`,
    `<desc id="compile-error-detail">${escapeXml(detail)}</desc>`,
    '<rect width="100%" height="100%" fill="#111827" rx="18" ry="18" />',
    '<rect x="12" y="12" width="936" height="' +
      `${height - 24}` +
      '" fill="#0f172a" stroke="#ef4444" stroke-width="2" rx="14" ry="14" />',
    `<text x="${padding}" y="${padding + 18}" fill="#fca5a5" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" font-size="20" font-weight="700">${safeTitle}</text>`,
    safeLines
      .map(
        (line, index) =>
          `<text x="${padding}" y="${
            padding + titleBlockHeight + index * lineHeight
          }" fill="#e5e7eb" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" font-size="16" xml:space="preserve">${line || " "}</text>`,
      )
      .join(""),
    "</svg>",
  ].join("");
}

export async function compileTypst(code: string) {
  const cacheKey = `typst:${code}`;
  const cached = typstCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const typstPreamble = [
    "#set page(width: 720pt, height: auto, margin: 8pt, fill: white)",
    "#set text(size: 14pt)",
  ].join("\n");
  const { stdout } = await runCommand(
    "typst",
    ["compile", "--features", "html", "--format", "svg", "-", "-"],
    `${typstPreamble}\n${code}`,
  );
  const svg = stripXmlPreamble(stdout);
  typstCache.set(cacheKey, svg);
  return svg;
}

export async function compileTypstMath(
  expression: string,
  displayMode: boolean,
) {
  const cacheKey = `math:${displayMode ? "block" : "inline"}:${expression}`;
  const cached = typstCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const typstPreamble = [
    "#set page(fill: none, width: auto, height: auto, margin: 8pt)",
    "#set text(size: 14pt)",
  ].join("\n");
  const { stdout } = await runCommand(
    "typst",
    ["compile", "--features", "html", "--format", "svg", "-", "-"],
    `${typstPreamble}\n$${expression}$`,
  );
  const svg = stripXmlPreamble(stdout);
  typstCache.set(cacheKey, svg);
  return svg;
}

export async function compileMermaid(code: string) {
  const cacheKey = code;
  const cached = mermaidCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const { stdout } = await runCommand(
    "mmdr",
    ["-e", "svg", "-c", mermaidConfigPath],
    code,
  );
  const svg = stripXmlPreamble(stdout);
  mermaidCache.set(cacheKey, svg);
  return svg;
}
