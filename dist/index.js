import z from "@deepseek-ai/schemastery";
import { RamenClient } from "@ramen-ai/node-core";
export const name = "dsh-ramen-guard";
export const inject = ["tools"];
export const BOUNDARY_UNAVAILABLE_REASON = "ramen ai execution boundary unavailable";
const DENIED_WITHOUT_STEERING_REASON = "ramen ai denied tool execution";
const configSchema = z.object({
    apiKey: z.string().required(),
    baseUrl: z.string(),
    mode: z.union(["enforce", "audit"]).default("enforce"),
    bundleIds: z.array(z.string().required()),
    policyIds: z.array(z.string().required()),
});
export const Config = z.transform(configSchema, (config) => {
    if (!config.bundleIds?.length && !config.policyIds?.length) {
        throw new Error("provide at least one policyId or bundleId");
    }
    return config;
});
function evaluationOptions(config, toolName) {
    return {
        ...(config.bundleIds?.length ? { bundleIds: config.bundleIds } : {}),
        ...(config.policyIds?.length ? { policyIds: config.policyIds } : {}),
        context: { tool_name: toolName },
    };
}
function hasVerifiedReceipt(verdict) {
    return verdict.receipt !== undefined && verdict.receiptVerified;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
async function evaluateWithCancellation(client, payload, options, signal) {
    let onAbort;
    const aborted = new Promise((_resolve, reject) => {
        onAbort = () => {
            const error = new Error("tool execution aborted");
            error.name = "AbortError";
            reject(error);
        };
        if (signal.aborted)
            onAbort();
        else
            signal.addEventListener("abort", onAbort, { once: true });
    });
    try {
        return await Promise.race([
            client.evaluateCompliance(payload, options),
            aborted,
        ]);
    }
    finally {
        if (onAbort)
            signal.removeEventListener("abort", onAbort);
    }
}
/** Install the ramen-ai semantic firewall before DeepSeek Harness tool dispatch. */
export function apply(ctx, config) {
    if (!config.apiKey) {
        throw new Error("dsh-ramen-guard: apiKey is required");
    }
    if (!config.bundleIds?.length && !config.policyIds?.length) {
        throw new Error("dsh-ramen-guard: provide at least one policyId or bundleId");
    }
    const mode = config.mode ?? "enforce";
    const client = new RamenClient({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
    });
    ctx.on("tools/pre-execute", async (exec, next) => {
        const payload = JSON.stringify({
            tool: exec.name,
            arguments: exec.arguments,
        });
        let verdict;
        try {
            verdict = await evaluateWithCancellation(client, payload, evaluationOptions(config, exec.name), exec.signal);
        }
        catch (error) {
            if (mode === "audit") {
                ctx.logger.warn(`dsh-ramen-guard audit: evaluation unavailable for tool "${exec.name}": ${errorMessage(error)}`);
                return next();
            }
            return { kind: "deny", reason: BOUNDARY_UNAVAILABLE_REASON };
        }
        if (mode === "audit") {
            ctx.logger.info(`dsh-ramen-guard audit: tool "${exec.name}" verdict=${verdict.allowed ? "allow" : "deny"} receipt=${hasVerifiedReceipt(verdict) ? "verified" : "unverified"}`);
            return next();
        }
        if (!hasVerifiedReceipt(verdict)) {
            return { kind: "deny", reason: BOUNDARY_UNAVAILABLE_REASON };
        }
        if (!verdict.allowed) {
            return {
                kind: "deny",
                reason: verdict.steering ?? DENIED_WITHOUT_STEERING_REASON,
            };
        }
        return next();
    });
}
