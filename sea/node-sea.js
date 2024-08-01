const os = require("os");
const { tmpdir } = os;
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const targets = {
  win: "win-x64",
  darwin: "darwin-x64",
  linux: "linux-x64",
};

/**
 *@typedef {Object} CreateNodeSeaParams
 *@property {string} fileName
 *@property {string} fileContent
 *@property {string} [tempDir]
 *@property {string} [targetSig]
 *@property {string} [binDir]
 */

/** @param {CreateNodeSeaParams} params */
function createNodeSea(params) {
  const { binDir, targetSig, ...rest } = params;

  const seaEx = sea({
    binDir: getTargetBinDir(binDir, targets[targetSig ?? "win"]),
    ...rest,
  });
  return seaEx.execute();
}

/**
 *@typedef {Object} NodeSeaParams
 *@property {string} fileName
 *@property {string} fileContent
 *@property {string} [tempDir]
 *@property {string} [targetSig]
 *@property {string} binDir
 */

/** @param {NodeSeaParams} params */
const sea = (params) => {
  const { fileName, fileContent, binDir, tempDir } = params;

  const uniqueFileName = `${getRandNumber(10000, 99999)}-${fileName}`;
  const blobName = "sea-prep.blob";
  const configName = "sea-config.json";

  const createdFiles = [];

  const pathParams = {
    fileName: uniqueFileName,
    configName,
    blobName,
    tempDir,
    binDir,
  };

  const paths = createFolderPaths(pathParams);

  const transcribeProgram = () => {
    console.log("Transcribing program");
    fs.writeFileSync(paths.jsFilePath, fileContent);
    createdFiles.push(paths.jsFilePath);
  };

  const generateConfig = () => {
    console.log("Generating config");

    const config = {
      main: paths.jsFilePath,
      output: paths.blobPath,
    };

    fs.writeFileSync(paths.configPath, JSON.stringify(config, null, 2));
    createdFiles.push(paths.configPath);
  };

  const generateSeaBlob = () => {
    console.log("Generating sea blob");
    execSync(`node --experimental-sea-config ${paths.configPath}`);
    createdFiles.push(paths.blobPath);
  };

  const generateExeFromNodeBinary = () => {
    console.log("Generating exe from node binary");
    const binaryLoc = paths.binDir ?? process.execPath;
    fs.copyFileSync(binaryLoc, paths.exePath);
    createdFiles.push(paths.exePath);
  };

  const injectBlob = async () => {
    console.log("Injecting blob");
    execSync(
      `npx postject ${paths.exePath} NODE_SEA_BLOB ${paths.blobPath} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`
    );
  };

  const createExe = async () => {
    try {
      transcribeProgram();
      generateConfig();
      generateSeaBlob();
      generateExeFromNodeBinary();
      await injectBlob();
      console.log();
      console.log("Executable created successfully");
      return true;
    } catch (e) {
      clearFolderAsync(paths.tmpDir, createdFiles);
      return false;
    }
  };

  const streamExe = () => {
    console.log("Starting exe stream");
    const stream = fs.createReadStream(paths.exePath);
    stream.on("end", () => {
      console.log("Stream ended");
      console.log("Cleaning up");      
      clearFolderAsync(paths.tmpDir, createdFiles);
    });
    stream.on("error", (err) => {
      clearFolderAsync(paths.tmpDir, createdFiles);
      throw new Error(err.message);
    });

    return stream;
  };

  const execute = async () => {
    const created = await createExe();
    if (created) return streamExe();
  };

  return {
    execute,
  };
};

/**
 * @param {string | undefined} binDir
 * @param {string} targetSig
 * @returns {string}
 */
const getTargetBinDir = (binDir, targetSig) => {
  // If no binDir is provided, use the current node binary
  if (binDir === undefined) return process.execPath;

  const files = fs.readdirSync(binDir);

  if (files.length === 0) {
    throw new Error("No prebuilt binaries found in the specified directory");
  }

  let platform;
  let arch;

  if (targetSig) {
    [platform, arch] = targetSig.split("-");
  } else {
    const { platform: p, arch: a } = getOsInfo();
    platform = p;
    arch = a;
  }

  const targetBinary = files.find((file) => {
    return file.includes(platform) && file.includes(arch);
  });

  if (targetBinary === undefined) {
    throw new Error(
      "No binary found for the current platform and architecture, " +
        "the expected format is <binDir>/node-{version}-{platform}-{arch}/node.exe"
    );
  }

  const targetBinPath = path.join(binDir, targetBinary);
  const target = path.join(targetBinPath, "node.exe");

  if (!fs.existsSync(target)) {
    throw new Error("No node.exe found in the target binary directory");
  }

  return target;
};

const osMap = new Map([
  ["win32", "win"],
  ["darwin", "darwin"],
  ["linux", "linux"],
  // Unimplemented os types
  // ["aix", "aix"],
  // ["freebsd", "freebsd"],
  // ["openbsd", "openbsd"],
  // ["sunos", "sunos"],
]);

const getOsInfo = () => {
  const platform = osMap.get(os.platform());
  const arch = os.arch();
  if (platform === undefined) {
    throw new Error("Unsupported OS");
  }

  return { platform, arch };
};

/**
 *@typedef {Object} FolderPathParams
 *@property {string} fileName
 *@property {string} configName
 *@property {string} blobName
 *@property {string} [tempDir]
 *@property {string} binDir
 */

/** @param {FolderPathParams} params */
const createFolderPaths = (params) => {
  const folderLoc = params.tempDir || tmpdir();
  return {
    jsFilePath: path.join(folderLoc, params.fileName + ".js"),
    configPath: path.join(folderLoc, params.configName),
    exePath: path.join(folderLoc, `${normalizeFileName(params.fileName)}.exe`),
    blobPath: path.join(folderLoc, params.blobName),
    tmpDir: folderLoc,
    binDir: params.binDir,
  };
};

const getRandNumber = (num1 = 0, num2 = 1) => {
  const min = Math.min(num1, num2);
  const max = Math.max(num1, num2);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/** @param {string} fileName  */
const normalizeFileName = (fileName) => fileName.split(".")[0];

/** @param {string} dir @param {string[]} filesToDelete */
const clearFolderAsync = (dir, filesToDelete) => {
  /** @param {string} path */
  const deleteIfExists = (path) => {
    fs.existsSync(path) && fs.unlinkSync(path);
  };

  fs.readdir(dir, (err, files) => {
    if (err) {
      throw new Error(err.message);
    }
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      if (filesToDelete.includes(filePath)) {
        deleteIfExists(filePath);
      }
    });
  });
};

module.exports = createNodeSea;
