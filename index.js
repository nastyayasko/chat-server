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
let blackList = {};

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
        if (blackList[socket.email] && blackList[socket.email].includes(client.email)){ return };
        if (blackList[client.email] && blackList[client.email].includes(socket.email)){ return };
        if (client.status) {
          client.emit('chat', message); 
        }
      })
    }
  })
 
  socket.on('connect-user', (user) => {
    if (!socket.status) {
      socket.emit('status', `You are in private chat with '${rooms[socket.email]}' now!`); 
      return;
    }
    if (blackList[socket.email] && blackList[socket.email].includes(user)){
      socket.emit('status', `You blocked '${user}'.`); 
      return;
    }
    if (blackList[user] && blackList[user].includes(socket.email)){
      socket.emit('status', `You can't chat with '${user}'. You are blocked.`); 
      return;
    }
    const person = clients.find(client => client.status && client.email === user);
    if (!person){ return socket.emit('status',`'${user}' is busy!`)};
    person.status = false;
    socket.status = false;
    rooms[socket.email] = user;
    rooms[user] = socket.email;
    person.emit('status',`You are invited to private chat with '${socket.email}'!`);
    socket.emit('status',`You can start chat with '${user}'.`);
    person.emit('clear');
    socket.emit('clear');
  })

  socket.on('block-user', (user) => {
    if (!blackList[socket.email]) {blackList[socket.email]=[]};
    if (blackList[socket.email].includes(user)) return;
    blackList[socket.email].push(user);
    socket.emit('black-list', blackList[socket.email]);
    socket.emit('people-online', emails);
    if (rooms[socket.email] === user){
      const connect = rooms[socket.email];
      rooms[socket.email] = null;
      rooms[connect] = null;
      const person = clients.find(client => client.email === connect);
      person.status = true; 
      socket.status = true;
      person.emit('status', `You are in Global Chat!`);
      person.emit('clear');
      socket.emit('status', `You are in Global Chat!`);
      socket.emit('clear');
    }
  })

  socket.on('restore-user', (user) => {
    const newList = blackList[socket.email].filter(i => i !== user);
    blackList[socket.email] = newList;
    socket.emit('black-list', blackList[socket.email]);
    socket.emit('people-online', emails);
  })

  socket.on('global', () => {
    const connect = rooms[socket.email];
    rooms[socket.email] = null;
    rooms[connect] = null;
    const person = clients.find(client => client.email === connect);
    if(person) {
      person.status = true;
      person.emit('status', `You are in Global Chat!`);
      person.emit('clear');
    }
    socket.status = true;
    socket.emit('status', `You are in Global Chat!`);
    socket.emit('clear');
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
    const person = clients.find(client => client.email === connect);
    if (person) {person.status = true};
  // const block = blackList[socket.email];
  // blackList[socket.email] = null;
  // blackList[block] = null;
  })
  
})