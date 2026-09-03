import { spawnSync } from "node:child_process";

type Args = {
  help: boolean;
  dryRun: boolean;
  noVerify: boolean;
  remote: string | null;
  branch: string | null;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {
    help: false,
    dryRun: false,
    noVerify: false,
    remote: null,
    branch: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-verify") out.noVerify = true;
    else if (a === "--remote") out.remote = argv[++i] ?? null;
    else if (a.startsWith("--remote="))
      out.remote = a.slice("--remote=".length);
    else if (a === "--branch") out.branch = argv[++i] ?? null;
    else if (a.startsWith("--branch="))
      out.branch = a.slice("--branch=".length);
    else {
      console.error(`Unknown argument: ${a}`);
      printHelp();
      process.exit(1);
    }
  }
  if (out.remote && !out.branch) out.branch = "main";
  if (out.branch && !out.remote) {
    // branch without remote is ambiguous — infer remote below
  }
  return out;
}

function printHelp(): void {
  console.log(`Usage: bun run sync [--dry-run] [--no-verify] [--remote <name>] [--branch <name>]

One-way downstream merge: <remote>/<branch> → current blog branch.
Never pushes to origin/main; the blog branch never merges back.

  --dry-run          Show what would happen without changing the worktree
  --no-verify        Skip post-merge astro check
  --remote <name>    Upstream remote (default: upstream if it exists, else origin)
  --branch <name>    Upstream branch (default: main)
  -h, --help         Show this help

Ownership (auto-resolved, rest left for manual fix):
  yours  src/content/**  src/site/config.ts  metadata.ts  navigation.ts  theme.css  custom.css  profiles/**
  theirs src/components/**  src/layouts/**  src/pages/**  src/lib/**  src/markdown/**  src/utils/**  src/assets/**
         src/styles/**  src/config/theme-default.ts  theme-profiles.ts  src/config/site.ts  astro.config.ts
         scripts/**  docs/**  CLAUDE.md  public/favicons/**  package.json  bun.lock
  delete demo that you already removed locally but upstream touched:
         src/content/blog/2026-03/**  src/content/series/theme-tour.md  src/content/series/example-series.md

After a clean auto-merge the script commits as chore(sync) and runs a light
astro check (skip with --no-verify). If bun.lock changed it re-installs and
hints about favicons when browserColor/profiles changed.
`);
}

function run(
  cmd: string,
  args: string[],
  opts: { stdio?: "inherit" | "pipe" | "ignore"; allowFail?: boolean } = {},
): { status: number; stdout: string; stderr: string } {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: opts.stdio === "inherit" ? "inherit" : "pipe",
  });
  const stdout = (res.stdout as string) ?? "";
  const stderr = (res.stderr as string) ?? "";
  if (!opts.allowFail && res.status !== 0) {
    const msg =
      stderr.trim() ||
      stdout.trim() ||
      `command failed: ${cmd} ${args.join(" ")}`;
    throw new Error(msg);
  }
  return { status: res.status ?? 1, stdout, stderr };
}

function mustRun(cmd: string, args: string[]): string {
  return run(cmd, args).stdout.trim();
}

function hasRemote(name: string): boolean {
  const r = run("git", ["remote", "get-url", name], { allowFail: true });
  return r.status === 0;
}

