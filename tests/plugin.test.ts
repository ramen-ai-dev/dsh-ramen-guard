import type { Context } from "@deepseek-ai/cordis";
import type { PreToolDecision, ToolExecution } from "@deepseek-ai/dsh-tools";
import type { ComplianceVerdict } from "@ramen-ai/node-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  evaluateCompliance: vi.fn(),
  tryEvaluate: vi.fn(),
  RamenClient: vi.fn(),
  trial: vi.fn(),
  verifyAllowReceiptSignature: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@ramen-ai/node-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ramen-ai/node-core")>();
  return {
    ...actual,
    RamenClient: Object.assign(mocks.RamenClient, { trial: mocks.trial }),
    verifyAllowReceiptSignature: mocks.verifyAllowReceiptSignature,
  };
});

import { RamenTrialError, TrialLimitError } from "@ramen-ai/node-core";
import {
  apply,
  BOUNDARY_UNAVAILABLE_REASON,
  Config as ConfigSchema,
  NO_PROFILE_REASON,
  type Config,
} from "../src/index.js";

const CONFIG: Config = {
  apiKey: "ramen_ak_test",
  policyIds: ["policy-test"],
};

const TRIAL_CONFIG: Config = { profile: "shield" };

const SHIELD = "ramen__shield_core_it";
const AUTHORIZATION = "ramen__financial_authorization_invariance";

const EXECUTION = {
  name: "shell",
  arguments: { command: "rm -rf /" },
  signal: new AbortController().signal,
} as ToolExecution;

type PreExecuteListener = (
  exec: ToolExecution,
  next: () => Promise<PreToolDecision>,
) => Promise<PreToolDecision>;

function verdict(
  allowed: boolean,
  options: { steering?: string | null; receipt?: "verified" | "missing" | "invalid" } = {},
): ComplianceVerdict {
  const receiptState = options.receipt ?? "verified";
  const receipt = receiptState === "missing"
    ? undefined
    : {
        id: "receipt-test",
        schema_version: "5.0",
        kid: "test-key",
        signature: "signature",
        canonical_payload: "payload",
      };

  return {
    allowed,
    steering: options.steering ?? null,
    policyIds: ["policy-test"],
    statutoryAnchors: [],
    receipt,
    receiptVerified: receiptState === "verified",
    data: {
      allowed,
      policy_ids: ["policy-test"],
      policies_evaluated: 1,
      policies_passed: allowed ? 1 : 0,
      policies_failed: allowed ? 0 : 1,
      policies_errored: 0,
      total_violations: [],
      results: [],
      execution_time_ms: 1,
      executed_at: "2026-08-25T00:00:00.000Z",
      receipt,
    },
  };
}

function mount(config: Config = CONFIG) {
  let listener: PreExecuteListener | undefined;
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
  };
  const ctx = {
    logger,
    on: vi.fn((event: string, callback: PreExecuteListener) => {
      expect(event).toBe("tools/pre-execute");
      listener = callback;
      return vi.fn();
    }),
  } as unknown as Context;

  apply(ctx, config);
  if (!listener) throw new Error("pre-execute listener was not registered");
  return { listener, logger };
}

const allow = () => Promise.resolve({ kind: "allow" } as PreToolDecision);

beforeAll(() => {
  vi.stubGlobal("fetch", mocks.fetch);
});

