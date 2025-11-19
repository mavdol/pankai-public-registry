import { Ajv } from "npm:ajv@^8.17.1";
import {
  join,
  dirname,
  fromFileUrl,
} from "https://deno.land/std@0.208.0/path/mod.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));
const rootDir = join(__dirname, "..");

const ajv = new Ajv({ allErrors: true });

function urlToLocalPath(url: string): string | null {
  const match = url.match(
    /https:\/\/mavdol\.github\.io\/pankai-public-registry\/(.+)$/
  );
  if (match) {
    return join(rootDir, match[1]);
  }
  return null;
}

function validateSchemaFile(schemaPath: string, schemaName: string): boolean {
  try {
    const stat = Deno.statSync(schemaPath);
    if (!stat.isFile) {
      console.error(`❌ Schema path is not a file: ${schemaName}`);
      return false;
    }
  } catch {
    console.error(`❌ Schema file not found: ${schemaName}`);
    return false;
  }
  try {
    JSON.parse(Deno.readTextFileSync(schemaPath));
    return true;
  } catch (error) {
    console.error(
      `❌ Invalid JSON in schema file ${schemaName}:`,
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

function findSchemaUrls(
  obj: unknown,
  urls: Array<{ url: string; localPath: string }> = []
): Array<{ url: string; localPath: string }> {
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
  Deno.readTextFileSync(join(rootDir, "schemas", "registry.schema.json"))
);
const providerSchema = JSON.parse(
  Deno.readTextFileSync(join(rootDir, "schemas", "provider.schema.json"))
);

console.log("Validating registry.json...");
const registry = JSON.parse(
  Deno.readTextFileSync(join(rootDir, "registry.json"))
);
const validateRegistry = ajv.compile(registrySchema);

if (!validateRegistry(registry)) {
  console.error("❌ registry.json validation failed:");
  console.error(JSON.stringify(validateRegistry.errors, null, 2));
  Deno.exit(1);
}
console.log("✅ registry.json is valid\n");

console.log("Validating provider files...");
const providersDir = join(rootDir, "providers");
const validateProvider = ajv.compile(providerSchema);

let hasErrors = false;

for (const entry of Deno.readDirSync(providersDir)) {
  if (!entry.isDirectory) continue;

  const providerName = entry.name;
  const providerJsonPath = join(
    providersDir,
    providerName,
    `${providerName}.json`
  );
  try {
    const provider = JSON.parse(Deno.readTextFileSync(providerJsonPath));

    const schemaUrls = findSchemaUrls(provider);
    for (const { localPath } of schemaUrls) {
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
    console.error(
      `❌ Error reading ${providerName}.json:`,
      error instanceof Error ? error.message : String(error)
    );
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("\n❌ Validation failed");
  Deno.exit(1);
}

console.log("\n✅ All validations passed!");
