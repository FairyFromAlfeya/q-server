# ton-q-server
TON GraphQL Server.

This component is a part of TON-Server and must not be accessed directly but through TON Labs Client Libraries.

# Prerequisites

Node.js

# Install

Clone this repository and run
```bash
npm install
```

# Setup
 
 If you want to run q-server in development mode you can set EVN:
 ```bash
 EXPORT Q_MODE="development"
 ```
 You can set options with env variables:
 ```bash
EXPORT Q_DATABASE_SERVER="arangodb:8529"
EXPORT Q_DATABASE_NAME="blockchain"
EXPORT Q_SERVER_HOST="<local IP address used by default>"
EXPORT Q_SERVER_PORT=4000
```
 
# Run

```bash
node index.js
```

# Connectivity

Q-Server is accessible with GraphQL HTTP/WebSocket protocol on port "4000" and path "/graphql".

There is the only valid way to communicate with Q-Server – TON Labs Client Libraries.