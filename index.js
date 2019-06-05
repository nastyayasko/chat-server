const express = require('express');
const socket = require('socket.io');

const app = express();
const server = app.listen(3020, () => {
    console.log('listening on port 3020');
});

app.use(express.static('public'));

let clients = [];
let emails = [];
let rooms = {};
let blackList = {};

const dialogs = [
  {
    type: 'global',
    users: [],
    messages: [],
  }
]

const io = socket(server);

io.on('connection', (socket) => {
  socket.emit('connect');

  

  socket.on('email', (email) => {
    socket.email = email;
    if (!emails.includes(email)) {emails.push(email);};
    clients.forEach(client => {
      client.emit('people-online', emails); 
    });
    dialogs[0].users = emails;
    const myDialogs = dialogs.filter(dialog => dialog.users.includes(socket.email));
    socket.emit('dialogs', myDialogs);
  })

  socket.on('chat', (message) => {
    console.log(message);
    const {currentDialog} = message;

    const current = dialogs.find(dialog => dialog.type === currentDialog);
    
    if (current) {
      current.messages.push(message);
      clients.forEach(client => {
        if (current.users.includes(client.email)) {
          if (blackList[socket.email] && blackList[socket.email].includes(client.email)){ return };
          if (blackList[client.email] && blackList[client.email].includes(socket.email)){ return };
          client.emit('chat', message);
        }
      })
    } else {
      
      console.log(currentDialog);
      console.log(socket.email);
      const individual = dialogs.find(dialog => dialog.type === 'individual' && dialog.users.includes(currentDialog) && dialog.users.includes(socket.email));
    
      individual.messages.push(message);
      clients.forEach(client => {
        if (individual.users.includes(client.email)) {
          if (blackList[socket.email] && blackList[socket.email].includes(client.email)){ return };
          if (blackList[client.email] && blackList[client.email].includes(socket.email)){ return };
          client.emit('chat', message);
        }
      })
    }
  })
 
  socket.on('connect-user', (user) => {
    
    if (blackList[socket.email] && blackList[socket.email].includes(user)){
      socket.emit('status', `You blocked '${user}'.`); 
      return;
    }
    if (blackList[user] && blackList[user].includes(socket.email)){
      socket.emit('status', `You can't chat with '${user}'. You are blocked.`); 
      return;
    }
    
    const currentDialog = dialogs.find(dialog => dialog.type === 'individual' && dialog.users.includes(socket.email) && dialog.users.includes(user));

    if (currentDialog) {
      socket.emit('current-dialog', currentDialog);
      socket.emit('messages', currentDialog.messages);
      return;
    }
    const dialog = {
      type: 'individual',
      users: [socket.email, user],
      messages: []
    }
    dialogs.push(dialog);
    socket.emit('current-dialog', dialog);
    socket.emit('messages', null);
    const myDialogs = dialogs.filter(dialog => dialog.users.includes(socket.email));
    socket.emit('dialogs', myDialogs);
    const person = clients.find(client => client.email === user);
    const personDialogs = dialogs.filter(dialog => dialog.users.includes(user));
    person.emit('dialogs', personDialogs);

  })
  socket.on('change-dialog', dialog => {
    const current = dialogs.find(i => i.type === dialog);
    if (current) {
      socket.emit('messages', current.messages);
      socket.emit('current-dialog', current);
      return;
    }
    const currentDialog = dialogs.find(i => i.type === 'individual' && i.users.includes(socket.email) && i.users.includes(dialog));
    socket.emit('messages', currentDialog.messages);
    socket.emit('current-dialog', currentDialog);
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
    dialogs[0].users = emails;
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