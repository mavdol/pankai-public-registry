import Ajv from "ajv";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const ajv = new Ajv({ allErrors: true });

function urlToLocalPath(url) {
  if (typeof url !== "string") return null;
  const match = url.match(
    /https:\/\/mavdol\.github\.io\/pankai-public-registry\/(.+)$/
  );
  if (match) {
    return join(rootDir, match[1]);
  }
  return null;
}

function validateSchemaFile(schemaPath, schemaName) {
  if (!existsSync(schemaPath)) {
    console.error(`❌ Schema file not found: ${schemaName}`);
    return false;
  }
  try {
    JSON.parse(readFileSync(schemaPath, "utf8"));
    return true;
  } catch (error) {
    console.error(
      `❌ Invalid JSON in schema file ${schemaName}:`,
      error.message
    );
    return false;
  }
}

function findSchemaUrls(obj, urls = []) {
  if (typeof obj === "string") {
    const localPath = urlToLocalPath(obj);
    if (localPath) {
      urls.push({ url: obj, localPath });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item) => findSchemaUrls(item, urls));
  } else if (obj && typeof obj === "object") {
    Object.values(obj).forEach((value) => findSchemaUrls(value, urls));
  }
  return urls;
}

const registrySchema = JSON.parse(
  readFileSync(join(rootDir, "schemas", "registry.schema.json"), "utf8")
);
const providerSchema = JSON.parse(
  readFileSync(join(rootDir, "schemas", "provider.schema.json"), "utf8")
);

console.log("Validating registry.json...");
const registry = JSON.parse(
  readFileSync(join(rootDir, "registry.json"), "utf8")
);
const validateRegistry = ajv.compile(registrySchema);

if (!validateRegistry(registry)) {
  console.error("❌ registry.json validation failed:");
  console.error(JSON.stringify(validateRegistry.errors, null, 2));
  process.exit(1);
}
console.log("✅ registry.json is valid\n");

console.log("Validating provider files...");
const providersDir = join(rootDir, "providers");
const validateProvider = ajv.compile(providerSchema);

let hasErrors = false;

for (const providerName of readdirSync(providersDir)) {
  const providerPath = join(providersDir, providerName);
  if (!statSync(providerPath).isDirectory()) continue;

  const providerJsonPath = join(providerPath, `${providerName}.json`);
  try {
    const provider = JSON.parse(readFileSync(providerJsonPath, "utf8"));

    // Find all schema URL references and validate they exist locally
    const schemaUrls = findSchemaUrls(provider);
    for (const { url, localPath } of schemaUrls) {
      const relativePath = localPath.replace(rootDir + "/", "");
      if (!validateSchemaFile(localPath, relativePath)) {
        hasErrors = true;
      }
    }

    if (!validateProvider(provider)) {
      console.error(`❌ ${providerName}.json validation failed:`);
      console.error(JSON.stringify(validateProvider.errors, null, 2));
      hasErrors = true;
    } else {
      console.log(`✅ ${providerName}.json is valid`);
    }
  } catch (error) {
    console.error(`❌ Error reading ${providerName}.json:`, error.message);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("\n❌ Validation failed");
  process.exit(1);
}

console.log("\n✅ All validations passed!");
