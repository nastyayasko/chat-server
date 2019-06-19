const express = require('express');
const socket = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const Users = require('./mongoose/users');
const Dialogs = require('./mongoose/dialogs');
const Messages = require('./mongoose/messages');

const app = express();
const server = app.listen(3020, () => {
    console.log('listening on port 3020');
});

const io = socket(server);

mongoose.connect('mongodb://localhost/chat', {useNewUrlParser: true})

let clientsOnline = [];
let emails = [];

let currentUser;


app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({extended:true}) );
app.use(express.static('public'));
app.use( cors() );


app.get('/api/users', function(req, res){
  Users.find()
  .then(users => {
    res.status(200).send(users);
  })
  .catch(err => {
    res.status(404).send(err);
  })
})

app.get('/api/dialogs', function(req, res){
  Dialogs.find()
  .then(users => {
    res.status(200).send(users);
  })
  .catch(err => {
    res.status(404).send(err);
  })
})

app.get('/api/messages', function(req, res){
  Messages.find()
  .then(messages => {
    res.status(200).send(messages);
  })
  .catch(err => {
    res.status(404).send(err);
  })
})



app.post('/api/auth', function(req, res){
  const data = req.body;
  Users.find({email: data.email})
    .then(result => {
      if (result.length > 0){
        Users.updateOne({email: data.email}, data)
          .then(() => {
            Users.find({email: data.email})
            .then(result => {
              currentUser = result[0];
              res.status(200).send(result[0]);
            })
          })
          .catch(err => {
            console.log('update:', err);
          });
      } else {
        const user = new Users ({
              ... data,
              _id: new mongoose.Types.ObjectId()
            });
        user.save()
          .then(res => {
            currentUser = user;
            res.status(200).send(user);
          })
          .catch(err => {console.log('save:', err)});
      }
    })
    .catch(err => {
      console.log('find:', err);
    });
});

app.post('/api/sign-up', function (req, res){
  const data = req.body;
  Users.find({email: data.email})
    .then(result => {
      if (result.length > 0){
        res.status(200).send({client: true});
      } else {
        const user = new Users ({
          ... data,
          _id: new mongoose.Types.ObjectId()
        });
        user.save()
          .then(() =>{
            currentUser = user;
            res.status(200).send( user );
          })
          .catch(err => {console.log(err)});
      }
    })
    .catch(err => {console.log(err)});
});

app.post('/api/log-in', function (req, res){
  const data = req.body;
  Users.find({email: data.email, password: data.password})
    .then(result => {
      if (result.length > 0) {
        currentUser = result[0];
        res.status(200).send( result[0] );
      } else {
        res.status(200).send( {new: true} );
      }
    })
    .catch(err => {
      console.log('login:', err);
    });
});

function showDialogs(id, socket){
  Dialogs.find()
    .then(result => {
      const dialogsList = result.filter(dialog => dialog.type !== 'individual' && dialog.users.includes(id));
      socket.emit('dialogs', dialogsList)
    })
}

function getMessages(id, socket){
  Messages.find({currentDialog: id})
    .then(result => {
      socket.emit('messages', result)
    })
}

io.on('connection', (socket) => {
  socket.emit('connect');
  socket.email = currentUser.email;
  socket.id = currentUser._id;
  showDialogs(socket.id, socket);

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
    })
  })
 
  socket.on('connect-user', (id) => {
    let dialogID;
    Dialogs.find({type: 'individual'})
      .then(result => {
        const currentDialog = result.find(dialog => dialog.users.includes(socket.id) && dialog.users.includes(id));
        if (!currentDialog){
        const dialog = new Dialogs ({
            _id: new mongoose.Types.ObjectId(),
            type: 'individual',
            users: [socket.id, id]
          });
          dialog.save()
            .then(result =>{console.log(result)})
            .catch(err => {console.log(err)});
            dialogID = dialog._id;
          socket.emit('current-dialog', dialog);
        }  else {
          dialogID = currentDialog._id;
          socket.emit('current-dialog', currentDialog);
        }
        getMessages(dialogID, socket);
        // отправляем сообщения с ID этого диалога
      })
  })

  socket.on('new-group', (group) => {
    const dialog = new Dialogs ({
      _id: new mongoose.Types.ObjectId(),
      ... group
    });
    dialog.save()
      .then(() =>{
        clientsOnline.forEach(client => {
          if (group.includes(client.id)){
            group.users.forEach(user => {
              showDialogs(user, client);
            })
          }
        })
      })
      .catch(err => {console.log(err)});
    socket.emit('current-dialog', dialog);
  })

  socket.on('change-dialog', id => {
    Dialogs.find({_id: id})
      .then(result => {
        socket.emit('current-dialog', result[0]);
      })
      getMessages(id, socket);
    //отправить сообщения
  })

  clientsOnline.push(socket);

  socket.on('disconnect', () => {
    const newEmails = emails.filter(email => email !== socket.email);
    const newClients = clientsOnline.filter(client => client.email !== socket.email);
    clientsOnline = newClients;
    emails = newEmails;
    // console.log('off');
  })
  
  // console.log('done');
  // console.log(clientsOnline.length);
})