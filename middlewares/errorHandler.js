const path = require("path");
const rawChalk = require("chalk");
const chalk = rawChalk?.default || rawChalk;

const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();

  console.log(
    "---------------------------------------------------------------------------------------",
  );
  console.error(`[${timestamp}] Message:`, err.message);

  if (err?.statusCode && err?.statusCode > 0) {
    return res
      .status(err.statusCode)
      .json({ status: false, message: err.message });
  } else {
    const stackArray = err?.stack?.split("\n");
    const releventStack = stackArray && stackArray[1]?.trim();
    const fileInfo = releventStack?.match(/\((.*?):(\d+):(\d+)\)/);
    const fullPath = fileInfo ? fileInfo[1] : "unknown file";
    const fileName = path.basename(fullPath);
    const lineNumber =
      fileInfo && fileInfo.length ? fileInfo[2] : "unknown line";

    if (fileName !== "unknown file") {
      console.error(
        chalk.red(
          `[${timestamp}] ====== >>>>>> ERROR LINE ===== CTRL + CLICK ===== >> : `,
        ),
        chalk.red.bold(`${fileName}:${lineNumber}`),
      );
    }

    console.error(`[${timestamp}] Stack trace`, err.stack);
    console.error(`[${timestamp}] Request details:`);
    console.error(`[${timestamp}] Method:`, req.method);
    console.error(`[${timestamp}] URL:`, req.originalUrl);
    console.error(`[${timestamp}] Req Body:`, req.body);
    console.error(`[${timestamp}] Req Params:`, req.params);
    console.error(`[${timestamp}] Req Query:`, req.query);
    console.error(`[${timestamp}] Req Headers:`, req.headers);

    if (
      err.message &&
      (err.message.startsWith("File size exceeds") ||
        err.message.startsWith("File too large"))
    ) {
      return res.status(400).json({ status: false, message: err.message });
    }

    console.log(
      "---------------------------------------------------------------------------------------",
    );
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong" });
  }
};

module.exports = errorHandler;
