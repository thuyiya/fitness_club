// Metro does not understand pnpm workspaces out of the box. Without these two
// settings it will fail to resolve @wellness/shared and will not hot-reload
// edits made in packages/.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so changes in packages/ trigger a rebuild.
config.watchFolders = [workspaceRoot];

// 2. Resolve from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Prevent duplicate React copies, which cause "invalid hook call".
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
