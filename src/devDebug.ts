// 開発時のみ動的 import される。本番バンドルには含めない。
import { buildPoseJson, parsePoseJson, serializePose } from "./pose/poseJson";
import { generatePrompt } from "./pose/promptGenerator";

(
  window as unknown as { __debug: Record<string, unknown> }
).__debug = { buildPoseJson, parsePoseJson, serializePose, generatePrompt };

console.log("[devDebug] window.__debug 準備完了");