afterAll(() => {
  // The whole suite is offline: nothing may reach the network layer.
  expect(mocks.fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.RamenClient.mockImplementation(() => ({ evaluateCompliance: mocks.evaluateCompliance }));
  mocks.trial.mockImplementation(() => ({ tryEvaluate: mocks.tryEvaluate }));
  mocks.verifyAllowReceiptSignature.mockResolvedValue({ valid: true });
});

describe("configuration", () => {
  it.each([
    {
      label: "policy-only enforcement",
      input: { apiKey: "ramen_ak_test", policyIds: ["policy-test"] },
      expectedMode: "enforce",
    },
    {
      label: "bundle-only audit",
      input: { apiKey: "ramen_ak_test", bundleIds: ["bundle-test"], mode: "audit" },
      expectedMode: "audit",
    },
    {
      label: "combined policy and bundle enforcement",
      input: {
        apiKey: "ramen_ak_test",
        providerKey: "provider_key_test",
        policyIds: ["policy-test"],
        bundleIds: ["bundle-test"],
        mode: "enforce",
      },
      expectedMode: "enforce",
    },
    {
      label: "profile-only keyless trial",
      input: { profile: "authorization" },
      expectedMode: "enforce",
    },
    {
      label: "routes-only keyless trial",
      input: { routes: { release_payment: "authorization", delete_path: "shield" } },
      expectedMode: "enforce",
    },
    {
      label: "profile with routes and an API key",
      input: { apiKey: "ramen_ak_test", profile: "shield", routes: { release_payment: "authorization" } },
      expectedMode: "enforce",
    },
  ] as const)("accepts $label", ({ input, expectedMode }) => {
    expect(ConfigSchema(input as never).mode).toBe(expectedMode);
  });

  it.each([
    { label: "an API key with no scope", input: { apiKey: "ramen_ak_test" } },
    { label: "no key and no scope", input: {} },
    { label: "fail-open mode", input: { apiKey: "ramen_ak_test", policyIds: ["policy-test"], mode: "fail-open" } },
    { label: "an unknown profile", input: { profile: "payments" } },
    { label: "an unknown route profile", input: { routes: { release_payment: "payments" } } },
  ])("rejects $label", ({ input }) => {
    expect(() => ConfigSchema(input as never)).toThrow();
  });

  it.each(["", "   ", "\t\n"])("rejects an empty or blank apiKey %j instead of using the trial", (apiKey) => {
    expect(() => ConfigSchema({ apiKey, profile: "shield" } as never)).toThrow(/empty/);
    expect(() => apply({ logger: {}, on: vi.fn() } as unknown as Context, { apiKey, profile: "shield" })).toThrow(/empty/);
    expect(mocks.trial).not.toHaveBeenCalled();
    expect(mocks.RamenClient).not.toHaveBeenCalled();
  });

  it("rejects a null apiKey instead of using the trial", () => {
    expect(() => apply({ logger: {}, on: vi.fn() } as unknown as Context, { apiKey: null, profile: "shield" } as never)).toThrow();
    expect(mocks.trial).not.toHaveBeenCalled();
  });

  it("rejects providerKey and policyIds without an apiKey", () => {
    expect(() => ConfigSchema({ providerKey: "provider_key_test", profile: "shield" } as never)).toThrow(/providerKey/);
    expect(() => ConfigSchema({ policyIds: ["policy-test"], profile: "shield" } as never)).toThrow(/policyIds/);
  });

  it("rejects a keyless scope that resolves to more than one bundle", () => {
    expect(() => ConfigSchema({ profile: "shield", bundleIds: [AUTHORIZATION] } as never)).toThrow(/exactly one bundle/);
    expect(() => ConfigSchema({ bundleIds: [SHIELD, AUTHORIZATION] } as never)).toThrow(/exactly one bundle/);
  });

  it("accepts a keyless profile that names the same bundle as bundleIds", () => {
    expect(() => ConfigSchema({ profile: "shield", bundleIds: [SHIELD] } as never)).not.toThrow();
  });

  it("rejects a keyless bundle outside the trial list", () => {
    expect(() => ConfigSchema({ bundleIds: ["bundle-test"] } as never)).toThrow(/not available in the keyless trial/);
  });
});

describe("dsh-ramen-guard with an API key", () => {
  it("delegates an allowed execution with a verified receipt", async () => {
    mocks.evaluateCompliance.mockResolvedValue(verdict(true));
    const { listener } = mount();
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({ kind: "allow" });
    expect(next).toHaveBeenCalledOnce();
    expect(mocks.verifyAllowReceiptSignature).toHaveBeenCalledOnce();
  });

  it("denies a blocked execution with the steering rationale", async () => {
    mocks.evaluateCompliance.mockResolvedValue(
      verdict(false, { steering: "Use a non-destructive command." }),
    );
    const { listener } = mount();
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({
      kind: "deny",
      reason: "Use a non-destructive command.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed with the fixed reason when evaluation is unavailable", async () => {
    mocks.evaluateCompliance.mockRejectedValue(new Error("request timed out"));
    const { listener } = mount();
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({
      kind: "deny",
      reason: BOUNDARY_UNAVAILABLE_REASON,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("observes tool cancellation while evaluation is pending", async () => {
    mocks.evaluateCompliance.mockReturnValue(new Promise(() => {}));
    const { listener } = mount();
    const next = vi.fn().mockResolvedValue({ kind: "allow" });
    const controller = new AbortController();
    const pending = listener(
      { ...EXECUTION, signal: controller.signal } as ToolExecution,
      next,
    );

    controller.abort();

    await expect(pending).resolves.toEqual({
      kind: "deny",
      reason: BOUNDARY_UNAVAILABLE_REASON,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["missing", "invalid"] as const)(
    "fails closed when the cryptographic receipt is %s",
    async (receipt) => {
      mocks.evaluateCompliance.mockResolvedValue(verdict(true, { receipt }));
      const { listener } = mount();
      const next = vi.fn().mockResolvedValue({ kind: "allow" });

      await expect(listener(EXECUTION, next)).resolves.toEqual({
        kind: "deny",
        reason: BOUNDARY_UNAVAILABLE_REASON,
      });
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("denies an allow whose signed verdict is not ALLOW", async () => {
    mocks.evaluateCompliance.mockResolvedValue(verdict(true));
    mocks.verifyAllowReceiptSignature.mockResolvedValue({ valid: false, reason: "signed verdict is BLOCK" });
    const { listener } = mount();
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({
      kind: "deny",
      reason: BOUNDARY_UNAVAILABLE_REASON,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("denies an allow when signature verification throws", async () => {
    mocks.evaluateCompliance.mockResolvedValue(verdict(true));
    mocks.verifyAllowReceiptSignature.mockRejectedValue(new Error("crypto unavailable"));
    const { listener } = mount();
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({
      kind: "deny",
      reason: BOUNDARY_UNAVAILABLE_REASON,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("sends the tool intent and configured policy scope to node-core", async () => {
    mocks.evaluateCompliance.mockResolvedValue(verdict(true));
    const { listener } = mount({
      apiKey: "ramen_ak_test",
      providerKey: "provider_key_test",
      bundleIds: ["bundle-test"],
      policyIds: ["policy-test"],
    });

    await listener(EXECUTION, allow);

    expect(mocks.RamenClient).toHaveBeenCalledWith({
      apiKey: "ramen_ak_test",
      providerKey: "provider_key_test",
    });
    expect(mocks.evaluateCompliance).toHaveBeenCalledWith(
      JSON.stringify({ tool: "shell", arguments: { command: "rm -rf /" } }),
      {
        bundleIds: ["bundle-test"],
        policyIds: ["policy-test"],
        context: { tool_name: "shell" },
      },
    );
  });

  it("never uses the keyless trial when a key is set", async () => {
    mocks.evaluateCompliance.mockRejectedValue(new Error("HTTP 401"));
    const { listener } = mount({ apiKey: "ramen_ak_invalid", profile: "shield" });

    await expect(listener(EXECUTION, allow)).resolves.toEqual({
      kind: "deny",
      reason: BOUNDARY_UNAVAILABLE_REASON,
    });
    expect(mocks.trial).not.toHaveBeenCalled();
    expect(mocks.tryEvaluate).not.toHaveBeenCalled();
  });

  it("resolves a profile and per-tool routes to bundle scopes", async () => {
    mocks.evaluateCompliance.mockResolvedValue(verdict(true));
    const { listener } = mount({
      apiKey: "ramen_ak_test",
      profile: "shield",
      policyIds: ["policy-test"],
      routes: { release_payment: "authorization" },
    });

    await listener({ ...EXECUTION, name: "release_payment" } as ToolExecution, allow);
    await listener(EXECUTION, allow);

    expect(mocks.evaluateCompliance.mock.calls[0][1]).toEqual({
      bundleIds: [AUTHORIZATION],
      context: { tool_name: "release_payment" },
    });
    expect(mocks.evaluateCompliance.mock.calls[1][1]).toEqual({
      bundleIds: [SHIELD],
      policyIds: ["policy-test"],
      context: { tool_name: "shell" },
    });
  });

  it("audit mode logs a denied verdict and delegates execution", async () => {
    mocks.evaluateCompliance.mockResolvedValue(
      verdict(false, { steering: "Would be blocked." }),
    );
    const { listener, logger } = mount({ ...CONFIG, mode: "audit" });
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({ kind: "allow" });
    expect(next).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("verdict=deny"));
  });

  it("audit mode logs infrastructure failures and delegates execution", async () => {
    mocks.evaluateCompliance.mockRejectedValue(new Error("HTTP 500"));
    const { listener, logger } = mount({ ...CONFIG, mode: "audit" });
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({ kind: "allow" });
    expect(next).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("HTTP 500"));
  });
});

describe("dsh-ramen-guard in keyless trial mode", () => {
  const quota = { limit: 10, remaining: 0, resetEpochSeconds: 1_795_564_800 };

  it("uses the trial client and never constructs an authenticated client", async () => {
    mocks.tryEvaluate.mockResolvedValue({ ...verdict(true), trial: { remaining: 9 } });
    const { listener, logger } = mount(TRIAL_CONFIG);
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({ kind: "allow" });

    expect(mocks.trial).toHaveBeenCalledWith({ requireVerifiedReceipt: true });
    expect(mocks.RamenClient).not.toHaveBeenCalled();
    expect(mocks.evaluateCompliance).not.toHaveBeenCalled();
    expect(mocks.tryEvaluate).toHaveBeenCalledWith(
      JSON.stringify({ tool: "shell", arguments: { command: "rm -rf /" } }),
      { bundleId: SHIELD },
    );
    expect(mocks.verifyAllowReceiptSignature).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("keyless trial"));
  });

  it("forwards only baseUrl to the trial client", () => {
    mount({ ...TRIAL_CONFIG, baseUrl: "https://eu.ramenai.dev" });
    expect(mocks.trial).toHaveBeenCalledWith({
      requireVerifiedReceipt: true,
      baseUrl: "https://eu.ramenai.dev",
    });
  });

  it("denies a blocked execution with the steering rationale", async () => {
    mocks.tryEvaluate.mockResolvedValue({ ...verdict(false, { steering: "Blocked." }), trial: {} });
    const { listener } = mount(TRIAL_CONFIG);

    await expect(listener(EXECUTION, allow)).resolves.toEqual({ kind: "deny", reason: "Blocked." });
  });

  it.each(["missing", "invalid"] as const)("fails closed when the trial receipt is %s", async (receipt) => {
    mocks.tryEvaluate.mockResolvedValue({ ...verdict(true, { receipt }), trial: {} });
    const { listener } = mount(TRIAL_CONFIG);

    await expect(listener(EXECUTION, allow)).resolves.toEqual({
      kind: "deny",
      reason: BOUNDARY_UNAVAILABLE_REASON,
    });
  });

  it("denies an allow whose signed verdict is not ALLOW", async () => {
    mocks.tryEvaluate.mockResolvedValue({ ...verdict(true), trial: {} });
    mocks.verifyAllowReceiptSignature.mockResolvedValue({ valid: false, reason: "signed verdict is BLOCK" });
    const { listener } = mount(TRIAL_CONFIG);

    await expect(listener(EXECUTION, allow)).resolves.toEqual({
      kind: "deny",
      reason: BOUNDARY_UNAVAILABLE_REASON,
    });
  });

  it("routes each tool to its own single bundle and falls back to the default profile", async () => {
    mocks.tryEvaluate.mockResolvedValue({ ...verdict(true), trial: {} });
    const { listener } = mount({ profile: "shield", routes: { release_payment: "authorization" } });

    await listener({ ...EXECUTION, name: "release_payment" } as ToolExecution, allow);
    await listener(EXECUTION, allow);

    expect(mocks.tryEvaluate.mock.calls.map((call) => call[1])).toEqual([
      { bundleId: AUTHORIZATION },
      { bundleId: SHIELD },
    ]);
  });

  it("denies an unrouted tool without a request when only routes are configured", async () => {
    const { listener } = mount({ routes: { release_payment: "authorization" } });
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    await expect(listener(EXECUTION, next)).resolves.toEqual({ kind: "deny", reason: NO_PROFILE_REASON });
    expect(mocks.tryEvaluate).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("audit mode delegates an unrouted tool and logs it", async () => {
    const { listener, logger } = mount({ routes: { release_payment: "authorization" }, mode: "audit" });

    await expect(listener(EXECUTION, allow)).resolves.toEqual({ kind: "allow" });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("no profile configured"));
    expect(mocks.tryEvaluate).not.toHaveBeenCalled();
  });

  it("denies with the scope, the UTC reset time and the signup URL when the allowance is used up", async () => {
    mocks.tryEvaluate.mockRejectedValue(
      new TrialLimitError("TRIAL_LIMIT", "try failed: limit", undefined, quota, "network", undefined, quota.resetEpochSeconds, undefined),
    );
    const { listener } = mount(TRIAL_CONFIG);
    const next = vi.fn().mockResolvedValue({ kind: "allow" });

    const decision = await listener(EXECUTION, next);

    expect(decision).toMatchObject({ kind: "deny" });
    const reason = (decision as { reason: string }).reason;
    expect(reason).toContain("per-network daily limit");
    expect(reason).toContain("scope: network");
    expect(reason).toContain(new Date(quota.resetEpochSeconds * 1000).toISOString());
    expect(reason).toContain("(UTC)");
    expect(reason).toContain("https://ramenai.dev");
    expect(reason).not.toBe(BOUNDARY_UNAVAILABLE_REASON);
    expect(next).not.toHaveBeenCalled();
  });

  it("falls back to the next 00:00 UTC when the server sent no reset time", async () => {
    mocks.tryEvaluate.mockRejectedValue(
      new TrialLimitError("TRIAL_LIMIT", "try failed: limit", undefined, {}, "global", undefined, undefined, undefined),
    );
    const { listener } = mount(TRIAL_CONFIG);

    const decision = (await listener(EXECUTION, allow)) as { reason: string };
    expect(decision.reason).toContain("global daily limit");
    expect(decision.reason).toContain("next 00:00 UTC");
  });

  it("denies an oversized request with an actionable message", async () => {
    mocks.tryEvaluate.mockRejectedValue(
      new RangeError("trial request body is 4096 bytes; the limit is 2048. Shorten the input or use an API key."),
    );
    const { listener } = mount(TRIAL_CONFIG);

    const decision = (await listener(EXECUTION, allow)) as { reason: string };
    expect(decision.reason).toContain("4096 bytes");
    expect(decision.reason).toContain("https://ramenai.dev");
  });

  it("surfaces a server rejection such as a bundle outside the trial list", async () => {
    mocks.tryEvaluate.mockRejectedValue(
      new RamenTrialError(403, "BUNDLE_NOT_ALLOWED", "try failed: bundle not allowed", undefined, {}),
    );
    const { listener } = mount(TRIAL_CONFIG);

    const decision = (await listener(EXECUTION, allow)) as { reason: string };
    expect(decision.reason).toContain("BUNDLE_NOT_ALLOWED");
    expect(decision.reason).toContain("https://ramenai.dev");
  });

  it("keeps the fixed reason for any other error", async () => {
    mocks.tryEvaluate.mockRejectedValue(new Error("network down"));
    const { listener } = mount(TRIAL_CONFIG);

    await expect(listener(EXECUTION, allow)).resolves.toEqual({
      kind: "deny",
      reason: BOUNDARY_UNAVAILABLE_REASON,
    });
  });

  it("audit mode logs a used-up allowance and delegates execution", async () => {
    mocks.tryEvaluate.mockRejectedValue(
      new TrialLimitError("TRIAL_LIMIT", "try failed: limit", undefined, quota, "network", undefined, undefined, undefined),
    );
    const { listener, logger } = mount({ ...TRIAL_CONFIG, mode: "audit" });

    await expect(listener(EXECUTION, allow)).resolves.toEqual({ kind: "allow" });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("limit"));
  });
});
