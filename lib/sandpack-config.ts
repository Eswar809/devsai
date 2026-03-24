
export function getSandpackConfig(
  files: Array<{ path: string; content: string }>,
) {
  // ✅ FIX: Path resolution consistent ga undadaniki leading slashes remove chestunnam
  const sandpackFiles: Record<string, string> = {};

  // Add tsconfig
  sandpackFiles["tsconfig.json"] = `{
    "include": [
      "./**/*"
    ],
    "compilerOptions": {
      "strict": true,
      "esModuleInterop": true,
      "lib": [ "dom", "es2015" ],
      "jsx": "react-jsx",
      "baseUrl": "./",
      "paths": {
        "@/components/*": ["components/*"],
        "@/lib/*": ["lib/*"],
        "@/utils/*": ["utils/*"],
        "@/types/*": ["types/*"]
      }
    }
  }`;

  // Add user files
  for (const file of files) {
    let normalizedPath = file.path.startsWith("/") ? file.path.slice(1) : file.path;
    if (normalizedPath.startsWith("src/")) {
      normalizedPath = normalizedPath.slice(4);
    }
    sandpackFiles[normalizedPath] = file.content;
  }

  // Ensure App.tsx exists
  if (!sandpackFiles["App.tsx"] && files.length > 0) {
    const mainFile = files.find((f) => f.path.endsWith(".tsx") || f.path.endsWith(".jsx")) || files[0];
    let importPath = mainFile.path.replace(/^(\/|src\/)/, "").replace(/\.tsx?$/, "");
    
    // Prefix with ./ for proper local resolution
    if (!importPath.startsWith("./")) importPath = "./" + importPath;

    sandpackFiles["App.tsx"] = `import React from 'react';
import MainComponent from '${importPath}';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <MainComponent />
    </div>
  );
}`;
  }

  return {
    template: "vite-react-ts" as const,
    files: sandpackFiles,
    options: {
      externalResources: [
        "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
      ],
    },
    customSetup: {
      dependencies,
    },
  };
}
/*
const cssContent = `
@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui;
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.75rem;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * { @apply border-border; }
  body { 
    @apply bg-background text-foreground antialiased font-sans;
  }
}
`;*/


const dependencies = {
  "lucide-react": "latest",
  recharts: "2.9.0",
  "react-router-dom": "latest",
  "tailwind-merge": "^2.4.0",
  "tailwindcss-animate": "^1.0.7",
  "framer-motion": "^11.15.0",
  "date-fns": "^3.6.0",
  "react-day-picker": "^8.10.1",
  "react-beautiful-dnd": "latest",
  "@hello-pangea/dnd": "latest",
  "@dnd-kit/core": "latest",
  "@dnd-kit/sortable": "latest",
  "@dnd-kit/utilities": "latest",
};

