const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const Users = require('./mongoose/users');
const Dialogs = require('./mongoose/dialogs');
const Messages = require('./mongoose/messages');

const app = express();

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

app.get('/api/dialogs/:id', function(req, res){
  const {id} = req.params;
  Dialogs.find()
  .then(result => {
    const dialogs = result.filter(dialog => dialog.users.includes(id));
    res.status(200).send(dialogs);
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

app.get('/api/messages/:id', function(req, res){
  const {id} = req.params;
  Messages.find({currentDialog: id})
    .then(messages => {
      res.status(200).send(messages);
    })
    .catch(err => {
    res.status(404).send(err);
    })
})

app.get('/api/all-users', function(req, res){
  Users.find()
  .then(users => {
    const newUsers = users.map(user => ({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      img: user.img,
    }))
    res.status(200).send(newUsers);
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
        res.status(200).send({status: 'User with this email already exists.'});
      } else {
        const user = new Users ({
          ... data,
          _id: new mongoose.Types.ObjectId()
        });
        user.save()
          .then(() =>{
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
        res.status(200).send( result[0] );
      } else {
        res.status(200).send( {status: 'Invalid email or password.'} );
      }
    })
    .catch(err => {
      console.log('login:', err);
    });
});

app.post('/api/dialogs', function(req, res){
  const data = req.body;
  const dialog = new Dialogs ({
    _id: new mongoose.Types.ObjectId(),
    ...data
  });
  dialog.save()
    .then(() =>{
      res.status(200).send(dialog);
    })
    .catch(err => {console.log(err)});
  })

module.exports = app;