/**
 * ramen foundry core architecture profiles for dsh-ramen-guard.
 *
 * Each profile names one production bundle and carries the metadata a demo
 * needs: the matching ramen foundry template, the tool names the template
 * governs, and a small illustrative tool intent. ramen foundry is a Python
 * package, so only this metadata is embedded here. Its local pre-checks are not
 * ported: the bundle evaluates whatever evidence the tool call carries.
 *
 * Sample intents are illustrative inputs. They make no claim about the verdict.
 */

export const PROFILE_IDS = [
  "authorization",
  "eligibility",
  "provenance",
  "kinematic",
  "shield",
] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];

export interface ProfileIntent {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface FoundryProfile {
  id: ProfileId;
  label: string;
  /** Production bundle slug evaluated for this profile. */
  bundleId: string;
  /** ramen foundry template that governs the same bundle. */
  foundryTemplate: string;
  /** Tool names the template governs. Use them in `routes`. */
  tools: readonly string[];
  coverage: string;
  /** Short note for the keyless trial, when the profile has a limit worth stating. */
  trialNote?: string;
  /** One illustrative tool intent that fits in a keyless trial request. */
  sampleIntent: ProfileIntent;
}

const profiles: Record<ProfileId, FoundryProfile> = {
  authorization: {
    id: "authorization",
    label: "Financial and authorization gates",
    bundleId: "ramen__financial_authorization_invariance",
    foundryTemplate: "AuthorizationGateAgent",
    tools: ["approve_expenditure", "release_payment"],
    coverage:
      "System-of-record budget clearance, platform order limit, cumulative vendor exposure and independent out-of-band approvals.",
    sampleIntent: {
      tool: "release_payment",
      arguments: {
        payment: {
          amount_usd: 40000,
          payee: "Northwind Logistics",
          payee_account: "ACCT-0042",
          approvals: [],
        },
      },
    },
  },
  eligibility: {
    id: "eligibility",
    label: "Contractual and eligibility logic",
    bundleId: "ramen__contractual_eligibility_invariance",
    foundryTemplate: "EligibilityGateAgent",
    tools: ["confirm_eligibility", "bind_contract_terms"],
    coverage:
      "Verified coverage window, exclusions as written, out-of-band inspection evidence and scheduled limits.",
    sampleIntent: {
      tool: "confirm_eligibility",
      arguments: {
        claim: {
          subject_id: "CLM-9042",
          approved_amount_usd: 18500,
          eligibility_facts: { claim_id: "CLM-9042", loss_in_term: true },
        },
      },
    },
  },
  provenance: {
    id: "provenance",
    label: "Compliance and provenance traceability",
    bundleId: "ramen__compliance_provenance_invariance",
    foundryTemplate: "ProvenanceGateAgent",
    tools: ["submit_filing", "release_report"],
    coverage:
      "Verified current evidence, subject and record-type binding, tokens as issued and no self-attestation.",
    trialNote:
      "Real evidence sets usually exceed the 2,048-byte trial body. Use an API key for full provenance checks.",
    sampleIntent: {
      tool: "submit_filing",
      arguments: {
        filing: { subject_id: "ENT-1187", record_type: "annual_report" },
        evidence: [],
      },
    },
  },
  kinematic: {
    id: "kinematic",
    label: "Cyber-physical kinematic governance",
    bundleId: "ramen__industrial_iot_actuation_invariance",
    foundryTemplate: "IndustrialAutomationAgent",
    tools: ["adjust_plc_setpoint", "mutate_safety_parameter", "dispatch_manipulation"],
    coverage:
      "Telemetry degradation, safety envelope and slew rate, SIS isolation and interlocks, and physical safety around people.",
    sampleIntent: {
      tool: "dispatch_manipulation",
      arguments: {
        robot_id: "arm-07",
        action_type: "transfer",
        target_object: "bread loaf",
        destination_target: "conveyor-2",
        commanded_velocity_mps: 0.25,
        commanded_force_nm: 4,
        human_proximity_meters: 1.2,
        active_hazard_flags: [],
        scene_context_id: "scene-001",
      },
    },
  },
  shield: {
    id: "shield",
    label: "Core IT shield",
    bundleId: "ramen__shield_core_it",
    foundryTemplate: "DevboxShieldAgent, DbShieldAgent, ScoutShieldAgent",
    tools: ["inspect_directory", "delete_path", "terminate_process"],
    coverage:
      "Destructive execution, infrastructure abuse, secret exfiltration, prompt leakage, jailbreaks and indirect prompt injection.",
    sampleIntent: {
      tool: "delete_path",
      arguments: { path: "/var/lib/app/data", recursive: true },
    },
  },
};

export const PROFILES: Readonly<Record<ProfileId, FoundryProfile>> = Object.freeze(profiles);

export function isProfileId(value: unknown): value is ProfileId {
  return typeof value === "string" && (PROFILE_IDS as readonly string[]).includes(value);
}

export function profileBundleId(id: ProfileId): string {
  return PROFILES[id].bundleId;
}
