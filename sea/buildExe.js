const fs = require("fs");
const path = require("path");
const createNodeSea = require("./node-sea.js");

build();

async function build() {
  const exeStream = await createNodeSea({
    fileName: "node-ts",
    fileContent: fs.readFileSync("node-ts.js", "utf-8"),
    //Local temp folder, remove if you want to use the default temp folder
    tempDir: path.join(process.cwd(), "temp"),
  });

  const outputPath = path.join(path.join(process.cwd()), "build/output.exe");

  exeStream && streamToFileSystem(exeStream, outputPath);
}

/**
 * @param {fs.ReadStream} stream
 * @param {string} outputPath
 * @returns {void}
 */
function streamToFileSystem(stream, outputPath) {
  const writeStream = fs.createWriteStream(outputPath);

  writeStream.on("finish", () => {
    console.log(
      `Executable file has been written successfully to ${outputPath}`
    );
  });

  writeStream.on("error", (err) => {
    console.error("An error occurred while writing the file:", err);
  });

  stream.pipe(writeStream);
}
