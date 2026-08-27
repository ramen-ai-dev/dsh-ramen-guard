import type { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
export declare const name = "dsh-ramen-guard";
export declare const inject: string[];
export declare const BOUNDARY_UNAVAILABLE_REASON = "ramen ai execution boundary unavailable";
export type GuardMode = "enforce" | "audit";
interface BaseConfig {
    /** ramen-ai API key. */
    apiKey: string;
    /** Optional LLM provider API key for BYOK inference. */
    providerKey?: string;
    /** Optional ramen-ai API base URL override. */
    baseUrl?: string;
    /** Enforcement is fail-closed; audit records outcomes and delegates every call. */
    mode?: GuardMode;
}
export type Config = BaseConfig & ({
    policyIds: string[];
    bundleIds?: string[];
} | {
    bundleIds: string[];
    policyIds?: string[];
});
export declare const Config: z<Config>;
/** Install the ramen-ai semantic firewall before DeepSeek Harness tool dispatch. */
export declare function apply(ctx: Context, config: Config): void;
export {};
