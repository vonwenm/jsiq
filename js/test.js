require.config({
    paths: {
        jquery: 'jquery-1.11.0',
        d3: 'd3/d3',
        knockout: 'knockout-3.0.0',
        QUnit: 'qunit-1.14.0'
    },
    shim: {
        'knockout': {
            exports: 'ko'
        },
        'lodash': {
            exports: '_'
        },
        'bootstrap': {
			deps: ['jquery']
        },
        'd3': {
			exports: 'd3'
		},
		'QUnit': {
			exports: 'QUnit',
			init: function(){
				QUnit.config.autoload = false;
				QUnit.config.autostart = false;
			}
		}
    }
});

require(['jquery', 'lodash', 'QUnit', 'jsiq'], function($, _, QUnit, jsiq)
{
	test('basic', function()
	{
		var res = jsiq.parse("true");
		equal(res.value() === true, true, 'check bool');
		res = jsiq.parse('"hello world"');
		equal(res.value() === "hello world", true, 'check string');
		res = jsiq.parse('1 to 5');
		deepEqual(res.value(), [1, 2, 3, 4, 5], 'check range');
		res = jsiq.parse('1 + 5');
		deepEqual(res.value(), 6, 'check addition');
		res = jsiq.parse('2 * 3 + 5');
		deepEqual(res.value(), 11, 'check mul add');
	});
	
	// start QUnit.
	QUnit.load();
	QUnit.start();
});
