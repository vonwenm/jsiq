require.config({
	paths: {
		QUnit: 'qunit-1.14.0'
	},
	shim: {
		'QUnit': {
			exports: 'QUnit',
			init: function(){
				QUnit.config.autoload = false;
				QUnit.config.autostart = false;
			}
		}
	}
});

require(['QUnit', 'jsiq'], function(QUnit, jsiq)
{
	function check(expr, expected, msg)
	{
		deepEqual(expr, expected, msg);
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
		
		check(jsiq.parse('1 * ( 2 + 3 ) + 7 div 2 - (-8) mod 2'), 8.5, 'check mul add div');
		
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
		
		check(jsiq.parse('[({ "foo" : "bar1" }, [ "foo", "bar" ], { "foo" : "bar2" }).foo]'), ["bar1", "bar2"], 'sequence to array');
		
		check(jsiq.parse('{ "foo bar" : "bar" }."foo bar"'), "bar", 'quotes for object lookup');
		
		check(jsiq.parse('{ "foobar" : "bar" }.("foo" || "bar")'), "bar", 'object lookup with a nested expression');
		
		check(jsiq.parse('{ "1" : "bar" }.(1)'), "bar", 'object lookup with a nested expression');
		
		check(jsiq.parse('let $field := "foo" || "bar" return { "foobar" : "bar" }.$field'), "bar", 'object lookup with variable reference');
		
		check(jsiq.parse('[]'), [], 'array');
		
		check(jsiq.parse('[ 1, 2, 3, 4, 5, 6 ]'), [ 1, 2, 3, 4, 5, 6 ], 'array construction');
		
		check(jsiq.parse('[[1]]'), [[1]], 'nested array');
		
		check(jsiq.parse('[[1, 2]]'), [[1, 2]], 'nested array');
		
		check(jsiq.parse('[[1, 2], 1]'), [[1, 2], 1], 'nested array');
		
		check(jsiq.parse('[[]]'), [[]], 'empty nested array');
		
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
		
		check(jsiq.parse('for $x in (1, 2, 3, 4) where $x mod 2 eq 0 return $x'), [2, 4], 'where flowr');
		
		check(jsiq.parse('for $x in (1, 3, 2, null) order by $x return $x'), [null, 1, 2, 3], 'order by flowr');
		
		check(jsiq.parse('for $x in (1, 3, 2, null) order by $x descending empty least return $x'), [3, 2, 1, null], 'order by flowr');
		
		check(jsiq.parse('for $x in (1, 3, 2, null) order by $x ascending empty greatest return $x'), [1, 2, 3, null], 'order by flowr');
		
		check(jsiq.parse('for $x in ({order: 2, a: []}, {order: 1, a: [1, 2]}, {order: 1, a: []}) order by $x.order, $x.a.length return $x'),
			[{order: 1, a: []}, {order: 1, a: [1, 2]}, {order: 2, a: []}], 'double order by object flowr');
			
		check(jsiq.parse('for $x in ({order: 2, a: []}, {order: 1, a: [1, 2]}, {order: 1, a: []}) order by $x.order descending, $x.a.length return $x'),
			[{order: 2, a: []}, {order: 1, a: []}, {order: 1, a: [1, 2]}], 'double order by object flowr');
			
		check(jsiq.parse('for $x in ({val: 2}, {val: 1}, {val: 1}) group by $value := $x.val return {value: $value}'),
			[{value: 1}, {value: 2}], 'group by');
		
		check(jsiq.parse('for $x in ({val: 2}, {val: 1}, {val: 1}) group by $value := $x.val return {value: $value, count: count($x)}'),
			[{value: 1, count: 2}, {value: 2, count: 1}], 'group by using aggregated');
		
		check(jsiq.parse('for $x in ({val: 2, name: "john"}, {val: 1, name: "jim"}, {val: 1, name: "joe"}) group by $value := $x.val return {value: $value, names: [$x.name]}'),
			[{value: 1, names: ["jim", "joe"]}, {value: 2, names: ["john"]}], 'group by using aggregated props');
		
		check(jsiq.parse('for $x in ({val: 2}, {val: 1}, {val: 1}) group by $value := $x.val where count($x) gt 1 return {value: $value, count: count($x)}'),
			{value: 1, count: 2}, 'group by with constraint');
		
		check(jsiq.parse('(1 to 5) ! ($$ * 2)'), [2, 4, 6, 8, 10], 'simple map');
		
		
		var oneobj = [{foo: 'bar'}];
		jsiq.collection('one-object', oneobj);
		
		var captains = [
			{ "name" : "James T. Kirk", "series" : [ "The original series" ], "century" : 23 },
			{ "name" : "Jean-Luc Picard", "series" : [ "The next generation" ], "century" : 24 },
			{ "name" : "Benjamin Sisko", "series" : [ "The next generation", "Deep Space 9" ], "century" : 24 },
			{ "name" : "Kathryn Janeway", "series" : [ "The next generation", "Voyager" ], "century" : 24  },
			{ "name" : "Jonathan Archer", "series" : [ "Entreprise" ], "century" : 22 },
			{ "codename" : "Emergency Command Hologram", "surname" : "The Doctor", "series" : [ "Voyager" ], "century" : 24 },
			{ "name" : "Samantha Carter", "series" : [ ], "century" : 21 },
		];
		jsiq.collection('captains', captains);
		
		var movies = [
			{ "id" : "I", "name" : "The Motion Picture", "captain" : "James T. Kirk" },
			{ "id" : "II", "name" : "The Wrath of Kahn", "captain" : "James T. Kirk" },
			{ "id" : "III", "name" : "The Search for Spock", "captain" : "James T. Kirk" },
			{ "id" : "IV", "name" : "The Voyage Home", "captain" : "James T. Kirk" },
			{ "id" : "V", "name" : "The Final Frontier", "captain" : "James T. Kirk" },
			{ "id" : "VI", "name" : "The Undiscovered Country", "captain" : "James T. Kirk" },
			{ "id" : "VII", "name" : "Generations", "captain" : [ "James T. Kirk", "Jean-Luc Picard" ] },
			{ "id" : "VIII", "name" : "First Contact", "captain" : "Jean-Luc Picard" },
			{ "id" : "IX", "name" : "Insurrection", "captain" : "Jean-Luc Picard" },
			{ "id" : "X", "name" : "Nemesis", "captain" : "Jean-Luc Picard" },
			{ "id" : "XI", "name" : "Star Trek", "captain" : "Spock" },
			{ "id" : "XII", "name" : "Star Trek Into Darkness", "captain" : "Spock" },
		];
		jsiq.collection('movies', movies);
		
		check(jsiq.parse('collection("one-object")'), oneobj[0], 'one object collection');
		
		check(jsiq.parse('collection("one-object").foo'), 'bar', 'one object lookup');
		
		check(jsiq.parse('collection("captains").name'),
			["James T. Kirk", "Jean-Luc Picard", "Benjamin Sisko", "Kathryn Janeway", "Jonathan Archer", "Samantha Carter"], 'object lookup with iteration');

		check(jsiq.parse('collection("captains").series[#1#]'),
			["The original series", "The next generation", "The next generation", "The next generation", "Entreprise", "Voyager"], 'array lookup with iteration');
		
		check(jsiq.parse('for $x in collection("captains") return $x.name'),
			["James T. Kirk", "Jean-Luc Picard", "Benjamin Sisko", "Kathryn Janeway", "Jonathan Archer", "Samantha Carter"], 'simple for with collection');
		
		check(jsiq.parse('for $x in collection("captains"), $y in $x.series[] return { "captain" : $x.name, "series" : $y }'),
			[
				{ "captain" : "James T. Kirk", "series" : "The original series" },
				{ "captain" : "Jean-Luc Picard", "series" : "The next generation" },
				{ "captain" : "Benjamin Sisko", "series" : "The next generation" },
				{ "captain" : "Benjamin Sisko", "series" : "Deep Space 9" },
				{ "captain" : "Kathryn Janeway", "series" : "The next generation" },
				{ "captain" : "Kathryn Janeway", "series" : "Voyager" },
				{ "captain" : "Jonathan Archer", "series" : "Entreprise" },
				{ "captain" : null, "series" : "Voyager" }
			], 'for with two clauses and collection');
		
		check(jsiq.parse('for $x at $position in collection("captains") return { "captain" : $x.name, "id" : $position }'),
			[
				{ "captain" : "James T. Kirk", "id" : 1 },
				{ "captain" : "Jean-Luc Picard", "id" : 2 },
				{ "captain" : "Benjamin Sisko", "id" : 3 },
				{ "captain" : "Kathryn Janeway", "id" : 4 },
				{ "captain" : "Jonathan Archer", "id" : 5 },
				{ "captain" : null, "id" : 6 },
				{ "captain" : "Samantha Carter", "id" : 7 }
			], 'for with position and collection');
		
		check(jsiq.parse('for $captain in collection("captains"), $movie in collection("movies")[ $$.captain eq $captain.name ] return { "captain" : $captain.name, "movie" : $movie.name }'),
			[
				{ "captain" : "James T. Kirk", "movie" : "The Motion Picture" },
				{ "captain" : "James T. Kirk", "movie" : "The Wrath of Kahn" },
				{ "captain" : "James T. Kirk", "movie" : "The Search for Spock" },
				{ "captain" : "James T. Kirk", "movie" : "The Voyage Home" },
				{ "captain" : "James T. Kirk", "movie" : "The Final Frontier" },
				{ "captain" : "James T. Kirk", "movie" : "The Undiscovered Country" },
				{ "captain" : "Jean-Luc Picard", "movie" : "First Contact" },
				{ "captain" : "Jean-Luc Picard", "movie" : "Insurrection" },
				{ "captain" : "Jean-Luc Picard", "movie" : "Nemesis" }
			], 'join with collection');
		
		check(jsiq.parse('for $captain in collection("captains"), $movie allowing empty in collection("movies")[ $$.captain eq $captain.name ] return { "captain" : $captain.name, "movie" : $movie.name }'),
			[
				{ "captain" : "James T. Kirk", "movie" : "The Motion Picture" },
				{ "captain" : "James T. Kirk", "movie" : "The Wrath of Kahn" },
				{ "captain" : "James T. Kirk", "movie" : "The Search for Spock" },
				{ "captain" : "James T. Kirk", "movie" : "The Voyage Home" },
				{ "captain" : "James T. Kirk", "movie" : "The Final Frontier" },
				{ "captain" : "James T. Kirk", "movie" : "The Undiscovered Country" },
				{ "captain" : "Jean-Luc Picard", "movie" : "First Contact" },
				{ "captain" : "Jean-Luc Picard", "movie" : "Insurrection" },
				{ "captain" : "Jean-Luc Picard", "movie" : "Nemesis" },
				{ "captain" : "Benjamin Sisko", "movie" : null },
				{ "captain" : "Kathryn Janeway", "movie" : null },
				{ "captain" : "Jonathan Archer", "movie" : null },
				{ "captain" : null, "movie" : null },
				{ "captain" : "Samantha Carter", "movie" : null }
			], 'join with collection allowing empty');
		
		check(jsiq.parse('for $captain in collection("captains"), $movie in collection("movies") where $movie.captain eq $captain.name return { "captain" : $captain.name, "movie" : $movie.name }'),
			[
				{ "captain" : "James T. Kirk", "movie" : "The Motion Picture" },
				{ "captain" : "James T. Kirk", "movie" : "The Wrath of Kahn" },
				{ "captain" : "James T. Kirk", "movie" : "The Search for Spock" },
				{ "captain" : "James T. Kirk", "movie" : "The Voyage Home" },
				{ "captain" : "James T. Kirk", "movie" : "The Final Frontier" },
				{ "captain" : "James T. Kirk", "movie" : "The Undiscovered Country" },
				{ "captain" : "Jean-Luc Picard", "movie" : "First Contact" },
				{ "captain" : "Jean-Luc Picard", "movie" : "Insurrection" },
				{ "captain" : "Jean-Luc Picard", "movie" : "Nemesis" }
			], 'where join with collection');
		
		check(jsiq.parse('for $x in collection("captains") where $x.name eq "Kathryn Janeway" return $x.series'),
			[ "The next generation", "Voyager" ], 'where with collection');
		
		check(jsiq.parse('for $x in collection("captains") order by $x.name return $x'),
			[
				//there's an error in the standard example, The doctor is ordered by a null value, which is by default smaller
				//than anything else, the example puts it at the end. This would require an "empty greatest" clause.
				{ "codename" : "Emergency Command Hologram", "surname" : "The Doctor", "series" : [ "Voyager" ], "century" : 24 },
				{ "name" : "Benjamin Sisko", "series" : [ "The next generation", "Deep Space 9" ], "century" : 24 },
				{ "name" : "James T. Kirk", "series" : [ "The original series" ], "century" : 23 },
				{ "name" : "Jean-Luc Picard", "series" : [ "The next generation" ], "century" : 24 },
				{ "name" : "Jonathan Archer", "series" : [ "Entreprise" ], "century" : 22 },
				{ "name" : "Kathryn Janeway", "series" : [ "The next generation", "Voyager" ], "century" : 24 },
				{ "name" : "Samantha Carter", "series" : [ ], "century" : 21 }
			], 'order by with collection');

		check(jsiq.parse('for $x in collection("captains") order by $x.series.length, $x.name return $x'),
			[
				//there's an error in the standard example, The doctor is ordered by a null value, which is by default smaller
				//than anything else, the example puts it at the end. This would require an "empty greatest" clause.
				{ "name" : "Samantha Carter", "series" : [ ], "century" : 21 },
				{ "codename" : "Emergency Command Hologram", "surname" : "The Doctor", "series" : [ "Voyager" ], "century" : 24 },
				{ "name" : "James T. Kirk", "series" : [ "The original series" ], "century" : 23 },
				{ "name" : "Jean-Luc Picard", "series" : [ "The next generation" ], "century" : 24 },
				{ "name" : "Jonathan Archer", "series" : [ "Entreprise" ], "century" : 22 },
				{ "name" : "Benjamin Sisko", "series" : [ "The next generation", "Deep Space 9" ], "century" : 24 },
				{ "name" : "Kathryn Janeway", "series" : [ "The next generation", "Voyager" ], "century" : 24 }
			], 'order by multiple with collection');

		check(jsiq.parse('for $x in collection("captains") order by $x.name descending empty greatest return $x'),
			[
				{ "codename" : "Emergency Command Hologram", "surname" : "The Doctor", "series" : [ "Voyager" ], "century" : 24 },
				{ "name" : "Samantha Carter", "series" : [ ], "century" : 21 },
				{ "name" : "Kathryn Janeway", "series" : [ "The next generation", "Voyager" ], "century" : 24 },
				{ "name" : "Jonathan Archer", "series" : [ "Entreprise" ], "century" : 22 },
				{ "name" : "Jean-Luc Picard", "series" : [ "The next generation" ], "century" : 24 },
				{ "name" : "James T. Kirk", "series" : [ "The original series" ], "century" : 23 },
				{ "name" : "Benjamin Sisko", "series" : [ "The next generation", "Deep Space 9" ], "century" : 24 }
			], 'order by descending with collection');
		
		check(jsiq.parse('for $x in collection("captains") group by $century := $x.century return { "century" : $century  }'),
			[ { "century" : 21 }, { "century" : 22 }, { "century" : 23 }, { "century" : 24 } ], 'group by with collection');
		
		check(jsiq.parse('for $x in collection("captains") group by $century := $x.century return { "century" : $century, "count" : count($x) }'),
			[
				{ "century" : 21, "count" : 1 }, 
				{ "century" : 22, "count" : 1 },
				{ "century" : 23, "count" : 1 },
				{ "century" : 24, "count" : 4 }
			], 'group by count with collection');
		
		check(jsiq.parse('for $x in collection("captains") group by $century := $x.century return { "century" : $century, "captains" : [ $x.name ] }'),
			[
				{ "century" : 21, "captains" : [ "Samantha Carter" ] }, 
				{ "century" : 22, "captains" : [ "Jonathan Archer" ] }, 
				{ "century" : 23, "captains" : [ "James T. Kirk" ] }, 
				{ "century" : 24, "captains" : [ "Jean-Luc Picard", "Benjamin Sisko", "Kathryn Janeway" ] }
			], 'group by aggregate with collection');
		
		check(jsiq.parse('for $x in collection("captains") group by $century := $x.century where count($x) gt 1 return { "century" : $century, "count" : count($x) }'),
			{ "century" : 24, "count" : 4 }, 'group by condition with collection');
		
		check(jsiq.parse('for $x in collection("captains") let $century := $x.century group by $century let $number := count($x) where $number gt 1 return { "century" : $century, "count" : $number }'),
			{ "century" : 24, "count" : 4 }, 'group let where with collection');
	});
	
	// start QUnit.
	QUnit.load();
	QUnit.start();
});
