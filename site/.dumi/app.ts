import { type Project } from '@stackblitz/sdk';
import { IFiles } from 'codesandbox-import-utils/lib/api/define';

export function modifyStackBlitzData(memo: Project, props: any) {
  // if use default template: 'create-react-app', demo won't install dependencies automatically
  memo.template = 'node';
  return createTemplate(memo, props, true);
}

export function modifyCodeSandboxData(memo: { files: IFiles }, props: any) {
  return createTemplate(memo, props, false);
}

function createTemplate(memo: { files: IFiles } | Project, props: any, isStackBlitz: boolean) { 
  Object.entries(memo.files).forEach(([name, content]) => {
    if (name === 'sandbox.config.json') {
      memo.files[name] = {
        content: JSON.stringify({
          template: 'node',
          startScript: 'dev',
        }, null, 2),
        isBinary: false,
      };
      return;
    }
    if (name !== 'index.html' && name !== 'package.json') {
      if (isStackBlitz && name === 'App.tsx') {
        content = `import '@libmedia/cheap/cheapdef'\n` + content;
      }
      memo.files[`src/${name}`] = content;
    }
    delete memo.files[name];
  });
  Object.entries(template).forEach(([name, content]) => {
    if (name === 'package.json') {
      const packageJson = JSON.parse(content);
      const npmDeps = Object.entries(props.asset.dependencies || {})
        // @ts-ignore
        .filter(([key, value]) => value.type === 'NPM')
        .reduce((acc: { [key: string]: any }, [key, value]) => {
          // @ts-ignore
          acc[key] = value.value;
          return acc;
        }, {});
      packageJson.dependencies = { ...npmDeps, ...packageJson.dependencies };
      content = JSON.stringify(packageJson, null, 2);
    }
    memo.files[name] = isStackBlitz ? content : { content: content, isBinary: false };
  });

  return memo;
}

const template = {
  'tsconfig.json': `
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "declaration": false,
    "jsx": "react-jsx",

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": "./",
    "paths": {
      "@libmedia/common/*": ["node_modules/@libmedia/common/dist/esm/*"],
      "@libmedia/cheap/*": ["node_modules/@libmedia/cheap/dist/esm/*"],
      "@libmedia/avcodec/*": ["node_modules/@libmedia/avcodec/dist/esm/*"],
      "@libmedia/avformat/*": ["node_modules/@libmedia/avformat/dist/esm/*"],
      "@libmedia/avnetwork/*": ["node_modules/@libmedia/avnetwork/dist/esm/*"],
      "@libmedia/avplayer/*": ["node_modules/@libmedia/avplayer/dist/esm/*"],
      "@libmedia/avprotocol/*": ["node_modules/@libmedia/avprotocol/dist/esm/*"],
      "@libmedia/avrender/*": ["node_modules/@libmedia/avrender/dist/esm/*"],
      "@libmedia/audiostretchpitch/*": ["node_modules/@libmedia/audiostretchpitch/dist/esm/*"],
      "@libmedia/audioresample/*": ["node_modules/@libmedia/audioresample/dist/esm/*"],
      "@libmedia/avpipeline/*": ["node_modules/@libmedia/avpipeline/dist/esm/*"],
      "@libmedia/avtranscode/*": ["node_modules/@libmedia/avtranscode/dist/esm/*"],
      "@libmedia/avutil/*": ["node_modules/@libmedia/avutil/dist/esm/*"],
      "@libmedia/videoscale/*": ["node_modules/@libmedia/videoscale/dist/esm/*"],
      "@libmedia/avfilter/*": ["node_modules/@libmedia/avfilter/dist/esm/*"]
    },
    "types": [
      "node"
    ]
  },
  "include": ["src"],
  "files": [
    "node_modules/@libmedia/cheap/dist/esm/cheapdef.d.ts"
  ],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`,
  'tsconfig.node.json': `
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
`,
  'vite.config.ts': `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import typescript from '@rollup/plugin-typescript';
import transformer from '@libmedia/cheap/build/transformer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        outDir: 'dist/'
      },
      transformers: {
        before: [
          {
            type: 'program',
            factory: (program) => {
              return transformer.before(program);
            }
          }
        ]
      }
    }),
  ],
});
`,
  'index.html': `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
    <link rel="stylesheet" href="./src/index.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
`,
  'package.json': `
{
  "name": "demo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.7.6",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "@rollup/plugin-typescript": "^12.1.1",
    "typescript": "^5.6.3",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.1",
    "vite": "^6.0.1",
    "tslib": "^2.8.1"
  }
}
`,
  'tailwind.config.js': `
module.exports = {
  theme: {},
  variants: {},
  plugins: [],
  content: [
    './src/**/*.tsx',
  ],
}`,
  'src/index.css': `
  @tailwind components;
  @tailwind utilities;
`,
  'postcss.config.js': `
export default {
  plugins: {
    tailwindcss: {},
  },
};`
}
