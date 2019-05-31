const express = require('express');
const socket = require('socket.io');

const app = express();
const server = app.listen(3020, () => {
    console.log('listening on port 3020');
});

app.use(express.static('public'));

let clients = [];
let messages = [];
let emails = [];
let rooms = {};

const io = socket(server);

io.on('connection', (socket) => {
  socket.emit('connect');
  socket.on('email', (email) => {
    socket.email = email;
    if (!emails.includes(email)) {emails.push(email);};
    clients.forEach(client => {
      client.emit('people-online', emails); 
    })
  })

  socket.on('chat', (message) => {
    messages.push(message);
    if (rooms[socket.email]) {
      clients.forEach(client => {
        if (client.email === socket.email || client.email === rooms[socket.email]) {
          client.emit('chat', message);
        }
      })
    } else {
      clients.forEach(client => {
        client.emit('chat', message); 
      })
    }
  })
 
  socket.on('connect-user', (user) => {
    console.log(user);
    if (!socket.status) {
      socket.emit('status', `You are in private chat with '${rooms[socket.email]}' now!`); 
      return;
    }
    const person = clients.find(client => client.status && client.email === user);
    if (!person){ return socket.emit('status',`'${user}' is busy!`)};
    person.status = !person.status;
    socket.status = !socket.status;
    rooms[socket.email] = user;
    rooms[user] = socket.email;
    person.emit('status',`You are invited to private chat with '${socket.email}'!`);
    socket.emit('status',`You can start chat with '${user}'.`);
  })

  socket.on('global', () => {
    const connect = rooms[socket.email];
    rooms[socket.email] = null;
    rooms[connect] = null;
  })
 
  socket.status = true;

  clients.push(socket);

  socket.on('disconnect', () => {
    const newEmails = emails.filter(email => email !== socket.email);
    const newClients = clients.filter(client => client.email !== socket.email);
    clients = newClients;
    emails = newEmails;
    clients.forEach(client => {
      client.emit('people-online', emails); 
    })
    const connect = rooms[socket.email];
    rooms[socket.email] = null;
    rooms[connect] = null;
  // const block = blackList[socket.email];
  // blackList[socket.email] = null;
  // blackList[block] = null;
  })
  
})