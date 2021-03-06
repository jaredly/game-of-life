log("main.js loaded");

var GAMEFIELD_WIDTH = 512;
var GAMEFIELD_HEIGHT = 512;
var TILE_WIDTH = 8;
var TILE_HEIGHT = 8;
var CELLS_X = GAMEFIELD_WIDTH / TILE_WIDTH;
var CELLS_Y = GAMEFIELD_HEIGHT / TILE_HEIGHT;
var FAST_SPEED = 1;
var SLOW_SPEED = 100;

var generation = 0;
var $generation = null;
var arena = buildArena();
var arena_init = null;
var context = null;
var redraw = null;
var playing = false;
var generations_until_beaten = 0;
var speed = SLOW_SPEED;
var drawstate = null;

var $play = null;
var $stop = null;
var $prev = null;
var $next = null;
var $fast = null;
var $slow = null;
var $title = null;
var $desc = null;
var $gamefield = null;
var $piece_count = null;

var current_level = 0; // zero based level system
var level_earned = 0;

var playable = {};

var goal = {};
var levels = [];

$(function() {
	$.getJSON('./levels.json', function(data) {
		levels = data;
		setupdom();
		loadLevel(current_level);
		init();
	});
});

function setupdom() {
	log("DOM Ready");

	$play = $('#button-play');
	$stop = $('#button-stop');
	$prev = $('#button-level-prev');
	$next = $('#button-level-next');
	$fast = $('#button-fast');
	$slow = $('#button-slow');

	$title = $('#title span');
	$desc = $('#description');
	$generation = $('#generation span');
	$piece_count = $('#piececount span');
	$gamefield = $('#gamefield');

	var gamefield = document.getElementById('gamefield');
	context = gamefield.getContext('2d');
}

function init() {
	log("Gamefield Cells: [" + CELLS_X + ", " + CELLS_Y + "]");

	countPlayedPieces();

	drawArena(); // First Draw

	$play.on('click', play);
	$stop.on('click', stop);
	$next.on('click', nextLevel);
	$prev.on('click', prevLevel);

	$fast.on('click', goFast);
	$slow.on('click', goSlow);

	$gamefield.on('mousedown', function (event) {
		var tile = eventPos(event);
		drawstate = !arena[tile.y][tile.x];
		setTile(tile, drawstate)
	});
	$gamefield.on('mousemove', function (event) {
		if (drawstate === null) return;
		setTile(eventPos(event), drawstate);
	});
	$gamefield.on('mouseup', function () {
		drawstate = null;
	});
}

function eventPos(event) {
	return {
		x: Math.floor((event.pageX - $gamefield.offset().left) / TILE_WIDTH),
		y: Math.floor((event.pageY - $gamefield.offset().top) / TILE_HEIGHT),
	};
}

function setTile(tile, state) {
	if (playing) {
		log("Cannot change the game while playing.");
	} else if (tile.x >= playable.x && tile.y >= playable.y && tile.x < playable.x + playable.width && tile.y < playable.y + playable.height) {
		if (state === undefined) state = !arena[tile.y][tile.x];
		arena[tile.y][tile.x] = state;
		log("Toggled [" + tile.x + ", " + tile.y + "].");
		countPlayedPieces();
	} else {
		log("Position [" + tile.x + ", " + tile.y + "] is outside of the playable (pink) zone.");
	}

	drawArena();
}

function goSlow() {
	setSpeed(SLOW_SPEED);
	$slow.attr('disabled', true);
	$fast.attr('disabled', false);
}

function goFast() {
	setSpeed(FAST_SPEED);
	$fast.attr('disabled', true);
	$slow.attr('disabled', false);
}

function setSpeed(number) {
	speed = number;
	if (playing) {
		clearTimeout(redraw);
		redraw = setInterval(animate, speed);
	}
}

function play() {
	$stop.attr('disabled', false);
	$play.attr('disabled', true);
	playing = true;

	arena_init = arena.slice(0); // Backup the initial arena state

	drawArena();
	redraw = setInterval(animate, speed);
}

function stop() {
	clearTimeout(redraw); 

	$play.attr('disabled', false);
	$stop.attr('disabled', true);

	generation = 0;
	$generation.html(generation);

	playing = false;
	generations_until_beaten = 0;

	arena = arena_init.slice(0); // Restore the initial arena state
	drawArena();
}

