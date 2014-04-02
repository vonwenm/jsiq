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
	function check(sequence, expected, msg)
	{
		deepEqual(sequence.value(), expected, msg);
	}
	
	test('basic', function()
	{
		check(jsiq.parse("true"), true, 'check bool');
		
		check(jsiq.parse('"hello world"'), "hello world", 'check string');
		
		check(jsiq.parse('1 to 5'), [1, 2, 3, 4, 5], 'check range');
		
		check(jsiq.parse('1 + 5'), 6, 'check addition');
		
		check(jsiq.parse('2 * 3 + 5'), 11, 'check mul add');
		
		check(jsiq.parse('true, true'), [true, true], 'check multi value');
		
		check(jsiq.parse('1 * ( 2 + 3 ) + 7 / 2 + 8 mod 2'), 8.5, 'check mul add');
		
		check(jsiq.parse('1 + 1 eq 2, 1 lt 2'), [true, true], 'check comparison');
		
		check(jsiq.parse('"foo" ne null, null eq null'), [true, true], 'check comparison');
		
		check(jsiq.parse('true and ( true or not true )'), true, 'check logic');
		
		check(jsiq.parse('1 + 1 eq 2 or 1 + 1 eq 3'), true, 'logics and comparing operands');
		
		check(jsiq.parse('boolean(()), boolean(3), boolean(null), boolean("foo"), boolean("")'), [false, true, false, true, false], 'boolean conversion');
		
		check(jsiq.parse('0 and true, not (not 1e42)'), [false, true], 'boolean conversion');
		
		check(jsiq.parse('{ "foo" : "bar" } or false'), true, 'object to boolean');
	});
	
	// start QUnit.
	QUnit.load();
	QUnit.start();
});
