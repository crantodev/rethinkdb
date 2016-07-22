require('babel-register');
const app = require('express')();
const bodyParser = require('body-parser');
const rdb = require('rethinkdb');

// Create web server
const server = app.listen(3000, () => {
  console.log('The app listening on port 3000!');
});

// Open socket
const io = require('socket.io')(server);

// Configure body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// On connect and disconect events
io.on('connection', (socket) => {
  console.log('a user has been connected');
  // socket.emit('new_record', {name: name});

  socket.on('disconnect', () => {
    console.log('a user has been disconnected');
  });
});

// Open DB connection
var connection = null;
rdb.connect({ host: '127.0.0.1', port: 28015 }, (err, conn) => {
  if (err) throw err;
  connection = conn;

  // Listen for changes in DB
  rdb.table('messages').changes().run(connection, (err, cursor) => {
    if (err) throw err;

    cursor.each( (error, row) => {
      if (error) throw error;
      io.emit('new_record', row.new_val);
    });
  });
});

// Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create new record in DB
app.post('/create', (request, response) => {
  let body = request.body;
  if (typeof body.title === 'undefined' || typeof body.content === 'undefined') {
    response.json({error: 'Name is undefined'});
  } else {
    rdb.db('test').table('messages').insert({
      title: body.title,
      contet: body.content
    }).run(connection, (error, res) => {
      if (error) throw err;
      response.json(res);
    });
  }
});

// Show all items in the list
app.get('/list', (request, response) => {
  rdb.table('messages').run(connection, (err, cursor) => {
    if (err) throw err;

    cursor.toArray( (error, result) => {
      if (error) throw error;
      response.json(result);
    });
  });
});