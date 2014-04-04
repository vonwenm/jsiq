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
	function check(expr, expected, msg)
	{
		deepEqual(expr.eval().value(), expected, msg);
	}
	
	test('basic', function()
	{
		check(jsiq.parse("true"), true, 'check bool');
		
		check(jsiq.parse('"hello world"'), "hello world", 'check string');
		
		check(jsiq.parse('1 to 5'), [1, 2, 3, 4, 5], 'check range');
		
		check(jsiq.parse('1 + 5'), 6, 'check addition');
		
		check(jsiq.parse('2 * 3 + 5'), 11, 'check mul add');
		
		check(jsiq.parse('true, true'), [true, true], 'check multi value');
		
		check(jsiq.parse('1 * ( 2 + 3 ) + 7 / 2 - (-8) mod 2'), 8.5, 'check mul add');
		
		check(jsiq.parse('1 + 1 eq 2 or 1 + 1 eq 3, 1 + 1 eq 2, 1 lt 2'), [true, true, true], 'check comparison');
		
		check(jsiq.parse('1 eq null, "foo" ne null, null eq null'), [false, true, true], 'check comparison');
		
		check(jsiq.parse('true and ( true or not true )'), true, 'check logic');
		
		check(jsiq.parse('1 + 1 eq 2 or 1 + 1 eq 3'), true, 'logics and comparing operands');
		
		check(jsiq.parse('boolean(()), boolean(3), boolean(null), boolean("foo"), boolean("")'), [false, true, false, true, false], 'boolean conversion');
		
		check(jsiq.parse('0 and true, not (not 1e42)'), [false, true], 'boolean conversion');
		
		check(jsiq.parse('{ "foo" : "bar" } or false'), true, 'object to boolean');
		
		check(jsiq.parse('{ "foo" : "bar" }.foo'), "bar", 'object lookup');
		
		check(jsiq.parse('({ "foo" : "bar" }, { "foo" : "bar2" }, { "bar" : "foo" }).foo'), ["bar", "bar2"], 'sequence object lookup');
		
		check(jsiq.parse('({ "foo" : "bar1" }, [ "foo", "bar" ], { "foo" : "bar2" }, "foo").foo'), ["bar1", "bar2"], 'sequence mixed object lookup');
		
		check(jsiq.parse('{ "foo bar" : "bar" }."foo bar"'), "bar", 'quotes for object lookup');
		
		check(jsiq.parse('{ "foobar" : "bar" }.("foo" || "bar")'), "bar", 'object lookup with a nested expression');
		
		check(jsiq.parse('{ "1" : "bar" }.(1)'), "bar", 'object lookup with a nested expression');
		
		check(jsiq.parse('[]'), [], 'array');
		
		check(jsiq.parse('[ 1, 2, 3, 4, 5, 6 ]'), [ 1, 2, 3, 4, 5, 6 ], 'array construction');
		
		check(jsiq.parse('[[1]]'), [[1]], 'nested array');
		
		check(jsiq.parse('[0, [1]], [[0], 1]'), [[0, [1]], [[0], 1]], 'non-empty nested array');
		
		check(jsiq.parse('[ "foo", 3.14, [ "Go", "Boldly", "Where", "No", "Man", "Has", "Gone", "Before" ], { "foo" : "bar" }, true, false, null ]'),
			[ "foo", 3.14, [ "Go", "Boldly", "Where", "No", "Man", "Has", "Gone", "Before" ], { "foo" : "bar" }, true, false, null ], 'nested array construction');
			
		check(jsiq.parse('[ "foo", "bar" ][#2#]'), "bar", 'basic array indexing');
		
		check(jsiq.parse('([ 1, 2, 3 ], [ 4, 5, 6 ])[#2#]'), [2, 5], 'multi array indexing');
		
		check(jsiq.parse('([ 1, 2, 3 ], [ 4, 5, 6 ], { "foo" : "bar" }, true)[#3#]'), [3, 6], 'multi array mixed indexing');
		
		check(jsiq.parse('[ "foo", "bar" ] [# 1 + 1 #]'), "bar", 'multi array expression indexing');
		
		check(jsiq.parse('[ "foo", "bar" ][]'), ["foo", "bar"], 'array unboxing');
		
		check(jsiq.parse('([ "foo", "bar" ], { "foo" : "bar" }, true, [ 1, 2, 3 ] )[]'), ["foo", "bar", 1, 2, 3], 'multi mixed array unboxing');
		
		check(jsiq.parse('(1 to 10)[2]'), 2, 'sequence predicate indexing');
		
		check(jsiq.parse('(1 to 10)[$$ mod 2 eq 0]'), [2, 4, 6, 8, 10], 'sequence predicate context indexing');
	});
	
	// start QUnit.
	QUnit.load();
	QUnit.start();
});
