#!/bin/sh

# Start the Express server in the background
node server.js &

# Start the Vite dev server
npm run dev -- --host
