import { spawn } from "node:child_process";

export function runCommand(
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
