import express from 'express';
import { Server } from 'socket.io';
const PORT = process.env.PORT || 3000;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
})

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5500', 'http://127.0.0.1:5500']
    }
})

io.on('connection', socket => {
    console.log(`user ${socket.id} connected`);

    // Only connected user get
    socket.emit('message', 'Welcome to chat app!');

    // All user get
    socket.broadcast.emit('message', `user ${socket.id.substring(0, 5)} connected`);

    // Listing for a message event
    socket.on('message', data => {
        console.log(data);
        io.emit('message', `${socket.id.substring(0, 5)}: ${data}`);
    });

    // When user disconnects
    socket.on('disconnect', () => {
        console.log('disconnect', `user ${socket.id.substring(0, 5)} disconnected`)
        socket.broadcast.emit('message', `user ${socket.id.substring(0, 5)} disconnected`);
    });

    // Listing for activity
    socket.on('activity', (name) => {
        socket.broadcast.emit('activity', name)
    })
});