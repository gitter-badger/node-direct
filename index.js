#!/usr/bin/env node
const express = require('express');
const pathExists = require('path-exists');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const {
    port = 8123,
    ext = '.srv.js',
    root = process.cwd(),
    standalone
} = require('minimist')(process.argv.slice(2));

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
    let filePath;

    if (standalone) {
        const potentialIndexFile = `./${path.join(req.path.substring(1), `index${ext}`)}`;
        if (req.path.endsWith(ext)) {
            filePath = `./${req.path}`;
        } else if (pathExists.sync(potentialIndexFile)) {
            filePath = potentialIndexFile;
        } else {
            return next();
        }
    } else {
        filePath = req.get('X-Requested-File-Path');
    }

    if (!filePath) {
        return res.status(500).send('Server did not provide file path via X-Requested-File-Path header');
    }

    if (!pathExists.sync(filePath)) {
        return res.status(404).send('Cannot find such file on the server');
    }

    try {
        require(filePath)(req, res); // eslint-disable-line global-require
    } catch (e) {
        return res.status(500).send(`<pre>${e.stack}</pre>`);
    }

    const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
            delete require.cache[require.resolve(filePath)];
            watcher.close();
        }
    });

    return undefined;
});

if (standalone) {
    app.use(express.static(root));
}

app.listen(port, () => {
    console.log(`node-direct listening on port ${port}!`);
});
