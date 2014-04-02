
all: jsiq.y
	jison jsiq.y -m amd -o js/parser.js
