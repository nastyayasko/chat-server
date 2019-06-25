const socket = require('socket.io');
const mongoose = require('mongoose');

const app = require('./src/app');
const Dialogs = require('./src/mongoose/dialogs');
const Messages = require('./src/mongoose/messages');

mongoose.connect('mongodb://localhost/chat', {useNewUrlParser: true})

const server = app.listen(3020, () => {
    console.log('listening on port 3020');
});

const io = socket(server);

let clientsOnline = [];

function getMessages(id, socket){
  Messages.find({currentDialog: id})
    .then(result => {
      socket.emit('messages', result)
    })
    .catch(err => {console.log(err)});
}

io.on('connection', (socket) => {
  socket.emit('connect');
  socket.on('user', user => {
    socket.email = user.email;
    socket._id = user._id;
  })
  
  socket.on('chat', (data) => {
    const message = new Messages ({
      _id: new mongoose.Types.ObjectId(),
      ...data,
    });
    message.save()
      .then(result =>{console.log(result)})
      .catch(err => {console.log(err)});
    clientsOnline.forEach(client => {
      client.emit('chat', message);
      client.emit('all-users');
    })
  })
 
  socket.on('connect-user', (id) => {
    let dialogID;
    Dialogs.find({type: 'individual'})
      .then(result => {
        const currentDialog = result.find(dialog => dialog.users.includes(socket._id) && dialog.users.includes(id));
        if (!currentDialog){
        const dialog = new Dialogs ({
            _id: new mongoose.Types.ObjectId(),
            type: 'individual',
            users: [socket._id, id]
          });
          dialog.save()
            .then()
            .catch(err => {console.log(err)});
            dialogID = dialog._id;
          socket.emit('current-dialog', dialog);
        }  else {
          dialogID = currentDialog._id;
          socket.emit('current-dialog', currentDialog);
        }
        getMessages(dialogID, socket);
      })
  })

  socket.on('new-group', (group) => {
    const dialog = new Dialogs ({
      _id: new mongoose.Types.ObjectId(),
      ...group
    });
    dialog.save()
      .then(() =>{
        clientsOnline.forEach(client => {
          if (group.users.includes(client._id)){
            client.emit('dialogs');
          }
        })
        socket.emit('current-dialog', dialog);
      })
      .catch(err => {console.log(err)});
  })

  socket.on('change-dialog', id => {
    Dialogs.find({_id: id})
      .then(result => {
        socket.emit('current-dialog', result[0]);
      })
      .catch(err => {console.log(err)})
      getMessages(id, socket);
  })

  clientsOnline.push(socket);

  socket.on('disconnect', () => {
    const newClients = clientsOnline.filter(client => client.id !== socket.id);
    clientsOnline = newClients;
  })
})