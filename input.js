var EventEmitter = require('events').EventEmitter;

if (process.stdin.setRawMode) {
	process.stdin.setRawMode(true);
}

var DELAY = process.argv.indexOf('--delay') > -1 || process.argv.indexOf('-d') > -1;

var ENTER_1 = '\r';
var ENTER_2 = '\n';
var UP      = '\u001b[A';
var DOWN    = '\u001b[B';
var RIGHT   = '\u001b[C';
var LEFT    = '\u001b[D';
var SPACE   = ' ';
var UNDO    = '\u001a';

var that = new EventEmitter();
var buf = '';

var timeout;
var stack = [];
var consume = function() {
	clearTimeout(timeout);
	if (!stack.length) return;
	that.emit('key', stack.shift());
	timeout = setTimeout(consume, 50);
};

var read = function(data, key) {
	if (buf.slice(0, data.length) !== data) return false;
	buf = buf.slice(data.length);
	if (!DELAY) {
		that.emit('key', key);	
	} else {
		stack.push(key);
		clearTimeout(timeout);
		timeout = setTimeout(consume, 50);
	}
	return true;
};

process.stdin.on('data', function(data) {
	if (data.toString() === '\u0003') return process.exit(0);

	that.emit('data', data);
	buf += data.toString();

	while (
		read(ENTER_1, 'enter') || 
		read(ENTER_2, 'enter') ||
		read(UP, 'up')         || 
		read(DOWN, 'down')     || 
		read(RIGHT, 'right')   || 
		read(LEFT, 'left')     || 
		read(SPACE, 'space')   || 
		read(UNDO, 'undo')
	);
});

process.stdin.resume();
module.exports = that;