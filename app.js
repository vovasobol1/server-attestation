var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var attestationRouter = require('./routes/attestation');
var uploadRoutes = require('./routes/upload');

var app = express();

const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

app.use('/attestation', attestationRouter);
app.use('/upload', uploadRoutes);

const downloadRoutes = require('./routes/download');
app.use('/', downloadRoutes);

const authRoutes = require('./routes/auth');
app.use('/', authRoutes);



module.exports = app;
