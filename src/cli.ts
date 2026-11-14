const [command] = process.argv.slice(2);

switch (command) {
  case "find":
    console.log("find: not implemented yet (Phase 2)");
    break;
  default:
    console.log("Usage: tsx src/cli.ts <find | policy <owner/repo> | refresh-contributions>");
    process.exitCode = command ? 1 : 0;
}
