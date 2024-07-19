const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');  // Import CORS middleware

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Apply CORS middleware to express app
app.use(cors());

// Store connected clients and their data
const clients = new Map();

// Function to send a message to all clients
function broadcast(message, excludeClient) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeClient) {
      client.send(message);
    }
  });
}

// Function to broadcast user data to all clients
function broadcastUserData() {
  const onlineUsers = Array.from(clients.values()).filter(user => user.status === "online");
  const onlineUsersJSON = JSON.stringify(onlineUsers);
  broadcast(onlineUsersJSON);
}

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send all user data to the new client, excluding the new client's data
  const userDataArray = Array.from(clients.values());
  const userDataJSON = JSON.stringify(userDataArray.filter(user => user !== clients.get(ws)));
  if (userDataArray.length > 0) {
    ws.send(userDataJSON);
  }

  // Handle new user data sent by the client
  ws.on('message', (data) => {
    console.log(Buffer.from(data).toString('utf-8'));
    try {
      const userData = JSON.parse(data);

      // Check if the user is already in the array
      const userExists = Array.from(clients.values()).some(user => user.id === userData.id);

      if (!userExists) {
        clients.set(ws, userData);

        if (userData.status === "online") {
          // Notify all clients that someone has connected
          broadcast('A new client has connected.', ws);

          // Broadcast user data to all clients
          broadcastUserData();
        } else {
          broadcast(Buffer.from(data).toString('utf-8'), ws);
        }
      }
    } catch (error) {
      // If data is other...
      broadcast(Buffer.from(data).toString('utf-8'), ws);
      console.error('Invalid user data received from the client:', error);
    }
    broadcast(Buffer.from(data).toString('utf-8'), ws);
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');

    // Remove the user data of the disconnected client
    clients.delete(ws);

    // Notify all clients that someone has disconnected
    broadcast('A client has disconnected.');

    // Broadcast user data to all clients
    broadcastUserData();
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running.');
});

server.listen(3000, () => {
  console.log('WebSocket server is listening on port 3000');
});
