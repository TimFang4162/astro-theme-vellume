import { getContentEntries } from "../../../markdown/asset-utils";
import {
  extractMathAssets,
  type MathAsset,
} from "../../../markdown/math-assets";
import {
  compileTypstMath,
  createCompileErrorSvg,
} from "../../../markdown/renderers";

export async function getStaticPaths() {
  const entries = await getContentEntries();

  const mathAssets = new Map<string, MathAsset>();

  for (const entry of entries) {
    for (const mathAsset of extractMathAssets(entry.body ?? "")) {
      mathAssets.set(mathAsset.asset, mathAsset);
    }
  }

  return [...mathAssets.values()].map((mathAsset) => ({
    params: { asset: mathAsset.asset },
    props: mathAsset,
  }));
}

export async function GET({ props }: { props: MathAsset }) {
  try {
    const svg = await compileTypstMath(props.source, props.displayMode);

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[rendered-math] Failed to compile typst math asset ${props.asset}\n${message}\n--- source ---\n${props.source}`,
    );

    return new Response(
      createCompileErrorSvg("Typst math compile error", message),
      {
        status: 500,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
