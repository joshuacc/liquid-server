#!/usr/bin/env node

const express = require('express');
const { Liquid } = require('liquidjs');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 1337;

// Get directory from command line argument or use current directory
const directoryToServe = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();


// Configure Liquid
const engine = new Liquid({
    root: directoryToServe,
    extname: '.liquid'
});

// Register custom parse_json filter
engine.registerFilter('parse_json', (jsonString) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return {};
    }
});

// Middleware for logging requests
app.use((req, res, next) => {
    console.log('--------------------------');
    console.log(`Request Method: ${req.method}`);
    console.log(`Request Path: ${req.path}`);
    console.log(`Query Parameters: ${JSON.stringify(req.query, null, 2)}`);
    next();
});

// Handle JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to log body for specific methods
app.use((req, res, next) => {
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (contentType === 'application/json') {
            console.log(`Body (JSON): ${JSON.stringify(req.body, null, 2)}`);
        } else if (contentType === 'application/x-www-form-urlencoded') {
            console.log(`Body (Form URL-Encoded): ${JSON.stringify(req.body, null, 2)}`);
        }
    }
    next();
});

// Middleware to process .liquid files and index.liquid as default
app.use((req, res, next) => {
    let filePath = path.join(directoryToServe, req.path);

    // Append 'index.liquid' if the path is a directory
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.liquid');
    } else {
        filePath = `${filePath}.liquid`; // Append .liquid for file requests
    }

    if (fs.existsSync(filePath)) {
        engine.renderFile(filePath, {})
            .then(html => res.send(html))
            .catch(err => {
                res.status(500).send('Error processing Liquid template');
            });
    } else {
        next();
    }
});

// Middleware to prevent serving .liquid files directly
app.use((req, res, next) => {
    if (req.path.endsWith('.liquid')) {
        res.status(404).send('Not Found');
    } else {
        next();
    }
});

// Serve static files
app.use(express.static(directoryToServe));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Serving content from ${directoryToServe}`);
});