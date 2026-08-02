{
  "message": "[builder 3/3] RUN npx prisma generate && npm run build",
  "timestamp": "2026-08-02T12:03:08.713358897Z",
  "severity": "error",
  "children": [
    {
      "message": "Prisma schema loaded from prisma/schema.prisma\n",
      "timestamp": "2026-08-02T12:03:39.998735363Z"
    },
    {
      "message": "\n✔ Generated Prisma Client (v6.16.3) to ./node_modules/@prisma/client in 233ms\n\nStart by importing your Prisma Client (See: https://pris.ly/d/importing-client)\n\nTip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate\n\n",
      "timestamp": "2026-08-02T12:03:40.720056473Z"
    },
    {
      "message": "npm notice\nnpm notice New major version of npm available! 10.8.2 -> 12.0.2\nnpm notice Changelog: https://github.com/npm/cli/releases/tag/v12.0.2\nnpm notice To update run: npm install -g npm@12.0.2\nnpm notice\n",
      "timestamp": "2026-08-02T12:03:40.741144653Z"
    },
    {
      "message": "\n> pake-mail@0.1.0 build\n> next build\n\n",
      "timestamp": "2026-08-02T12:03:40.906148518Z"
    },
    {
      "message": "▲ Next.js 16.2.12 (Turbopack)\n",
      "timestamp": "2026-08-02T12:03:41.415530479Z"
    },
    {
      "message": "",
      "timestamp": "2026-08-02T12:03:41.41611079Z"
    },
    {
      "message": "  Creating an optimized production build ...\n",
      "timestamp": "2026-08-02T12:03:41.451671598Z"
    },
    {
      "message": "✓ Compiled successfully in 15.4s\n",
      "timestamp": "2026-08-02T12:03:57.177061799Z"
    },
    {
      "message": "  Running TypeScript ...\n",
      "timestamp": "2026-08-02T12:03:57.198815208Z"
    },
    {
      "message": "  Finished TypeScript in 20.6s ...\n",
      "timestamp": "2026-08-02T12:04:17.751723623Z"
    },
    {
      "message": "  Collecting page data using 31 workers ...\n",
      "timestamp": "2026-08-02T12:04:17.754887563Z"
    },
    {
      "message": "(node:355) Warning: NodeVersionSupportWarning: The AWS SDK for JavaScript (v3)\nversions published after the first week of January 2027\nwill require node >=22. You are running node v20.20.2.\n\nTo continue receiving updates to AWS services, bug fixes,\nand security updates please upgrade to node >=22.\n\nMore information can be found at: https://a.co/c895JFp\n(Use `node --trace-warnings ...` to show where the warning was created)\n",
      "timestamp": "2026-08-02T12:04:20.40828026Z"
    },
    {
      "message": "[ioredis] Unhandled error event: AggregateError: \n    at internalConnectMultiple (node:net:1122:18)\n    at afterConnectMultiple (node:net:1689:7)\n",
      "timestamp": "2026-08-02T12:04:20.434013544Z"
    },
    {
      "message": "(node:369) Warning: NodeVersionSupportWarning: The AWS SDK for JavaScript (v3)\nversions published after the first week of January 2027\nwill require node >=22. You are running node v20.20.2.\n\nTo continue receiving updates to AWS services, bug fixes,\nand security updates please upgrade to node >=22.\n\nMore information can be found at: https://a.co/c895JFp\n(Use `node --trace-warnings ...` to show where the warning was created)\n",
      "timestamp": "2026-08-02T12:04:20.487914547Z"
    },
    {
      "message": "[ioredis] Unhandled error event: AggregateError: \n    at internalConnectMultiple (node:net:1122:18)\n    at afterConnectMultiple (node:net:1689:7)\n",
      "timestamp": "2026-08-02T12:04:20.492821524Z"
    },
    {
      "message": "[ioredis] Unhandled error event: AggregateError: \n    at internalConnectMultiple (node:net:1122:18)\n    at afterConnectMultiple (node:net:1689:7)\n",
      "timestamp": "2026-08-02T12:04:20.595824486Z"
    },
    {
      "message": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received undefined\n    at module evaluation (.next/server/chunks/[root-of-the-server]__1dkti46._.js:1:70)\n    at instantiateModule (.next/server/chunks/[turbopack]_runtime.js:853:9)\n    at getOrInstantiateModuleFromParent (.next/server/chunks/[turbopack]_runtime.js:877:12)\n    at Context.esmImport [as i] (.next/server/chunks/[turbopack]_runtime.js:281:20)\n    at <unknown> (.next/server/chunks/[root-of-the-server]__1rromwy._.js:1:2731)\n    at Context.asyncModule [as a] (.next/server/chunks/[turbopack]_runtime.js:525:5)\n    at module evaluation (.next/server/chunks/[root-of-the-server]__1rromwy._.js:1:2678)\n    at instantiateModule (.next/server/chunks/[turbopack]_runtime.js:853:9)\n    at getOrInstantiateModuleFromParent (.next/server/chunks/[turbopack]_runtime.js:877:12) {\n  code: 'ERR_INVALID_ARG_TYPE'\n}\n",
      "timestamp": "2026-08-02T12:04:20.741023887Z"
    },
    {
      "message": "\n> Build error occurred\n",
      "timestamp": "2026-08-02T12:04:20.759576812Z"
    },
    {
      "message": "Error: Failed to collect page data for /api/email-accounts/callback\n    at ignore-listed frames {\n  type: 'Error'\n}\n",
      "timestamp": "2026-08-02T12:04:20.778160492Z"
    }
  ]
}