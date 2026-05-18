const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const sharedDistEntry = path.join(workspaceRoot, "packages/shared/dist/index.js");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@padel/shared" && fs.existsSync(sharedDistEntry)) {
    return context.resolveRequest(context, sharedDistEntry, platform);
  }

  // TypeScript ESM source uses .js extensions; Metro needs .ts/.tsx on disk.
  if (moduleName.endsWith(".js") && moduleName.startsWith(".")) {
    const withoutJs = moduleName.replace(/\.js$/, "");
    try {
      return context.resolveRequest(context, withoutJs, platform);
    } catch {
      // fall through to default resolver
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
