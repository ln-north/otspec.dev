/**
 * 責務：Feature タグページが使う共有コンポーネント群のバレル export
 * 動作：MDX から `import { FeatureHeader, FeatureDemo, EngineCompat, BinaryDetails, SpecLink }
 *       from "@/components/features";` の1行で読み込めるようにする
 */
export { default as FeatureHeader } from "./FeatureHeader.astro";
export { default as FeatureDemo } from "./FeatureDemo";
export { default as EngineCompat } from "./EngineCompat.astro";
export { default as BinaryDetails } from "./BinaryDetails.astro";
export { default as SpecLink } from "./SpecLink.astro";
