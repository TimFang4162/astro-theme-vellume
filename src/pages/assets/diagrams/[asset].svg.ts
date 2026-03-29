import { getContentEntries } from "../../../markdown/asset-utils";
import {
  createDiagramAssetName,
  type DiagramAsset,
  extractDiagramAssets,
} from "../../../markdown/diagram-assets";
import {
  compileMermaid,
  compileTypst,
  createCompileErrorSvg,
} from "../../../markdown/renderers";

export async function getStaticPaths() {
  const entries = await getContentEntries();

  const diagrams = new Map<string, DiagramAsset>();

  for (const entry of entries) {
    for (const diagram of extractDiagramAssets(entry.body ?? "")) {
      diagrams.set(
        createDiagramAssetName(diagram.language, diagram.source),
        diagram,
      );
    }
  }

  return [...diagrams.values()].map((diagram) => ({
    params: { asset: diagram.asset },
    props: diagram,
  }));
}

export async function GET({ props }: { props: DiagramAsset }) {
  try {
    const svg =
      props.language === "typst"
        ? await compileTypst(props.source)
        : await compileMermaid(props.source);

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[rendered-diagram] Failed to compile ${props.language} asset ${props.asset}\n${message}\n--- source ---\n${props.source}`,
    );

    return new Response(
      createCompileErrorSvg(
        `${props.language.toUpperCase()} compile error`,
        message,
      ),
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
