#!/usr/bin/env node

var clivas = require('clivas');
var input = require('./input');

var opt = function(a,b) {
	return process.argv.indexOf('--'+a) > -1 || process.argv.indexOf('-'+b) > -1;
};

var PIPING_IN  = !process.stdin.isTTY;
var PIPING_OUT = !process.stdout.isTTY;
var PIPING_IN_TO_OUT = opt('echo', 'e');

var CANVAS_WIDTH  = clivas.width ? clivas.width : 80;
var CANVAS_HEIGHT = clivas.height ? clivas.height - 1 : 30;

var lines = [];
var stack = [];
var shouldColor = false;
var chosenColor = 0;
var cursorX = 0;
var cursorY = 0;

var lastFlush = 0;
var palette = 'green blue white grey cyan magenta red yellow'.split(' ');

var draw = function() {
	if (Date.now() - lastFlush > 5000) {
		clivas.flush();
		lastFlush = Date.now();
	}
	clivas.clear();
	for (var i = 0; i < CANVAS_HEIGHT; i++) {
		lines[i] = lines[i] || Array(CANVAS_WIDTH+1).join(' x').split('x');

		if (cursorY === i && !PIPING_IN) {
			clivas.line(lines[i].slice(0,cursorX).join('')+'{inverse+'+palette[chosenColor]+':'+(shouldColor ? 'x' : 'o')+'}'+lines[i].slice(cursorX+1).join(''));
		} else {
			clivas.line(lines[i].join(''));
		}
	}
};

input.on('key', function(key) {
	if (key === 'up') {
		cursorY--;
	}
	if (key === 'down') {
		cursorY++;
	}
	if (key === 'left') {
		cursorX--;
	}
	if (key === 'right') {
		cursorX++;
	}

	cursorX = Math.min(Math.max(cursorX, 0), CANVAS_WIDTH-1);
	cursorY = Math.min(Math.max(cursorY, 0), CANVAS_HEIGHT-1);

	if (key === 'space') {
		chosenColor = (chosenColor+1) % palette.length;
	}
	if (key === 'undo') {
		shouldColor = false;
		var lastAction = stack.pop();
		if (lastAction) {
			lines[lastAction[0]][lastAction[1]] = lastAction[2];		
		}
	}
	if (key === 'enter') {
		shouldColor = !shouldColor;
	}
	if (shouldColor) {
		if (stack.length > 500) {
			stack.shift();
		}
		stack.push([cursorY,cursorX,lines[cursorY][cursorX]]);
		lines[cursorY][cursorX] = '{'+palette[chosenColor]+'+inverse: }';
	}

	draw();
});

if (opt('help', 'h')) {
	clivas.use(process.stderr);
	clivas.write(require('fs').readFileSync(require('path').join(__dirname,'logo')));
	clivas.line('{green:you are using} {bold:paint} {green:version} {bold:'+require('./package.json').version+'} {green:by} @{bold:mafintosh}\n');
	clivas.line('  {green:save drawing}   {bold:paint > myimage}');
	clivas.line('  {green:show drawing}   {bold:cat myimage}');
	clivas.line('  {green:save input}     {bold:paint --echo > myinput}');
	clivas.line('  {green:show animation} {bold:cat myinput | paint --delay}\n');
	clivas.line('  {cyan:arrows} to move brush');
	clivas.line('  {cyan:enter}  to lower/lift brush');
	clivas.line('  {cyan:space}  to change color');
	clivas.line('  {cyan:ctrl+z} to undo');
	clivas.line('  {cyan:ctrl+c} to exit (and save)\n');
	process.exit(0);
}

clivas.use(process.stderr).write('G1tIG1sySg==', 'base64');
clivas.flush(false);
clivas.cursor(false);

if (PIPING_OUT && !PIPING_IN_TO_OUT) {
	process.on('exit', function() {
		while (lines.length && !lines[lines.length-1].join('').trim()) {
			lines.pop();
		}
		for (var i = 0; i < lines.length; i++) {
			lines[i] = lines[i].join('').replace(/\s+$/g, '');
		}
		lines = lines.join('\n');
		palette.forEach(function(color) {
			var pattern = new RegExp('\\{'+color+'\\+inverse:([^\\}]+)\\}(\\n?)\\{'+color+'\\+inverse:([^\\}]+)\\}');
			while (pattern.test(lines)) {
				lines = lines.replace(pattern, function(_, a, newline, b) {
					return '{'+color+'+inverse:'+a+(newline || '')+b+'}';
				});
			}
		});
		clivas.use(process.stdout);
		clivas.clear();
		clivas.line(lines);
		process.stdout.write('\n');
	});
}
if (PIPING_OUT && PIPING_IN_TO_OUT) {
	input.on('data', function(data) {
		process.stdout.write(data);
	});
}
if (PIPING_IN) {
	clivas.flush(true);
}

draw();