function currentBranch(): string {
  return mustRun("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
}

function porcelainStatus(): string {
  return mustRun("git", ["status", "--porcelain"]);
}

function isMainBranch(name: string): boolean {
  return name === "main" || name === "master";
}

// Ownership helpers

function isUserOwned(path: string): boolean {
  if (path.startsWith("src/content/")) return true;
  if (
    path === "src/site/config.ts" ||
    path === "src/site/metadata.ts" ||
    path === "src/site/navigation.ts" ||
    path === "src/site/theme.css" ||
    path === "src/site/custom.css"
  )
    return true;
  if (path.startsWith("src/site/profiles/")) return true;
  return false;
}

function isDemoDeletePath(path: string): boolean {
  if (path.startsWith("src/content/blog/2026-03/")) return true;
  if (path === "src/content/series/theme-tour.md") return true;
  if (path === "src/content/series/example-series.md") return true;
  return false;
}

function isUpstreamOwned(path: string): boolean {
  const prefixes = [
    "src/components/",
    "src/layouts/",
    "src/pages/",
    "src/lib/",
    "src/markdown/",
    "src/utils/",
    "src/assets/",
    "src/styles/",
    "scripts/",
    "docs/",
    "public/favicons/",
  ];
  for (const p of prefixes) if (path.startsWith(p)) return true;
  const exact = new Set([
    "src/config/theme-default.ts",
    "src/config/theme-profiles.ts",
    "src/config/site.ts",
    "astro.config.ts",
    "CLAUDE.md",
  ]);
  if (exact.has(path)) return true;
  return false;
}

function isLockfile(path: string): boolean {
  return path === "package.json" || path === "bun.lock";
}

function classify(path: string): "ours" | "theirs" | "delete" | "manual" {
  // Demo delete rule is most specific — check first for delete semantics
  // (caller will use status to decide git rm vs checkout)
  if (isDemoDeletePath(path)) return "delete";
  if (isUserOwned(path)) return "ours";
  if (isLockfile(path)) return "theirs";
  if (isUpstreamOwned(path)) return "theirs";
  return "manual";
}

function listUnmerged(): Array<{ path: string; x: string; y: string }> {
  const out = mustRun("git", ["status", "--porcelain"]);
  const rows: Array<{ path: string; x: string; y: string }> = [];
  for (const line of out.split("\n")) {
    if (!line) continue;
    const x = line[0] ?? " ";
    const y = line[1] ?? " ";
    // Unmerged entries have specific combos: UU, AA, DU, UD, AU, UA, DD
    const isUnmerged =
      (x === "U" || y === "U" || x === "A" || y === "A") &&
      (x === "U" ||
        y === "U" ||
        (x === "D" && y === "U") ||
        (x === "U" && y === "D") ||
        (x === "A" && y === "A") ||
        (x === "A" && y === "U") ||
        (x === "U" && y === "A") ||
        (x === "D" && y === "D"));
    // Simpler: any line where first two chars indicate conflict (contains U/D with the other not space for merge)
    // Use git diff --name-only --diff-filter=U as authoritative, then enrich with status
    void isUnmerged;
  }
  // Authoritative list
  const names = run("git", ["diff", "--name-only", "--diff-filter=U"], {
    allowFail: true,
  })
    .stdout.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  // Also catch modify/delete that diff-filter=U misses on some git versions — check status for D/U combos
  const statusLines = out.split("\n").filter(Boolean);
  const byStatus = new Map<string, { x: string; y: string }>();
  for (const line of statusLines) {
    const x = line[0] ?? " ";
    const y = line[1] ?? " ";
    const p = line.slice(3).trim();
    if (p) byStatus.set(p, { x, y });
  }
  for (const p of names) {
    const s = byStatus.get(p) ?? { x: "U", y: "U" };
    rows.push({ path: p, x: s.x, y: s.y });
  }
  // Add any DU/UD that diff-filter=U missed (e.g. deleted on one side)
  for (const [p, s] of byStatus) {
    if ((s.x === "D" && s.y === "U") || (s.x === "U" && s.y === "D")) {
      if (!rows.some((r) => r.path === p))
        rows.push({ path: p, x: s.x, y: s.y });
    }
  }
  return rows;
}

function autoResolve(entries: Array<{ path: string; x: string; y: string }>): {
  resolved: string[];
  manual: string[];
} {
  const resolved: string[] = [];
  const manual: string[] = [];
  for (const e of entries) {
    const kind = classify(e.path);
    const isDeleteStatus = e.x === "D" || e.y === "D";
    if (kind === "delete" && isDeleteStatus) {
      const r = run("git", ["rm", "-f", "--", e.path], { allowFail: true });
      if (r.status === 0)
        resolved.push(`${e.path}  → delete (keep your removal)`);
      else manual.push(e.path);
      continue;
    }
    if (kind === "ours") {
      const r = run("git", ["checkout", "--ours", "--", e.path], {
        allowFail: true,
      });
      if (r.status !== 0) {
        manual.push(e.path);
        continue;
      }
      const a = run("git", ["add", "--", e.path], { allowFail: true });
      if (a.status === 0)
        resolved.push(`${e.path}  → ours (your site/content)`);
      else manual.push(e.path);
      continue;
    }
    if (kind === "theirs" || kind === "delete") {
      // delete without D status falls back to theirs (file still present on both sides pre-merge)
      const r = run("git", ["checkout", "--theirs", "--", e.path], {
        allowFail: true,
      });
      if (r.status !== 0) {
        manual.push(e.path);
        continue;
      }
      const a = run("git", ["add", "--", e.path], { allowFail: true });
      if (a.status === 0)
        resolved.push(
          `${e.path}  → theirs (${kind === "delete" ? "demo theirs" : "upstream"})`,
        );
      else manual.push(e.path);
      continue;
    }
    manual.push(e.path);
  }
  return { resolved, manual };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const branch = currentBranch();
  if (isMainBranch(branch)) {
    console.error(
      `Refusing to run on "${branch}" — sync is one-way downstream (main → blog branch).`,
    );
    console.error(
      `Switch to your blog branch first, e.g.:  git checkout sync-origin-20260410`,
    );
    console.error(`Then:  bun run sync`);
    process.exit(1);
  }

  const porcelain = porcelainStatus();
  if (porcelain.trim() !== "") {
    console.error("Working tree is not clean — stash or commit first:");
    console.error(porcelain);
    process.exit(1);
  }

  // Resolve remote/branch defaults
  let remote = args.remote;
  const upstreamBranch = args.branch ?? "main";
  if (!remote) {
    if (hasRemote("upstream")) remote = "upstream";
    else if (hasRemote("origin")) remote = "origin";
    else {
      console.error("No git remote found (looked for upstream, origin).");
      process.exit(1);
    }
  } else if (!hasRemote(remote)) {
    if (remote === "upstream") {
      console.log(`Remote "upstream" not found — adding it…`);
      run("git", [
        "remote",
        "add",
        "upstream",
        "https://github.com/TimFang4162/astro-theme-vellume.git",
      ]);
    } else {
      console.error(`Remote "${remote}" not found.`);
      process.exit(1);
    }
  }

  const upstreamRef = `${remote}/${upstreamBranch}`;
  console.log(`Fetching ${remote}…`);
  const fetchRes = run("git", ["fetch", remote], { allowFail: true });
  if (fetchRes.status !== 0) {
    console.error(fetchRes.stderr || fetchRes.stdout);
    process.exit(fetchRes.status);
  }

  // Verify upstream ref exists
  const lsRes = run("git", ["rev-parse", "--verify", upstreamRef], {
    allowFail: true,
  });
  if (lsRes.status !== 0) {
    console.error(
      `Upstream ref not found: ${upstreamRef}  (did fetch succeed?)`,
    );
    process.exit(1);
  }

  // Fast-forward / already up to date check
  const mergeBase = mustRun("git", ["merge-base", "HEAD", upstreamRef]);
  const upstreamHead = mustRun("git", ["rev-parse", upstreamRef]);
  const head = mustRun("git", ["rev-parse", "HEAD"]);
  if (head === upstreamHead) {
    console.log(`Already up to date with ${upstreamRef}.`);
    return;
  }
  if (mergeBase === upstreamHead) {
    console.log(
      `${upstreamRef} is already contained in ${branch} — nothing to merge.`,
    );
    return;
  }

  if (args.dryRun) {
    console.log(`\n[dry-run] Would merge ${upstreamRef} into ${branch}.`);
    console.log(
      `Merge-base: ${mergeBase.slice(0, 7)}  HEAD: ${head.slice(0, 7)}  upstream: ${upstreamHead.slice(0, 7)}`,
    );
    const diffNames = mustRun("git", [
      "diff",
      "--name-only",
      `${mergeBase}..${upstreamRef}`,
    ])
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (diffNames.length === 0) {
      console.log("No file-level diff in that range (unexpected).");
      return;
    }
    console.log(
      `\nUpstream touches ${diffNames.length} path(s). Ownership preview:`,
    );
    const buckets: Record<string, string[]> = {
      ours: [],
      theirs: [],
      delete: [],
      manual: [],
    };
    for (const p of diffNames) buckets[classify(p)].push(p);
    for (const k of ["ours", "theirs", "delete", "manual"] as const) {
      if (buckets[k].length) {
        console.log(`  ${k} (${buckets[k].length}):`);
        for (const p of buckets[k].slice(0, 30)) console.log(`    - ${p}`);
        if (buckets[k].length > 30)
          console.log(`    … and ${buckets[k].length - 30} more`);
      }
    }
    console.log(`\n[dry-run] No changes made. Run without --dry-run to merge.`);
    return;
  }

  console.log(`Merging ${upstreamRef} into ${branch}…`);
  const mergeRes = run(
    "git",
    ["merge", "--no-edit", "--no-commit", upstreamRef],
    {
      allowFail: true,
    },
  );

  if (mergeRes.status === 0) {
    // Clean merge — commit it
    const msg = `chore(sync): merge ${upstreamRef} into ${branch}`;
    run("git", ["commit", "-m", msg]);
    console.log(`Committed: ${msg}`);
    await postSteps(args, upstreamRef, branch);
    return;
  }

  // Conflicted — auto-resolve whitelisted paths
  const unmerged = listUnmerged();
  if (unmerged.length === 0) {
    // Merge failed but no U entries (e.g. already handled?) — show output
    console.error(mergeRes.stdout || mergeRes.stderr);
    process.exit(mergeRes.status);
  }

  console.log(`\nConflicts detected (${unmerged.length}):`);
  for (const e of unmerged) console.log(`  ${e.x}${e.y} ${e.path}`);

  const { resolved, manual } = autoResolve(unmerged);
  if (resolved.length) {
    console.log(`\nAuto-resolved (${resolved.length}):`);
    for (const r of resolved) console.log(`  ${r}`);
  }

  const remaining = listUnmerged();
  if (remaining.length === 0) {
    const msg = `chore(sync): merge ${upstreamRef} into ${branch}`;
    run("git", ["commit", "-m", msg]);
    console.log(`\nAll conflicts auto-resolved. Committed: ${msg}`);
    await postSteps(args, upstreamRef, branch);
    return;
  }

  console.log(`\nManual fix needed (${remaining.length}):`);
  for (const e of remaining) console.log(`  ${e.x}${e.y} ${e.path}`);
  console.log(
    `\nAuto-resolved ${resolved.length} path(s); ${remaining.length} left unmerged.`,
  );
  console.log(`Fix them, then:  git add <paths> && git commit`);
  console.log(`To abort:  git merge --abort`);
  if (manual.length) {
    console.log(`\nUnclassified paths (no ownership rule):`);
    for (const p of manual) console.log(`  - ${p}`);
  }
  process.exit(1);
}

async function postSteps(
  args: Args,
  upstreamRef: string,
  branch: string,
): Promise<void> {
  // Detect whether bun.lock changed in the merge commit
  let lockChanged = false;
  let profileChanged = false;
  try {
    const changed = mustRun("git", ["diff", "--name-only", "HEAD~1", "HEAD"]);
    const files = changed.split("\n").map((s) => s.trim());
    lockChanged = files.includes("bun.lock") || files.includes("package.json");
    profileChanged = files.some(
      (f) =>
        f.startsWith("src/site/profiles/") ||
        f === "src/site/metadata.ts" ||
        f === "src/config/theme-profiles.ts",
    );
  } catch {
    // ignore
  }

  if (lockChanged) {
    console.log(`\nLockfile changed — installing…`);
    const r = run("bun", ["install"], { stdio: "inherit", allowFail: true });
    if (r.status !== 0) {
      console.warn("bun install failed — run it manually.");
    }
  }

  if (profileChanged) {
    console.log(
      `\nTip: theme profiles/browserColor changed — if favicons look stale, run:`,
    );
    console.log(`  bun run generate:favicons`);
  }

  if (args.noVerify) {
    console.log(`\nSkipping post-merge checks (--no-verify).`);
    console.log(`Next:  git push origin ${branch}   (never push to main)`);
    return;
  }

  console.log(`\nRunning post-merge checks (astro)…`);
  const check = run("bun", ["run", "check:astro"], {
    stdio: "inherit",
    allowFail: true,
  });
  if (check.status !== 0) {
    console.warn(`\ncheck:astro reported issues — fix them before pushing.`);
    console.log(
      `Next:  git push origin ${branch}   (when green; never push to main)`,
    );
    return;
  }
  console.log(
    `\nSync done. Next:  git push origin ${branch}   (never push to main)`,
  );
  void upstreamRef;
}

await main();
