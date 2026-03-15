export const languageMap: Record<string, string> = {
  "C++11": ".cpp",
  "C++14": ".cpp",
  "C++17": ".cpp",
  "C++ 17": ".cpp",
  "C++20": ".cpp",
  "GNU C++": ".cpp",
  "GNU C++11": ".cpp",
  "GNU C++14": ".cpp",
  "GNU C++17": ".cpp",
  "GNU C++20": ".cpp",
  "MS C++": ".cpp",
  "MS C++ 2017": ".cpp",
  "GNU C": ".c",
  "GNU C11": ".c",
  C: ".c",
  Java: ".java",
  "Java 11": ".java",
  "Java 8": ".java",
  "Java 17": ".java",
  Python: ".py",
  "Python 2": ".py",
  "Python 3": ".py",
  PyPy: ".py",
  "PyPy 2": ".py",
  "PyPy 3": ".py",
  Rust: ".rs",
  "Rust 2021": ".rs",
  Go: ".go",
  Kotlin: ".kt",
  JavaScript: ".js",
  "Node.js": ".js",
  TypeScript: ".ts",
};

export const getExtension = (cfLang: string): string => {
  const langUpper = cfLang.toUpperCase();
  
  if (langUpper.includes("C++") || langUpper.includes("G++") || langUpper.includes("CLANG++")) {
    return ".cpp";
  }
  if (langUpper.includes("PYTHON") || langUpper.includes("PYPY")) {
    return ".py";
  }
  if (langUpper.includes("JAVA") && !langUpper.includes("JAVASCRIPT")) {
    return ".java";
  }
  if (langUpper.includes("CLANG") || langUpper.includes("GNU C") || langUpper === "C" || langUpper.startsWith("C ") || langUpper.includes(" C ") || /\bC\b/.test(cfLang)) {
    return ".c";
  }
  if (langUpper.includes("RUST")) return ".rs";
  if (langUpper.includes("GO")) return ".go";
  if (langUpper.includes("KOTLIN")) return ".kt";
  if (langUpper.includes("TYPESCRIPT")) return ".ts";
  if (langUpper.includes("NODE.JS") || langUpper.includes("JAVASCRIPT")) return ".js";
  if (langUpper.includes("RUBY")) return ".rb";
  if (langUpper.includes("C#") || langUpper.includes("CSHARP")) return ".cs";
  if (langUpper.includes("PHP")) return ".php";
  if (langUpper.includes("HASKELL")) return ".hs";
  if (langUpper.includes("SCALA")) return ".scala";
  if (langUpper.includes("PASCAL") || langUpper.includes("DELPHI")) return ".pas";

  // Fallback: sort keys by length descending to match longest specific names first
  const sortedKeys = Object.keys(languageMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (cfLang.includes(key) || langUpper.includes(key.toUpperCase())) {
      return languageMap[key];
    }
  }

  return ".txt";
};
