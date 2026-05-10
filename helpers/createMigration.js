const { exec } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter migration name: ", (migrationName) => {
  if (!migrationName) {
    console.error("Migration name is required!");
    rl.close();
    return;
  }

  exec(
    `npx sequelize-cli migration:generate --name ${migrationName}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating migration: ${error.message}`);
        rl.close();
        return;
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }

      rl.close();
    },
  );
});
