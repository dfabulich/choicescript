const childProcess = require('child_process');
const fs = require('fs');

var artifact_dir = "./public";

if (typeof process != "undefined") {
    build();
}

/*---------------------------- Wrapper functions -----------------------------*/
function makeDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        return true;
    }
    return false;
}

function deleteDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function existsDir(dir) {
    return fs.existsSync(dir);
}
/*----------------------------------------------------------------------------*/

function build() {
    // Check if the artifact directory exists.
    if (existsDir(artifact_dir)) {
        console.log(`"${artifact_dir}" directory already exists... deleting and recreating.`);
        deleteDir(artifact_dir);
    }

    makeDir(artifact_dir);

    // Copy files to artifacts dir
    fs.cpSync("./web/", artifact_dir, { recursive: true });

    // Remove all index.html's
    // fs.unlinkSync(`${artifact_dir}/index.html`);
    fs.unlinkSync(`${artifact_dir}/mygame/index.html`);

    childProcess.execSync(`node compile.js ${artifact_dir}/mygame/index.html`);
}