function nextLevel() {
	stop();

	$next.attr('disabled', true);
	//$prev.attr('disabled', false);

	current_level++;
	loadLevel(current_level);
}

function prevLevel() {
	alert("not yet implemented!");
}

function winLevel() {
	$('#gamefield-wrapper').addClass('won');
	$next.attr('disabled', false);
	//clearTimeout(redraw); 
	log("Game won in " + generation + " generations!");
	generations_until_beaten = generation;

	if (current_level == levels.length - 1) {
		alert("You've won the game!");
	} else if (current_level == level_earned) {
		level_earned++;
		console.log("beat most recent level. unlocking next level: " + level_earned);
	}
}

function loadLevel(level_id) {
	var level = levels[level_id];
	generation = 0;
	generations_until_beaten = 0;
	current_level = level_id;

	$title.text(level.title);
	$desc.text(level.description);
	goal = level.goal;
	playable = level.playable;

	arena = buildArena(); // Reset arena to nothing

	console.log(arena);
	// Build new arena
	for (var coord in level.arena) {
		arena[level.arena[coord][1]][level.arena[coord][0]] = true;
	}

	// Make this the initial state
	arena_init = arena.slice(0);

	drawArena();
	log("Loaded level #" + (level_id + 1));

	countPlayedPieces();

	$('#gamefield-wrapper').removeClass('won');
}

function countPlayedPieces() {
	var counter = 0;

	for (var y = playable.y; y < playable.y + playable.height; y++) {
		for (var x = playable.x; x < playable.x + playable.width; x++) {
			if (arena[y][x]) {
				counter++;
			}
		}
	}
	$piece_count.text(counter);

	return counter;
}

function buildArena() {
	var new_arena = [];

	for (var y = 0; y < CELLS_Y; y++) {
		new_arena[y] = [];
		for (var x = 0; x < CELLS_X; x++) {
			new_arena[y][x] = false;
		}
	}

	return new_arena;
}

function drawArena() {
	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			if (goal.x == x && goal.y == y) {
				context.fillStyle = "rgb(0,127,255)";
				if (arena[y][x] && !generations_until_beaten) {
					winLevel();
				}
			} else if (arena[y][x]) {
				context.fillStyle = "rgb(0,0,0)";
			} else {
				context.fillStyle = "rgb(255,255,255)";
			}
			context.fillRect(x * TILE_WIDTH, y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
		}
	}

	// Draw playable zone (if applicable)
	if (playable.width && playable.height) {
		context.fillStyle = "rgba(255,127,0, 0.3)";
		context.fillRect(
			playable.x * TILE_WIDTH,
			playable.y * TILE_HEIGHT,
			playable.width * TILE_WIDTH,
			playable.height * TILE_HEIGHT
		);
	}
}

function animate() {
	generation++;
	$generation.html(generation);

	var new_arena = buildArena();

	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			updateCellState(x, y, new_arena);
		}
	}

	arena = new_arena;
	drawArena();
}

function updateCellState(x, y, new_arena) {
	var cell_state = arena[y][x];
	var living_neighbors = 0;

	for (var mod_x = -1; mod_x <= 1; mod_x++) {
		for (var mod_y = -1; mod_y <= 1; mod_y++) {
			if (x + mod_x >= 0 && x + mod_x < CELLS_X && // Is this X coordinate outside of the array?
				y + mod_y >= 0 && y + mod_y < CELLS_Y && // Is this Y coordinate outside of the array?
				(!(mod_y == 0 && mod_x == 0)) && // Not looking at self but neighbor
				arena[y + mod_y][x + mod_x]) { // Is this cell alive?

			   living_neighbors++;
		   }
		}
	}

	if (cell_state) { // Cell is alive
		if (living_neighbors < 2) { // Under-Population
			new_arena[y][x] = false;
		} else if (living_neighbors > 3) { // Over-Crowding
			new_arena[y][x] = false;
		} else { // live on
			new_arena[y][x] = true;
		}
	} else { // Cell is dead
		if (living_neighbors == 3) { // Reproduction
			new_arena[y][x] = true;
		} else {
			new_arena[y][x] = false;
		}
	}
}

function log(msg) {
	$('#console').text(msg);
}
