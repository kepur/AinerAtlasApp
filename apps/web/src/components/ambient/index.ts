export { default as AmbientScene } from "./AmbientScene";
export { default as CompanionPet } from "./CompanionPet";
export type { CompanionPetProps } from "./CompanionPet";
export { default as CssCompanionPet } from "./CssCompanionPet";
export { default as ThreeCompanionPetSlot } from "./ThreeCompanionPetSlot";
export { deriveChatSceneMood, deriveVoiceSceneMood } from "./deriveSceneMood";
export type { CompanionPetRenderer, SceneMood } from "./types";

/** @deprecated Use SceneMood */
export type VoiceSceneMood = import("./types").SceneMood;
