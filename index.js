import * as core from "@actions/core";
import * as path from "path";

const runDoc = `
mutation RunSentinel($name: String!) {
  runSentinel(name: $name) {
    id
    status
    sentinel { id }
  }
}
`

const fetchDoc = `
query GetSentinelRun($id: ID!) {
  sentinelRun(id: $id) {
    id
    status
  }
}
`

async function main() {
    const url = core.getInput('url');
    const token = core.getInput('token');
    const sentinel = core.getInput('sentinel');
    const wait = core.getInput('wait') === 'true';

    const response = await fetch(path.join(url, 'gql'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
            query: runDoc, 
            variables: { name: sentinel } 
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        core.setFailed(`Failed to create pull request: ${response.status}\n${body}`);
        return;
    }

    const resp = await response.json();
    const run = resp.data?.runSentinel;

    if (!run) {
        core.setFailed(`Failed to run sentinel: ${JSON.stringify(resp.errors)}`);
        return;
    }
    core.info(`Ran sentinel: ${run.id}.  View the sentinel at ${path.join(url, "ai", 'sentinels', run.sentinel.id, "runs", run.id)}`);

    if (wait) {
        var maxDuration = 10 * 60 * 1000;
        var parsed = parseInt(core.getInput('waitDurationSeconds'))
        if (parsed) {
            if (parsed < 0) {
                core.setFailed(`waitDurationSeconds must be a positive number, got: ${parsed}`);
                return;
            }
            maxDuration = parsed * 1000;
        } else {
            core.info(`Using default wait duration of 10 minutes`);
        }

        await pollSentinelRun(token, url, run.id, Date.now(), maxDuration);
    }
}

async function pollSentinelRun(token, url, id, startTime, maxDuration=10 * 60 * 1000) {
    try {
        if (Date.now() - startTime > maxDuration) {
            core.setFailed(`Sentinel run ${id} timed out after ${maxDuration / 1000} seconds`);
            return;
        }

        core.info(`Polling sentinel run ${id}...`);

        const response = await fetch(path.join(url, 'gql'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ query: fetchDoc, variables: { id } }),
        });

        const resp = await response.json();
        const run = resp.data?.sentinelRun;

        if (!run) {
            core.setFailed(`Failed to fetch sentinel run: ${JSON.stringify(resp.errors)}`);
            return;
        }

        if (run.status === 'SUCCESS') {
            core.info(`Sentinel run ${id} finished successfully`);
            return;
        }

        if (run.status === 'FAILED') {
            core.setFailed(`Sentinel run ${id} failed`);
            return;
        }
    } catch (error) {
        core.info(`Failed to poll sentinel run: ${error}`);
    }

    setTimeout(() => pollSentinelRun(id, startTime, maxDuration), 2000); // poll every 2 seconds
}

main();