import { getExtension } from "./languageMap";

/**
 * Sanitizes a string by replacing invalid filename characters with underscores
 * and trimming whitespace.
 */
export const sanitizeFilename = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "") // Keep only letters, numbers, and spaces
    .trim()
    .replace(/\s+/g, "_"); // Replace spaces with underscores
};

/**
 * Generates the final path for the file to be uploaded to GitHub.
 *
 * Example:
 * problemId: "71A"
 * problemName: "Way Too Long Words"
 * language: "GNU C++20"
 * useSubdirectory: true
 * subdirectoryName: "solutions"
 * Output: "solutions/71A_WayTooLongWords.cpp"
 */
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
    // Ensure subdirectory name doesn't start or end with slash
    const subDir = subdirectoryName.replace(/^\/+|\/+$/g, "");
    return `${subDir}/${filename}`;
  }

  return filename;
};
