import { PRODUCTION_BUNDLE_IDS, TRIAL_BUNDLE_IDS, TRIAL_MAX_BODY_BYTES } from "@ramen-ai/node-core";
import { describe, expect, it } from "vitest";

import * as entry from "../src/index.js";
import { PROFILES, PROFILE_IDS, isProfileId, profileBundleId } from "../src/profiles.js";

describe("foundry profiles", () => {
  it("exposes the five core architecture profiles", () => {
    expect([...PROFILE_IDS]).toEqual(["authorization", "eligibility", "provenance", "kinematic", "shield"]);
    expect(Object.keys(PROFILES).sort()).toEqual([...PROFILE_IDS].sort());
  });

  it("keys every profile by its own id and gives each a distinct bundle", () => {
    for (const id of PROFILE_IDS) expect(PROFILES[id].id).toBe(id);
    const bundles = PROFILE_IDS.map(profileBundleId);
    expect(new Set(bundles).size).toBe(bundles.length);
  });

  it("names only production bundles that the keyless trial lists", () => {
    for (const id of PROFILE_IDS) {
      const bundle = PROFILES[id].bundleId;
      expect(PRODUCTION_BUNDLE_IDS as readonly string[]).toContain(bundle);
      expect(TRIAL_BUNDLE_IDS as readonly string[]).toContain(bundle);
    }
  });

  it("keeps each sample intent inside the keyless trial body limit", () => {
    for (const id of PROFILE_IDS) {
      const profile = PROFILES[id];
      expect(profile.tools).toContain(profile.sampleIntent.tool);
      const body = JSON.stringify({
        input: JSON.stringify({ tool: profile.sampleIntent.tool, arguments: profile.sampleIntent.arguments }),
        bundle_ids: [profile.bundleId],
      });
      expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(TRIAL_MAX_BODY_BYTES);
    }
  });

  it("recognises only known profile ids", () => {
    expect(isProfileId("kinematic")).toBe(true);
    expect(isProfileId("payments")).toBe(false);
    expect(isProfileId(undefined)).toBe(false);
  });

  it("is re-exported from the plugin entry point without disturbing the Cordis exports", () => {
    expect(entry.PROFILES).toBe(PROFILES);
    expect(entry.name).toBe("dsh-ramen-guard");
    expect(entry.inject).toEqual(["tools"]);
    expect(typeof entry.apply).toBe("function");
  });
});
