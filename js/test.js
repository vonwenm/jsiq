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
		
		check(jsiq.parse('let $field := "foo" || "bar" return { "foobar" : "bar" }.$field'), "bar", 'object lookup with variable reference');
		
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
		
		check(jsiq.parse('if (1 + 1 eq 2) then { "foo" : "yes" } else { "foo" : "no" }'), { "foo" : "yes" }, 'if condition boolexpr');
		
		check(jsiq.parse('if (null) then { "foo" : "yes" } else { "foo" : "no" }'), { "foo" : "no" }, 'if condition null');
		
		check(jsiq.parse('if (1) then { "foo" : "yes" } else { "foo" : "no" }'), { "foo" : "yes" }, 'if condition 1');
		
		check(jsiq.parse('if (0) then { "foo" : "yes" } else { "foo" : "no" }'), { "foo" : "no" }, 'if condition 0');
		
		check(jsiq.parse('if ("foo") then { "foo" : "yes" } else { "foo" : "no" }'), { "foo" : "yes" }, 'if condition string');
		
		check(jsiq.parse('if ("") then { "foo" : "yes" } else { "foo" : "no" }'), { "foo" : "no" }, 'if condition empty string');
		
		check(jsiq.parse('if (()) then { "foo" : "yes" } else { "foo" : "no" }'), { "foo" : "no" }, 'if condition empty sequence');
		
		check(jsiq.parse('if (({ "foo" : "bar" }, [ 1, 2, 3, 4])) then { "foo" : "yes" } else { "foo" : "no" }'), { "foo" : "yes" }, 'if condition sequence');
		
		check(jsiq.parse('if (1+1 eq 2) then { "foo" : "yes" } else ()'), { "foo" : "yes" }, 'if condition no else');
		
		check(jsiq.parse('switch ("foo") case "bar" return "foo" case "foo" return "bar" default return "none"'), "bar", 'switch case');
		
		check(jsiq.parse('switch ("no-match") case "bar" return "foo" case "foo" return "bar" default return "none"'), "none", 'switch case default');
		
		check(jsiq.parse('switch (2) case 1 + 1 return "foo" case 2 + 2 return "bar" default return "none"'), "foo", 'switch case expression');
		
		check(jsiq.parse('switch (true) case 1 + 1 eq 2 return "1 + 1 is 2" case 2 + 2 eq 5 return "2 + 2 is 5" default return "none of the above is true"'), "1 + 1 is 2", 'switch case expression math');
		
		check(jsiq.parse('let $x := 1 return $x'), 1, 'let flowr');
		
		check(jsiq.parse('for $x in (1, 2, 3) return $x'), [1, 2, 3], 'for flowr');
		
		check(jsiq.parse('for $x in (1, 2, 3) for $y in ( 1, 2, 3 ) return 10 * $x + $y'), [11, 12, 13, 21, 22, 23, 31, 32, 33], 'for for flowr');
		
		check(jsiq.parse('for $x in (1, 2, 3), $y in ( 1, 2, 3 ) return 10 * $x + $y'), [11, 12, 13, 21, 22, 23, 31, 32, 33], 'double for flowr');
		
		check(jsiq.parse('for $x in ( [ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8, 9 ] ), $y in $x[] return $y'), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'dependent for flowr');
		
		check(jsiq.parse('for $x in ({"name":["john", "doe"]}, {"name":["bob", "mcgee"]}), $y in $x.name[] return $y'), ["john", "doe", "bob", "mcgee"], 'dependent for object lookup flowr');
		
		check(jsiq.parse('for $x at $i in ("one", "two") return {"i": $i, "name": $x}'), [{i:1, name: "one"}, {i:2, name:"two"}], 'for position flowr');
		
		check(jsiq.parse('for $x in ("one", "two"), $y allowing empty in () return {"x": $x, "y": $y.name}'), [{x:"one", y:null}, {x:"two", y:null}], 'for empty flowr');
	});
	
	// start QUnit.
	QUnit.load();
	QUnit.start();
});
