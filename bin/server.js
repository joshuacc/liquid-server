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
