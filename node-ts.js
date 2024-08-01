const fs = require("fs");
const execSync = require("child_process").execSync;

initNode();
initTs();
createPacakageJson();
createSrcFiles();

function initNode() {
  if (!fs.existsSync("package.json")) {
    execSync("npm init -y");
  }
}

function initTs() {
  execSync("npm i typescript ts-node -D");

  fs.writeFileSync(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "es2015",
          module: "commonjs",
          moduleResolution: "node",
          sourceMap: true,
          outDir: "./build",
          strict: true,
          noImplicitAny: true,
          baseUrl: "./src",
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        lib: ["es2015"],
        include: ["src/**/*"],
        exclude: ["node_modules"],
      },
      null,
      2
    )
  );
}

function createPacakageJson() {
  const pkgJsn = fs.readFileSync("package.json", "utf-8");
  const pkg = JSON.parse(pkgJsn);
  pkg.scripts = {
    start: "ts-node src/index.ts",
    build: "tsc",
  };
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
}

function createSrcFiles() {
  if (!fs.existsSync("src")) {
    fs.mkdirSync("src");
  }
  if (!fs.existsSync("src/index.ts")) {
    fs.writeFileSync("src/index.ts", `console.log("Hello, World!");`);
  }
}
