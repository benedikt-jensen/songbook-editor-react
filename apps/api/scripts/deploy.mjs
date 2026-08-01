// Deploys the api to the IONOS VPS: SSH in, pull the latest commit, rebuild,
// restart the pm2 process, then poll /health to confirm it actually came
// back up before declaring success. The server keeps its own git checkout
// (not a copy pushed from here), so this only works once your commit is
// actually on the remote the server tracks - push first, deploy second.
//
// The remote script is piped over stdin to `ssh ... bash -s` rather than
// passed as a `ssh host "<command>"` string, so we never have to reconcile
// POSIX shell quoting (the remote script's own $(...) etc.) with whatever
// quoting rules the *local* shell uses to invoke ssh - which differ on
// Windows (cmd.exe) vs POSIX and would otherwise be a constant source of
// "works on my machine" breakage for a script three people might run from
// three different shells.
import { execFileSync } from 'node:child_process';

const HOST = 'root@217.154.71.76';
const REMOTE_PATH = '~/source/songbook-editor-react';
const PM2_PROCESS = 'pdf-server';
const HEALTH_URL = 'http://127.0.0.1:3001/health';

const remoteScript = `
set -euo pipefail
cd ${REMOTE_PATH}

PRE_SHA=$(git rev-parse HEAD)
echo "Pre-deploy commit: $PRE_SHA"
echo "  (rollback: git reset --hard $PRE_SHA && pm2 restart ${PM2_PROCESS})"

git pull
npm install
npm run api:build --workspace=apps/web
pm2 restart ${PM2_PROCESS}

echo "Waiting for the api to respond on ${HEALTH_URL}..."
for i in $(seq 1 10); do
    if curl -sf ${HEALTH_URL} > /dev/null; then
        echo "Health check passed - deploy successful."
        exit 0
    fi
    sleep 1
done

echo "Health check FAILED - the api did not come back up after restart."
echo "Roll back with: git reset --hard $PRE_SHA && pm2 restart ${PM2_PROCESS}"
exit 1
`;

console.log(`Deploying api to ${HOST}...`);
execFileSync('ssh', [HOST, 'bash', '-s'], { input: remoteScript, stdio: ['pipe', 'inherit', 'inherit'] });
console.log('Done.');
