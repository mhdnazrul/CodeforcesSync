import { getExtension } from "./languageMap";

export const sanitizeFilename = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
};

export const generateFilePath = (
  problemId: string,
  problemName: string,
  language: string,
  useSubdirectory: boolean,
  subdirectoryName: string,
): string => {
  const sanitizedName = sanitizeFilename(problemName);
  const ext = getExtension(language);

  const filename = `${problemId}_${sanitizedName}${ext}`;

  if (useSubdirectory && subdirectoryName) {
    const subDir = subdirectoryName.replace(/^\/+|\/+$/g, "");
    return `${subDir}/${filename}`;
  }

  return filename;
};
