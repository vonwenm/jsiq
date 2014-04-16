parser: jsiq.y
	jison jsiq.y -m amd -o js/jsiqparser.js
	@echo done building parser

release: all js/jsiq.js
	node r.js -o baseUrl=js name=jsiq out=jsiq.js
	@echo done release build

all: parser
