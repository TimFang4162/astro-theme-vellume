import { runCommand } from "./run-command";

export interface ToolchainVersions {
  typst: string;
  mmdr: string;
}

const VERSION_PROBE_TIMEOUT_MS = 5_000;

async function probeBinaryVersion(command: string): Promise<string> {
  try {
    const { stdout } = await runCommand(
      command,
      ["--version"],
      "",
      VERSION_PROBE_TIMEOUT_MS,
    );
    const version = stdout.trim().split(/\s+/)[1];

    return version || "unknown";
  } catch {
    // Missing binaries are legal (sites without math/diagrams); a stable
    // placeholder keeps asset names deterministic in that case.
    return "unknown";
  }
}

let versionsPromise: Promise<ToolchainVersions> | undefined;

export function getToolchainVersions(): Promise<ToolchainVersions> {
  versionsPromise ??= (async () => ({
    typst: await probeBinaryVersion("typst"),
    mmdr: await probeBinaryVersion("mmdr"),
  }))();

  return versionsPromise;
}
