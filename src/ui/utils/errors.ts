export function safeErrorString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred";
}

export function validateGithubRepo(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Repository URL is required";
  const githubUrlPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#.?]+)/;
  const repoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  if (!githubUrlPattern.test(trimmed) && !repoPattern.test(trimmed)) {
    return "Enter a valid GitHub URL or owner/repo name";
  }
  return null;
}

export function validateCodeforcesHandle(handle: string): string | null {
  const trimmed = handle.trim();
  if (!trimmed) return "Handle is required";
  if (trimmed.length < 3) return "Handle must be at least 3 characters";
  if (trimmed.length > 24) return "Handle must be at most 24 characters";
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return "Handle can only contain letters, numbers, hyphens, and underscores";
  return null;
}
