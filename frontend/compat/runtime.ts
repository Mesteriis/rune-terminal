import {
  bootstrapRuntime,
  getRuntimeContext,
  type RuntimeConfig,
  resolveRuntimeConfig,
} from "@/runtime";

export type CompatRuntimeContext = ReturnType<typeof getRuntimeContext>;

export interface CompatRuntime {
  config: RuntimeConfig;
  context: CompatRuntimeContext;
}

export async function resolveCompatRuntimeConfig(): Promise<RuntimeConfig> {
  return resolveRuntimeConfig();
}

export async function bootstrapCompatRuntime(): Promise<CompatRuntime> {
  const result = await bootstrapRuntime();
  return {
    config: result.config,
    context: getRuntimeContext(),
  };
}
