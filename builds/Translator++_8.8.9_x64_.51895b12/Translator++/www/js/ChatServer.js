/**=====LICENSE STATEMENT START=====
    Translator++ 
    CAT (Computer-Assisted Translation) tools and framework to create quality
    translations and localizations efficiently.
        
    Copyright (C) 2018  Dreamsavior<dreamsavior@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
=====LICENSE STATEMENT END=====*/
const WebSocket = require('ws');

class ChatServer {
  constructor(port) {
    this.port = port;
    this.wss = new WebSocket.Server({ port });
    this.clients = {};

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws) {
    const id = this.generateID();
    this.clients[id] = ws;

    ws.on('message', (message) => {
      const [targetId, subject, msg] = JSON.parse(message);
      if (subject === 'reply') {
        // Broadcast the reply to all clients
        this.broadcast(message);
      } else {
        this.sendTo(targetId, 'message', `User ${id}: ${msg}`)
          .then((reply) => {
            console.log(reply);
          })
          .catch((error) => {
            console.error(error);
          });
      }
    });

    ws.on('close', () => {
      delete this.clients[id];
    });
  }

  broadcast(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  async sendTo(id, subject, message) {
    return new Promise((resolve, reject) => {
      const ws = this.clients[id];
      if (!ws) {
        reject(`User ${id} is not connected.`);
      } else {
        const msg = JSON.stringify([id, subject, message]);
        ws.send(msg);
        const timeout = setTimeout(() => {
          reject('Timeout: No reply received.');
        }, 5000); // 5 seconds timeout for reply
        ws.once('message', (reply) => {
          clearTimeout(timeout);
          resolve(reply);
        });
      }
    });
  }

  listParticipants() {
    return Object.keys(this.clients);
  }

  generateID() {
    return Math.random().toString(36).substr(2, 9);
  }
}

class ChatClient {
  constructor(serverUrl) {
    this.ws = new WebSocket(serverUrl);

    this.ws.on('open', () => {
      console.log('Connected to server');
    });

    this.ws.on('message', (message) => {
      console.log(message);
    });

    process.stdin.on('data', (data) => {
      this.sendMessage(data.toString().trim());
    });
  }

  sendMessage(message) {
    const [targetId, subject, msg] = message.split(' ');
    if (subject === '/list') {
      this.requestParticipants();
    } else {
      this.sendTo(targetId, subject, msg)
        .then((reply) => {
          console.log(reply);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  requestParticipants() {
    this.ws.send(JSON.stringify(['/list']));
  }

  async sendTo(id, subject, message) {
    return new Promise((resolve, reject) => {
      const msg = JSON.stringify([id, subject, message]);
      this.ws.send(msg);
      const timeout = setTimeout(() => {
        reject('Timeout: No reply received.');
      }, 5000); // 5 seconds timeout for reply
      this.ws.once('message', (reply) => {
        clearTimeout(timeout);
        resolve(reply);
      });
    });
  }
}

module.exports = { ChatServer, ChatClient };
